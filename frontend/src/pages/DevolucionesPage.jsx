import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { returnsService } from "../services/returnsService";
import { alertError } from "../services/alertService";
import "../styles/devoluciones.css";

export default function DevolucionesPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { orderId, sobrantes } = location.state || {};

    const [itemsDevolver, setItemsDevolver] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);

    // NUEVO: Estado para saber si la liquidación ya está cerrada
    const [esLiquidado, setEsLiquidado] = useState(false);

    // NUEVO: Estados para encabezado dinámico
    const [nombreVendedor, setNombreVendedor] = useState("");
    const [fechaDevolucion, setFechaDevolucion] = useState("");

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
                // NUEVO: Seteamos el nombre del vendedor y la fecha actual
                setNombreVendedor(infoOrden.seller_name || "VENDEDOR NO IDENTIFICADO");
                setFechaDevolucion(new Date().toLocaleDateString());


                // --- LÓGICA DE BLOQUEO ACTUALIZADA ---
                // Verificamos si el estado es DEVOLUCION o LIQUIDADO
                const estadoActual = String(infoOrden.status).trim().toUpperCase();
                const yaFinalizado = estadoActual === 'DEVOLUCION' || estadoActual === 'LIQUIDADO';

                setEsLiquidado(yaFinalizado);

                // FORZAMOS EL ESTADO: Asegúrate de que infoOrden.status sea 'LIQUIDADO'
                const isLiq = String(infoOrden.status).trim().toUpperCase() === 'LIQUIDADO';
                setEsLiquidado(isLiq);

                // 2. Obtener el inventario que se despachó originalmente
                const dataInventario = sobrantes || await returnsService.getTruckInventory(orderId);

                // 3. Mapear los productos cruzando la información
                const itemsMapeados = dataInventario.map(item => {
                    // Buscamos si este producto específico está en el historial de la DB
                    const registroPrevio = historialDB.find(h => h.product_id === item.product_id);

                    return {
                        codg_barras: String(item.codg_barras || '').trim(),
                        product_id: item.product_id || 'N/A',
                        product_name: item.product_name || 'Producto',
                        despachado: Number(item.despachado) || 0,
                        precio_base: Number(item.precio_base) || 0,

                        // <--- NUEVO: Guardamos lo vendido que ya calculó el backend
                        vendido: Number(item.vendido) || 0,

                        // Si existe en la DB, usamos esa cantidad; si no, por defecto calculamos: despachado - vendido
                        cantidad_a_devolver: registroPrevio ? Number(registroPrevio.cantidad_devuelta) : (Number(item.despachado) - Number(item.vendido))
                    };
                });

                setItemsDevolver(itemsMapeados);
            } catch (err) {
                alertError("Error", "No se pudo cargar la información de la planilla.");
            } finally {
                setLoading(false);
            }
        };

        inicializarPagina();
    }, [orderId, sobrantes, navigate]);

    // LÓGICA DE ESCANEO (Bloqueada si esLiquidado es true)
    // LÓGICA DE ESCANEO CORREGIDA
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (esLiquidado) return;

            if (document.activeElement.tagName === "INPUT" && document.activeElement.type === "text") return;

            if (e.key === "Enter") {
                const code = barcodeBuffer.current;
                if (code) {
                    setItemsDevolver(prev => prev.map(item => {
                        if (item.codg_barras === code) {
                            // VALIDACIÓN: Solo sumar si lo que trae es MENOR a lo que lleva (despachado)
                            if (item.cantidad_a_devolver < item.despachado) {
                                return { ...item, cantidad_a_devolver: item.cantidad_a_devolver + 1 };
                            } else {
                                // Opcional: Podrías lanzar una alerta aquí si intentan pistolear de más
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
    }, [esLiquidado, itemsDevolver]); // Añadimos itemsDevolver a las dependencias para tener los datos frescos

    const handleCantidadChange = (id, valor) => {
        // BLOQUEO DE SEGURIDAD: Si la orden está liquidada, no permite cambios en el estado
        if (esLiquidado) return;

        const numValor = Number(valor) || 0;
        setItemsDevolver(prev => prev.map(item => {
            if (item.product_id === id) {
                // Validar que no devuelva más de lo que lleva
                const cantidadValidada = numValor > item.despachado ? item.despachado : numValor;
                return { ...item, cantidad_a_devolver: cantidadValidada };
            }
            return item;
        }));
    };

    const handleLiquidacion = async () => {
        if (esLiquidado) return; //
        setProcesando(true); //

        try {
            const devolucionesParaEnviar = itemsDevolver
                .filter(item => item.cantidad_a_devolver > 0) //[cite: 1]
                .map(item => {
                    const despachado = Number(item.despachado) || 0; //[cite: 1]
                    const trae = Number(item.cantidad_a_devolver) || 0; //[cite: 1]
                    const venta = despachado - trae; // Lo que realmente se vendió[cite: 1]

                    return {
                        order_id: orderId, //[cite: 1]
                        product_id: item.product_id, //[cite: 1]
                        quantity: trae, // Cantidad devuelta[cite: 1]
                        sold_quantity: venta // <--- NUEVO: Cantidad vendida de este producto
                    };
                });

            // 1. Procesar los items devueltos (si hay alguno)
            if (devolucionesParaEnviar.length > 0) {
                await returnsService.processReturn({ //[cite: 1]
                    order_id: orderId, //[cite: 1]
                    items: devolucionesParaEnviar //[cite: 1]
                });
            }

            // 2. Aseguramos el cambio de estado a 'DEVOLUCION'
            await returnsService.updateOrderStatus(orderId, 'DEVOLUCION'); //[cite: 1]

            navigate("/historial-devoluciones"); //[cite: 1]

        } catch (error) {
            console.error(error); //[cite: 1]
            alertError("Error", "No se pudo completar el proceso de devolución"); //[cite: 1]
        } finally {
            setProcesando(false); //[cite: 1]
        }
    };

    // Filtramos los ítems y luego los ordenamos para que los que tienen "TRAE" > 0 suban al principio
    const itemsFiltrados = itemsDevolver
        .filter(item =>
            item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.codg_barras.includes(searchTerm)
        )
        .sort((a, b) => {
            // Si 'b' tiene cantidad y 'a' no, 'b' sube (devoluciones primero)
            const aTieneDevolucion = a.cantidad_a_devolver > 0 ? 1 : 0;
            const bTieneDevolucion = b.cantidad_a_devolver > 0 ? 1 : 0;

            return bTieneDevolucion - aTieneDevolucion;
        });

    // CAMBIO AQUÍ: Reduce acumulando (venta * precio) de cada ítem
    const totalSuma = itemsDevolver.reduce((acc, item) => {
        const venta = Number(item.vendido) || 0; // Tomamos la cantidad vendida
        const precio = Number(item.precio_base) || 0; // Tomamos el precio base
        return acc + (venta * precio);
    }, 0);

    // Función para disparar la impresión del navegador
    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="loading-state">Cargando...</div>;

    return (
        <div className="devoluciones-container">
            <div className="header-actions">
                <button className="btn-back" onClick={() => navigate(-1)}>← Volver</button>

                <h3 style={{ margin: 0, color: '#333', textTransform: 'uppercase', }}>
                    HOJA DE DEVOLUCIÓN
                </h3>
            </div>

            <div className="search-container" style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder={esLiquidado ? "MODO CONSULTA - ORDEN CERRADA" : "Buscar por nombre..."}
                    className="input-search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    // Solo deshabilitamos si ya está liquidado
                    disabled={esLiquidado}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: esLiquidado ? '#e9ecef' : '#fff',
                        cursor: esLiquidado ? 'not-allowed' : 'text'
                    }}
                />
            </div>

            {/* El wrapper solo bloquea los clicks si esLiquidado es true */}
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
                            <th>DESCAUDRE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsFiltrados.map((item) => {
                            // 1. Cálculos
                            const despachado = Number(item.despachado) || 0;
                            const trae = Number(item.cantidad_a_devolver) || 0;

                            // Toma el valor real vendido desde la base de datos
                            const venta = Number(item.vendido) || 0;

                            // El descuadre se calcula en base a lo que devolvió físicamente vs lo que debería haber sobrado
                            const descuadre = trae - (despachado - venta);

                            // CAMBIO AQUÍ: Ahora multiplica VENTA por el precio base
                            const total = venta * item.precio_base;

                            return (
                                <tr key={item.product_id} style={{ backgroundColor: esLiquidado ? '#f8f9fa' : '' }}>
                                    <td className="text-center">{item.codg_barras}</td>
                                    <td>{item.product_name}</td>
                                    <td className="text-center">{despachado}</td>

                                    {/* Campo TRAE (Input) */}
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

                                    {/* Campo VENTA (Mostrará los "5" artículos vendidos de tu base de datos) */}
                                    <td className="text-center">{venta}</td>

                                    <td className="text-right">{item.precio_base.toLocaleString()}</td>
                                    <td className="text-right">{total.toLocaleString()}</td>

                                    {/* Campo DESCAUDRE */}
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
                        {procesando ? "PROCESANDO..." : "🚀 FINALIZAR DEVOLUCIÓN"}
                    </button>
                ) : (
                    /* BOTÓN EN ESTADO CERRADO */
                    <button
                        className="btn-liquidar"
                        style={{
                            backgroundColor: '#2e7d32',
                            cursor: 'not-allowed',
                            opacity: 0.8
                        }}
                        disabled
                    >
                        ✅ ESTA ORDEN DEVUELTA
                    </button>
                )}
            </div>
        </div>
    );
}