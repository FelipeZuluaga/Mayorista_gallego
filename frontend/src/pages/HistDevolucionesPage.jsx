import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../services/orderService";
import { alertError } from "../services/alertService";


export default function HistDevolucionesPage() {
    const [ordenes, setOrdenes] = useState([]);
    // --- NUEVOS ESTADOS PARA FILTROS ---
    const [filtroId, setFiltroId] = useState("");
    const [filtroVendedor, setFiltroVendedor] = useState("");

    const navigate = useNavigate();
    const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay());
    const user = JSON.parse(localStorage.getItem("user"));

    //---------------------------------------------
    // Ver lo que devolvi 

    const [modalOpen, setModalOpen] = useState(false);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    //----------------------------------------------

    useEffect(() => {
        cargarOrdenes();
    }, []);

    const cargarOrdenes = async () => {
        const data = await orderService.getOrdersHistory(JSON.parse(localStorage.getItem("user")));
        setOrdenes(data || []);
    };

    // --- LÓGICA DE FILTRADO COMBINADA ---
    const ordenesFiltradas = ordenes.filter((o) => {
        const coincideDia = new Date(o.created_at).getDay() === diaSeleccionado;
        const coincideId = o.id.toString().includes(filtroId);
        // Usamos seller_name o user_id dependiendo de lo que tengas disponible
        const nombreVendedor = o.seller_name;
        const coincideVendedor = nombreVendedor.toLowerCase().includes(filtroVendedor.toLowerCase());

        return coincideDia && coincideId && coincideVendedor;
    });


    // Modifica esta función dentro de HistDevolucionesPage.jsx
    const verDetalle = async (orden) => {
        setLoadingDetalle(true);
        setModalOpen(true);
        try {
            // 1. Llamamos a ambos servicios en paralelo para tener la info completa
            const [historialDB, inventarioOriginal] = await Promise.all([
                orderService.getReturnHistory(orden.id),
                orderService.getTruckInventory(orden.id) // Este trae lo que "LLEVA" y el PRECIO
            ]);

            // 2. Cruzamos la información como lo haces en DevolucionesPage
            const itemsCompletos = inventarioOriginal.map(inv => {
                const devolucion = historialDB.find(h => h.product_id === inv.product_id);
                return {
                    codg_barras: inv.codg_barras,
                    product_name: inv.product_name,
                    despachado: inv.despachado,
                    precio_base: inv.precio_base,
                    vendido: inv.vendido || 0, // <--- NUEVO: Traemos la venta real
                    cantidad_devuelta: devolucion ? devolucion.cantidad_devuelta : 0
                };
            });
            setDetalleSeleccionado({
                id: orden.id,
                vendedor: orden.seller_name,
                fecha: new Date(orden.created_at).toLocaleDateString(),
                items: itemsCompletos // Ahora sí tiene todos los campos necesarios
            });
        } catch (err) {
            console.error(err);
            alertError("Error", "No se pudo cargar el detalle completo");
            setModalOpen(false);
        } finally {
            setLoadingDetalle(false);
        }
    };

    return (
        <div className="p-6">
            <header className="ruta-header-main">
                <h1>{user.role === 'ADMINISTRADOR' ? '🚀 Historial y proceso de Devolucion y Descuadres' : '🚚 Historial y proceso de mis Devolucion y Descuadres'}</h1>
                <p>Viendo rutas del día: <strong>{DIAS_SEMANA[diaSeleccionado]}</strong></p>
            </header>

            <div className="dias-selector-container">
                {DIAS_SEMANA.map((dia, index) => (
                    <button
                        key={dia}
                        onClick={() => setDiaSeleccionado(index)}
                        className={`btn-dia ${diaSeleccionado === index ? 'selected' : ''}`}
                    >
                        {dia}
                    </button>
                ))}
            </div>

            {/* --- CONTENEDOR DE BUSCADORES --- */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', marginTop: '10px' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar por ID Orden..."
                    className="input-search" // Puedes agregar estilos en tu CSS
                    value={filtroId}
                    onChange={(e) => setFiltroId(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: 1 }}
                />
                <input
                    type="text"
                    placeholder="👤 Buscar por Vendedor..."
                    className="input-search"
                    value={filtroVendedor}
                    onChange={(e) => setFiltroVendedor(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: 2 }}
                />
            </div>
            <table className="excel-table">
                <thead>
                    <tr>
                        <th>ID Orden</th>
                        <th>Vendedor</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'center' }}>Accion</th>
                    </tr>
                </thead>
                <tbody>
                    {ordenesFiltradas.length > 0 ? (
                        ordenesFiltradas.map((orden) => {
                            const status = orden.status;

                            return (
                                <tr key={orden.id}>
                                    <td style={{ fontWeight: 'bold' }}>#{orden.id}</td>
                                    <td>{orden.seller_name || `ID: ${orden.user_id}`}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            backgroundColor: status === 'LIQUIDADO' ? '#dcfce7' : status === 'DEVOLUCION' ? '#e0f2fe' : '#fef9c3',
                                            color: status === 'LIQUIDADO' ? '#166534' : status === 'DEVOLUCION' ? '#0369a1' : '#854d0e',
                                            border: '1px solid currentColor'
                                        }}>
                                            {status || 'PENDIENTE'}
                                        </span>
                                    </td>

                                    {/* COLUMNA DE ACCIONES CON 3 BOTONES DISTINTOS */}
                                    {/* COLUMNA DE ACCIONES CON VALIDACIONES */}
                                    <td style={{ width: '300px' }}>
                                        <div style={{
                                            display: 'flex',
                                            gap: '6px',
                                            justifyContent: 'center'
                                        }}>

                                            {/* 1. BOTÓN DEVOLUCIÓN: Habilitado solo si está EN RUTA o DESPACHADO */}
                                            <button
                                                onClick={() => navigate("/devoluciones", { state: { orderId: orden.id } })}
                                                disabled={status === 'LIQUIDADO' || status === 'DEVOLUCION'}
                                                title="Iniciar Devolución"
                                                style={{
                                                    backgroundColor: (status === 'LIQUIDADO' || status === 'DEVOLUCION') ? '#ccc' : '#9b111e',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 12px',
                                                    borderRadius: '5px',
                                                    cursor: (status === 'LIQUIDADO' || status === 'DEVOLUCION') ? 'not-allowed' : 'pointer',
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    opacity: (status === 'LIQUIDADO' || status === 'DEVOLUCION') ? 0.6 : 1,
                                                    flex: 1
                                                }}
                                            >
                                                🔄 Devolución
                                            </button>

                                            {/* 2. BOTÓN VER: Habilitado solo si ya hay una devolución o está liquidado */}
                                            <button
                                                onClick={() => verDetalle(orden)} // Ahora llama a la función local
                                                disabled={status !== 'DEVOLUCION' && status !== 'LIQUIDADO'}
                                                title="Ver Detalles"
                                                style={{
                                                    backgroundColor: '#fff',
                                                    color: (status !== 'DEVOLUCION' && status !== 'LIQUIDADO') ? '#999' : '#333',
                                                    border: `1px solid ${(status !== 'DEVOLUCION' && status !== 'LIQUIDADO') ? '#eee' : '#ccc'}`,
                                                    padding: '8px 12px',
                                                    borderRadius: '5px',
                                                    cursor: (status !== 'DEVOLUCION' && status !== 'LIQUIDADO') ? 'not-allowed' : 'pointer',
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    opacity: (status !== 'DEVOLUCION' && status !== 'LIQUIDADO') ? 0.5 : 1,
                                                    flex: 1
                                                }}
                                            >
                                                👁️ Ver
                                            </button>

                                            {/* 3. BOTÓN LIQUIDAR: Solo para ADMIN y si el estado es DEVOLUCION */}
                                            {/* 3. BOTÓN LIQUIDAR: Actualizado para ir a /liquidacion-ruta/:orderId */}
                                            <button
                                                onClick={() => navigate(`/liquidacion-ruta/${orden.id}`)}
                                                disabled={status !== 'DEVOLUCION' || user.role !== 'ADMINISTRADOR'}
                                                title="Realizar Liquidación"
                                                style={{
                                                    backgroundColor: (status !== 'DEVOLUCION' || user.role !== 'ADMINISTRADOR') ? '#ccc' : '#166534',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 12px',
                                                    borderRadius: '5px',
                                                    cursor: (status !== 'DEVOLUCION' || user.role !== 'ADMINISTRADOR') ? 'not-allowed' : 'pointer',
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    opacity: (status !== 'DEVOLUCION' || user.role !== 'ADMINISTRADOR') ? 0.6 : 1,
                                                    flex: 1
                                                }}
                                            >
                                                💰 Liquidar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                No se encontraron órdenes.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {/* --- MODAL DE DETALLES (AGREGADA AQUÍ) --- */}
            {/* --- MODAL DE DETALLES ACTUALIZADA --- */}
            {modalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '25px', borderRadius: '8px',
                        width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
                        position: 'relative', boxShadow: '0 5px 20px rgba(0,0,0,0.3)'
                    }}>
                        <button
                            onClick={() => setModalOpen(false)}
                            style={{ position: 'absolute', top: '15px', right: '20px', border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
                        >
                            &times;
                        </button>

                        {loadingDetalle ? (
                            <div style={{ textAlign: 'center', padding: '40px', fontWeight: 'bold' }}>Cargando información...</div>
                        ) : (
                            <>
                                <div style={{ borderBottom: '2px solid #9b111e', marginBottom: '20px', paddingBottom: '10px' }}>
                                    <h2 style={{ margin: 0, color: '#333', textTransform: 'uppercase', fontSize: '1.2rem' }}>
                                        Resumen de Devolución: {detalleSeleccionado?.vendedor}
                                    </h2>
                                    <p style={{ margin: '5px 0 0', color: '#666', fontWeight: 'bold' }}>
                                        ORDEN: #{detalleSeleccionado?.id} | FECHA: {detalleSeleccionado?.fecha}
                                    </p>
                                </div>

                                <table className="excel-table">
                                    <thead>
                                        <tr style={{ backgroundColor: '#9b111e', color: 'white' }}>
                                            <th>CODIGO</th>
                                            <th>PRODUCTOS</th>
                                            <th style={{ textAlign: 'center' }}>LLEVA</th>
                                            <th style={{ textAlign: 'center' }}>TRAE</th>
                                            <th style={{ textAlign: 'center' }}>VENTA</th>
                                            <th style={{ textAlign: 'right' }}>PRECIO</th>
                                            <th style={{ textAlign: 'right' }}>TOTAL</th>
                                            <th style={{ textAlign: 'center' }}>DESCUADRE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detalleSeleccionado?.items.length > 0 ? (
                                            detalleSeleccionado.items.map((item, idx) => {
                                                const lleva = Number(item.despachado) || 0;
                                                const trae = Number(item.cantidad_devuelta) || 0;

                                                // 1. Usamos la venta real que viene desde la base de datos
                                                const venta = Number(item.vendido) || 0;

                                                // 2. Cálculo del descuadre: lo que físicamente trajo menos lo que debió sobrar (lleva - venta)
                                                const descuadre = trae - (lleva - venta);

                                                const precio = Number(item.precio_base) || 0;

                                                // 3. Multiplicación de LLEVA x PRECIO para el Total
                                                const totalRow = lleva * precio;

                                                return (
                                                    <tr key={idx}>
                                                        <td style={{ fontSize: '0.85rem' }}>{item.codg_barras}</td>
                                                        <td>{item.product_name}</td>
                                                        <td style={{ textAlign: 'center' }}>{lleva}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#d32f2f' }}>{trae}</td>
                                                        <td style={{ textAlign: 'center' }}>{venta}</td>
                                                        <td style={{ textAlign: 'right' }}>$ {precio.toLocaleString()}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>$ {totalRow.toLocaleString()}</td>

                                                        {/* 4. Nueva celda para mostrar el descuadre (Se pinta en rojo si no es 0) */}
                                                        <td style={{
                                                            textAlign: 'center',
                                                            fontWeight: 'bold',
                                                            color: descuadre !== 0 ? 'red' : 'inherit'
                                                        }}>
                                                            {descuadre}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No hay productos registrados.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* SECCIÓN DE TOTAL SURTIDO (Igual a la imagen) */}
                                {/* SECCIÓN DE TOTAL SURTIDO CORREGIDA */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                                    <div style={{
                                        backgroundColor: '#f8f9fa', border: '1px solid #ccc',
                                        padding: '10px 25px', borderRadius: '4px', display: 'flex',
                                        gap: '20px', alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: 'bold', color: '#333' }}>TOTAL SURTIDO:</span>
                                        <span style={{ fontWeight: 'bold', color: '#d32f2f', fontSize: '1.3rem' }}>
                                            $ {detalleSeleccionado?.items.reduce((acc, item) => {
                                                // Multiplicamos directamente LLEVA (despachado) x PRECIO (precio_base)
                                                const lleva = Number(item.despachado) || 0;
                                                const precio = Number(item.precio_base) || 0;

                                                return acc + (lleva * precio);
                                            }, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Botones de Acción Inferiores - No se imprimen */}
                                <div className="no-print" style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => window.print()}
                                        style={{
                                            padding: '10px 20px', backgroundColor: '#1e293b', color: 'white',
                                            border: 'none', borderRadius: '4px', cursor: 'pointer',
                                            fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
                                        }}
                                    >
                                        🖨️ Imprimir Soporte
                                    </button>
                                    <button
                                        onClick={() => setModalOpen(false)}
                                        style={{ padding: '10px 20px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Cerrar
                                    </button>
                                </div>

                            </>
                        )}
                    </div>
                </div>
            )}
        </div>

    );
}