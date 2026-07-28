import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { returnsService } from "../services/returnsService";
import { alertError, alertConfirmUsers } from "../services/alertService";
import "../styles/devoluciones.css";

export default function DevolucionesPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { orderId, sobrantes } = location.state || {};

    const [itemsDevolver, setItemsDevolver] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);

    // Estado para saber si la orden ya está totalmente liquidada
    const [esLiquidado, setEsLiquidado] = useState(false);

    // Estados para el encabezado dinámico
    const [nombreVendedor, setNombreVendedor] = useState("");
    const [fechaDevolucion, setFechaDevolucion] = useState("");

    const [barcodeInput, setBarcodeInput] = useState("");
    const barcodeInputRef = useRef(null);
    const barcodeBuffer = useRef("");

    useEffect(() => {
        if (!orderId) { navigate("/historial-devoluciones"); return; }

        const inicializarPagina = async () => {
            setLoading(true);
            try {
                // 1. Consultar estado de la orden y el historial de devoluciones en paralelo
                const [infoOrden, historialDB] = await Promise.all([
                    returnsService.settleOrder(orderId),
                    returnsService.getReturnHistory(orderId)
                ]);

                setNombreVendedor(infoOrden.seller_name || "VENDEDOR NO IDENTIFICADO");
                setFechaDevolucion(new Date().toLocaleDateString());

                // --- LÓGICA DE BLOQUEO CORREGIDA ---
                // Solo se bloquea si la orden ya fue LIQUIDADA por el administrador.
                // Si está en 'DEVOLUCION', permite re-ingresar y actualizar.
                const estadoActual = String(infoOrden.status || '').trim().toUpperCase();
                const ordenCerrada = estadoActual === 'LIQUIDADO';
                setEsLiquidado(ordenCerrada);

                // 2. Obtener el inventario que se despachó originalmente
                const dataInventario = sobrantes || await returnsService.getTruckInventory(orderId);

                // 3. Mapear los productos cruzando la información previa de la BD
                const itemsMapeados = dataInventario.map(item => {
                    const registroPrevio = historialDB.find(h => h.product_id === item.product_id);

                    return {
                        codg_barras: String(item.codg_barras || '').trim(),
                        product_id: item.product_id || 'N/A',
                        product_name: item.product_name || 'Producto',
                        despachado: Number(item.despachado) || 0,
                        precio_base: Number(item.precio_base) || 0,
                        vendido: Number(item.vendido) || 0,
                        // Si existe registro previo de devolución en BD, usamos esa cantidad;
                        // de lo contrario, calculamos: despachado - vendido
                        cantidad_a_devolver: registroPrevio 
                            ? Number(registroPrevio.cantidad_devuelta) 
                            : (Number(item.despachado) - Number(item.vendido))
                    };
                });

                setItemsDevolver(itemsMapeados);
            } catch (err) {
                console.error(err);
                alertError("Error", "No se pudo cargar la información de la planilla.");
            } finally {
                setLoading(false);
            }
        };

        inicializarPagina();
    }, [orderId, sobrantes, navigate]);

    // LÓGICA DE ESCANEO POR TECLADO
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (esLiquidado) return;
            if (document.activeElement.tagName === "INPUT" && document.activeElement.type === "text") return;

            if (e.key === "Enter") {
                const code = barcodeBuffer.current;
                if (code) {
                    setItemsDevolver(prev => prev.map(item => {
                        if (item.codg_barras === code) {
                            if (item.cantidad_a_devolver < item.despachado) {
                                return { ...item, cantidad_a_devolver: item.cantidad_a_devolver + 1 };
                            } else {
                                console.warn("Límite alcanzado para este producto");
                                return item;
                            }
                        }
                        return item;
                    }));
                }
                barcodeBuffer.current = "";
            } else {
                if (e.key.length === 1) {
                    barcodeBuffer.current += e.key;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [esLiquidado]);

    useEffect(() => {
        if (!loading && !esLiquidado && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [loading, esLiquidado]);

    const handleBarcodeScan = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const code = barcodeInput.trim();

            if (code) {
                setItemsDevolver((prev) =>
                    prev.map((item) => {
                        if (item.codg_barras === code) {
                            if (item.cantidad_a_devolver < item.despachado) {
                                return { ...item, cantidad_a_devolver: item.cantidad_a_devolver + 1 };
                            } else {
                                console.warn("Límite alcanzado para este producto");
                            }
                        }
                        return item;
                    })
                );
            }
            setBarcodeInput("");
        }
    };

    const handleCantidadChange = (id, valor) => {
        if (esLiquidado) return;

        const numValor = Number(valor) || 0;
        setItemsDevolver(prev => prev.map(item => {
            if (item.product_id === id) {
                const cantidadValidada = numValor > item.despachado ? item.despachado : numValor;
                return { ...item, cantidad_a_devolver: cantidadValidada };
            }
            return item;
        }));
    };

    const handleLiquidacion = async () => {
        if (esLiquidado) return;

        const confirmed = await alertConfirmUsers(
            "¿Estás seguro?",
            "¿Estás seguro que quieres guardar/actualizar la devolución?"
        );

        if (!confirmed) return;

        setProcesando(true);

        try {
            // Mapeamos todos los ítems para que el backend maneje inserción y actualización limpia
            const devolucionesParaEnviar = itemsDevolver.map(item => {
                const despachado = Number(item.despachado) || 0;
                const trae = Number(item.cantidad_a_devolver) || 0;
                const venta = despachado - trae;

                return {
                    order_id: orderId,
                    product_id: item.product_id,
                    quantity: trae,
                    sold_quantity: venta
                };
            });

            // 1. Procesar devolución en Backend
            await returnsService.processReturn({
                order_id: orderId,
                items: devolucionesParaEnviar
            });

            // 2. Actualizar estado de la orden a 'DEVOLUCION'
            await returnsService.updateOrderStatus(orderId, 'DEVOLUCION');

            navigate("/historial-devoluciones");

        } catch (error) {
            console.error(error);
            alertError("Error", "No se pudo completar el proceso de devolución");
        } finally {
            setProcesando(false);
        }
    };

    const itemsFiltrados = itemsDevolver
        .filter(item =>
            item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.codg_barras.includes(searchTerm)
        )
        .sort((a, b) => {
            const aTieneDevolucion = a.cantidad_a_devolver > 0 ? 1 : 0;
            const bTieneDevolucion = b.cantidad_a_devolver > 0 ? 1 : 0;
            return bTieneDevolucion - aTieneDevolucion;
        });

    const totalSuma = itemsDevolver.reduce((acc, item) => {
        const venta = Number(item.vendido) || 0;
        const precio = Number(item.precio_base) || 0;
        return acc + (venta * precio);
    }, 0);

    if (loading) return <div className="loading-state">Cargando...</div>;

    return (
        <div className="devoluciones-container">
            {/* CONTENEDOR SUPERIOR */}
            <div className="header-actions" style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                marginBottom: '20px',
                backgroundColor: '#fff',
                padding: '12px 20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <div>
                    <button
                        className="btn-back"
                        onClick={() => navigate(-1)}
                        style={{
                            margin: 0,
                            backgroundColor: '#9b111e',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease'
                        }}
                    >
                        ← Volver
                    </button>
                </div>

                <div style={{ textAlign: 'center', color: '#333' }}>
                    <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>
                        ID ORDEN: #{orderId}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                        <strong>VENDEDOR:</strong> {nombreVendedor} &nbsp;
                    </p>
                </div>

                <div style={{ width: '80px' }}></div>
            </div>

            {/* CONTENEDOR DE INPUTS */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: '1' }}>
                    <input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder={esLiquidado ? "MODO CONSULTA - ORDEN LIQUIDADA" : "📷 Pistolea el código aquí..."}
                        className="input-search"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={handleBarcodeScan}
                        disabled={esLiquidado}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '0.95rem',
                            border: '2px solid #1e293b',
                            borderRadius: '6px',
                            backgroundColor: esLiquidado ? '#e9ecef' : '#fff',
                            cursor: esLiquidado ? 'not-allowed' : 'text',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ flex: '1' }}>
                    <input
                        type="text"
                        placeholder={esLiquidado ? "MODO CONSULTA - ORDEN LIQUIDADA" : "🔍 Buscar por nombre..."}
                        className="input-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={esLiquidado}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '0.95rem',
                            border: '1px solid #ccc',
                            borderRadius: '6px',
                            backgroundColor: esLiquidado ? '#e9ecef' : '#fff',
                            cursor: esLiquidado ? 'not-allowed' : 'text',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            {/* TABLA DE DEVOLUCIONES */}
            <div className="planilla-wrapper" style={{
                pointerEvents: esLiquidado ? 'none' : 'auto',
                opacity: esLiquidado ? 0.9 : 1
            }}>
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>CODIGO</th>
                            <th>PRODUCTOS</th>
                            <th>LLEVA</th>
                            <th>TRAE</th>
                            <th>VENTA</th>
                            <th>PRECIO</th>
                            <th>TOTAL</th>
                            <th>DESCUADRE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsFiltrados.map((item) => {
                            const despachado = Number(item.despachado) || 0;
                            const trae = Number(item.cantidad_a_devolver) || 0;
                            const venta = Number(item.vendido) || 0;
                            const descuadre = trae - (despachado - venta);
                            const total = venta * item.precio_base;

                            return (
                                <tr key={item.product_id} style={{ backgroundColor: esLiquidado ? '#f8f9fa' : '' }}>
                                    <td className="text-center">{item.codg_barras}</td>
                                    <td>{item.product_name}</td>
                                    <td className="text-center">{despachado}</td>

                                    <td className="text-center">
                                        <input
                                            type="number"
                                            className="input-minimal"
                                            value={trae}
                                            onChange={(e) => handleCantidadChange(item.product_id, e.target.value)}
                                            readOnly={esLiquidado}
                                            style={{
                                                backgroundColor: esLiquidado ? 'transparent' : '#fff',
                                                border: esLiquidado ? 'none' : '1px solid #ccc',
                                                textAlign: 'center',
                                                fontWeight: 'bold',
                                                color: esLiquidado ? '#d32f2f' : '#000',
                                                pointerEvents: esLiquidado ? 'none' : 'auto'
                                            }}
                                        />
                                    </td>

                                    <td className="text-center">{venta}</td>
                                    <td className="text-right">{item.precio_base.toLocaleString()}</td>
                                    <td className="text-right">{total.toLocaleString()}</td>
                                    <td className="text-center" style={{ fontWeight: 'bold', color: descuadre !== 0 ? 'red' : 'inherit' }}>
                                        {descuadre}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="resumen-total-container" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '15px'
            }}>
                <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ccc',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    minWidth: '250px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontWeight: 'bold', color: '#333', fontSize: '1.1rem' }}>
                        TOTAL SURTIDO:
                    </span>
                    <span style={{ fontWeight: 'bold', color: '#d32f2f', fontSize: '1.2rem' }}>
                        $ {totalSuma.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="footer-actions" style={{ marginTop: '30px' }}>
                {!esLiquidado ? (
                    <button
                        className="btn-liquidar"
                        onClick={handleLiquidacion}
                        disabled={procesando}
                    >
                        {procesando ? "PROCESANDO..." : "🚀 FINALIZAR / ACTUALIZAR DEVOLUCIÓN"}
                    </button>
                ) : (
                    <button
                        className="btn-liquidar"
                        style={{
                            backgroundColor: '#2e7d32',
                            cursor: 'not-allowed',
                            opacity: 0.8
                        }}
                        disabled
                    >
                        ✅ ORDEN LIQUIDADA (CERRADA)
                    </button>
                )}
            </div>
        </div>
    );
}