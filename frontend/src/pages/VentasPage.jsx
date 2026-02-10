import { useEffect, useState, useMemo } from "react";
import { orderService } from "../services/orderService";
import { saleService } from "../services/saleService";
import { alertSuccess, alertError } from "../services/alertService";
import { customerService } from "../services/customerService";
import {
    ArrowRight,
    ChevronLeft,
    User,
    Truck,
    Clock,
    BarChart3
} from "lucide-react";

export default function VentasPage() {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);

    const [salePrices, setSalePrices] = useState({});
    const [saleQuantities, setSaleQuantities] = useState({});
    const [amountPaid, setAmountPaid] = useState(0);
    const [loading, setLoading] = useState(true);
    const [clientesConocidos, setClientesConocidos] = useState([]);

    const user = JSON.parse(localStorage.getItem("user"));
    const DIAS_SEMANA = [
        "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
    ];


    // Dentro del componente VentasPage:
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay());

    // Agrega este nuevo estado para los filtros
    const [filtros, setFiltros] = useState({
        id: "",
        vendedor: "",
        tipoCliente: ""
    });
    useEffect(() => {
        loadPendingOrders();
    }, []);

    const loadPendingOrders = async () => {
        try {
            setLoading(true);
            const queryParams = {
                id: user.id,
                role: user.role,
                name: user.role === 'ADMINISTRADOR' ? "" : user.name
            };
            const data = await orderService.getOrdersHistory(queryParams);
            // Solo mostramos lo que ya salió del almacén (DESPACHADO) pero no se ha cobrado
            setPendingOrders(data.filter(o => o.status === "DESPACHADO"));
        } catch (err) {
            alertError("Error", "No se pudieron cargar los despachos.");
        } finally {
            setLoading(false);
        }
    };
    const ordenesFiltradas = useMemo(() => {
        return pendingOrders.filter(order => {
            // 1. Filtro por Día (Ya lo tienes)
            if (!order.created_at) return false;
            const fechaOrden = new Date(order.created_at);
            const coincideDia = fechaOrden.getDay() === diaSeleccionado;

            // 2. Filtro por ID
            const coincideId = order.id.toString().includes(filtros.id);

            // 3. Filtro por Vendedor (ignora mayúsculas/minúsculas)
            const coincideVendedor = order.seller_name.toLowerCase()
                .includes(filtros.vendedor.toLowerCase());

            // 4. Filtro por Tipo de Cliente
            const coincideTipo = order.customer_type_name.toLowerCase()
                .includes(filtros.tipoCliente.toLowerCase());

            return coincideDia && coincideId && coincideVendedor && coincideTipo;
        });
    }, [pendingOrders, diaSeleccionado, filtros]);

    // Actualizamos también los stats para que reflejen solo el día seleccionado
    const stats = useMemo(() => {
        const count = ordenesFiltradas.length;
        const totalValue = ordenesFiltradas.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
        return { count, totalValue };
    }, [ordenesFiltradas]);

    const handleSelectOrder = async (order) => {
        try {
            const items = await orderService.getOrderDetail(order.id);
            const clientes = await customerService.getBalances(); // Carga de saldos
            setSelectedOrder(order);
            setOrderItems(items);
            setClientesConocidos(clientes); // Guardamos la lista

            const initialPrices = {};
            const initialQtys = {};

            items.forEach((item, index) => {
                const uniqueKey = `${item.product_id}-${index}`;
                initialPrices[uniqueKey] = item.unit_price;
                initialQtys[uniqueKey] = item.quantity;
            });

            setSalePrices(initialPrices);
            setSaleQuantities(initialQtys);
            setAmountPaid(0);
        } catch (err) {
            alertError("Error", "No se pudo cargar el detalle del despacho.");
        }
    };

    const handlePriceChange = (uniqueKey, newValue) => {
        const val = newValue === "" ? "" : Number(newValue);
        setSalePrices(prev => ({ ...prev, [uniqueKey]: val }));
    };

    const handleQuantityChange = (uniqueKey, newValue, maxQty) => {
        if (newValue === "") {
            setSaleQuantities(prev => ({ ...prev, [uniqueKey]: "" }));
            return;
        }
        const val = Number(newValue);
        if (val > maxQty) {
            alertError("Límite excedido", `Solo se despacharon ${maxQty} unidades.`);
            setSaleQuantities(prev => ({ ...prev, [uniqueKey]: maxQty }));
        } else if (val < 0) {
            setSaleQuantities(prev => ({ ...prev, [uniqueKey]: 0 }));
        } else {
            setSaleQuantities(prev => ({ ...prev, [uniqueKey]: val }));
        }
    };

    const totalSale = useMemo(() => {
        return orderItems.reduce((acc, item, index) => {
            const uniqueKey = `${item.product_id}-${index}`;
            const qty = Number(saleQuantities[uniqueKey]) || 0;
            const price = Number(salePrices[uniqueKey]) || 0;
            return acc + (qty * price);
        }, 0);
    }, [salePrices, saleQuantities, orderItems]);

    const balanceDue = totalSale - amountPaid;

    const handleConfirmSale = async () => {
        setLoading(true);
        try {
            const payload = {
                order_id: selectedOrder.id,
                sales: salesSession.map(v => ({
                    seller_name: selectedOrder.seller_name,
                    customer_name: v.cliente.name,
                    customer_address: v.cliente.address,
                    customer_phone: v.cliente.phone,
                    location_type: v.cliente.location_type,
                    visit_status: v.cliente.status,
                    total_amount: v.total,
                    amount_paid: v.pagado,
                    items: v.items.map(i => ({
                        product_id: i.product_id,
                        product_name: i.product_name,
                        quantity: i.qty,
                        unit_price: i.price, // <-- Aquí va el precio de venta (ej: 4000)
                        total_price: i.total || (i.qty * i.price)
                    }))
                }))
            };

            await saleService.createSale(payload);
            alertSuccess("Ruta Sincronizada", "Se han registrado todos los clientes y la ruta ha sido cerrada.");
            limpiarYSalir();
            loadPendingOrders();
        } catch (err) {
            alertError("Error", "No se pudo sincronizar la liquidación.");
        } finally {
            setLoading(false);
        }
    };
    // Estados adicionales
    const [clientData, setClientData] = useState({
        name: "",
        address: "",
        phone: "",
        status: "REPASO",
        location_type: "Local", // Campo para agrupar (Edificio/Local/Barrio/Otros)
        amount_paid: "",
        deuda_previa: 0  // Agrega esto
    });
    const [salesSession, setSalesSession] = useState([]); // Historial de la ruta actual

    const registrarVentaLocal = () => {
        if (!clientData.name.trim()) return alertError("Error", "Nombre de cliente requerido");

        // Calcular el total de la venta actual (productos seleccionados)
        const totalVentaActual = orderItems.reduce((acc, item) => {
            const key = `${item.product_id}-${orderItems.indexOf(item)}`; // ajusta según tu key
            const qty = Number(saleQuantities[key]) || 0;
            const price = Number(salePrices[key]) || 0;
            return acc + (qty * price);
        }, 0);

        // En registrarVentaLocal
        const pago = Number(clientData.amount_paid) || 0; // El || 0 evita el NaN

        // LÓGICA DE SALDO: (Deuda Anterior + Venta Nueva) - Pago Actual
        const nuevoSaldoCalculado = (Number(clientData.deuda_previa) + totalVentaActual) - pago;

        const nuevaVenta = {
            cliente: { ...clientData },
            items: orderItems.map((item, index) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                qty: Number(saleQuantities[`${item.product_id}-${index}`]) || 0,
                price: Number(salePrices[`${item.product_id}-${index}`]) || 0
            })).filter(i => i.qty > 0 || totalVentaActual === 0), // Permite abonos (venta $0)
            total: totalVentaActual,
            pago: pago,
            nuevo_saldo: nuevoSaldoCalculado, // Para mostrar en el resumen lateral
            hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setSalesSession([...salesSession, nuevaVenta]);

        // Limpiar formulario para el siguiente cliente
        setClientData({
            name: "", address: "", phone: "",
            status: "REPASO", location_type: "Local",
            amount_paid: "", deuda_previa: 0
        });
        setSaleQuantities({});
    };

    const handleVolver = () => {
        // Si hay algo escrito en las cantidades o ya hay clientes registrados
        const hayProgreso = Object.keys(saleQuantities).length > 0 || salesSession.length > 0;

        if (hayProgreso) {
            if (window.confirm("Tienes datos sin guardar en esta ruta. ¿Seguro que quieres salir y perder los cambios?")) {
                limpiarYSalir();
            }
        } else {
            limpiarYSalir();
        }
    };

    const limpiarYSalir = () => {
        setSelectedOrder(null);
        setSalesSession([]); // Limpia las ventas del día
        setSaleQuantities({}); // Limpia lo que estaba escribiendo
        setClientData({ name: "", address: "", phone: "", status: "VISITADO" });
    };

    if (loading) return <div className="inv-page">Cargando despachos...</div>;
    const formatFechaConDia = (fechaStr) => {
        const fecha = new Date(fechaStr);
        const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const opcionesDia = { weekday: 'long' };

        const fechaNum = fecha.toLocaleDateString('es-ES', opcionesFecha);
        const nombreDia = fecha.toLocaleDateString('es-ES', opcionesDia);

        return `${fechaNum} - ${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)}`;
    };
    const STATUS_COLORS = {
        "VISITADO": "#2ecc71", // Verde
        "REPASO": "#f1c40f",   // Amarillo
        "LLESO": "#e74c3c"     // Rojo
    };
    return (
        <div className="inv-page full-layout">


            {!selectedOrder ? (
                <div className="ventas-container">
                    <div className="ventas-header">
                        <h1>
                            {user.role === 'ADMINISTRADOR' ? 'Control de Ventas' : 'Mis Rutas de Trabajo'}
                        </h1>
                        <p className="text-muted">
                            {user.role === 'ADMINISTRADOR' ? 'Gestión global de ventas y vendedores' : 'Listado de entregas para hoy'}
                        </p>
                    </div>
                    <div className="dias-selector-container" style={{
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '20px',
                        overflowX: 'auto',
                        padding: '10px 0'
                    }}>
                        {DIAS_SEMANA.map((dia, index) => (
                            <button
                                key={dia}
                                onClick={() => setDiaSeleccionado(index)}
                                className={`btn-dia ${diaSeleccionado === index ? 'active' : ''}`}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '20px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: diaSeleccionado === index ? '#df103a' : 'white',
                                    color: diaSeleccionado === index ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {dia}
                            </button>
                        ))}
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card blue-border">
                            <div className="stat-icon blue-bg"><Clock size={24} /></div>
                            <div className="stat-info">
                                <span className="label">{user.role === 'ADMINISTRADOR' ? 'Rutas Activas' : 'Rutas designadas'}</span>
                                <h2 className="value">{stats.count}</h2>
                            </div>
                        </div>
                        <div className="stat-card green-border">
                            <div className="stat-icon green-bg"><BarChart3 size={24} /></div>
                            <div className="stat-info">
                                <span className="label">{user.role === 'ADMINISTRADOR' ? 'Cartera Total' : 'Mi Recaudo'}</span>
                                <h2 className="value">${stats.totalValue.toLocaleString()}</h2>
                            </div>
                        </div>
                    </div>

                    <div className="table-wrapper">
                        <div className="filtros-container" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '80px',
                            padding: '15px',
                            background: '#f1f5f9',
                            borderRadius: '8px',
                            marginBottom: '15px'
                        }}>
                            <div className="filter-group">
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Buscar ID</label>
                                <input
                                    type="text"
                                    placeholder="# ej: 90"
                                    className="main-input"
                                    value={filtros.id}
                                    onChange={(e) => setFiltros({ ...filtros, id: e.target.value })}
                                />
                            </div>

                            {user.role === 'ADMINISTRADOR' && (
                                <>
                                    <div className="filter-group">
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Vendedor</label>
                                        <input
                                            type="text"
                                            placeholder="Nombre..."
                                            className="main-input"
                                            value={filtros.vendedor}
                                            onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })}
                                        />
                                    </div>
                                    <div className="filter-group">
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Tipo Cliente</label>
                                        <select
                                            className="status-select"
                                            value={filtros.tipoCliente}
                                            onChange={(e) => setFiltros({ ...filtros, tipoCliente: e.target.value })}
                                            style={{ marginTop: '0' }}
                                        >
                                            <option value="">Todos</option>
                                            <option value="SOCIO">SOCIO</option>
                                            <option value="CLIENTE">CLIENTE</option>
                                            <option value="NO_SOCIO">NO_SOCIO</option>
                                            <option value="DESPACHO_MAYOR">MAYORISTA</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <button
                                onClick={() => setFiltros({ id: "", vendedor: "", tipoCliente: "" })}
                                style={{ alignSelf: 'end', padding: '10px', fontSize: '12px', cursor: 'pointer', background: '#dbcdce', border: 'none', borderRadius: '5px' }}
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                        <div className="table-title">
                            <h3>{user.role === 'ADMINISTRADOR' ? 'Listado General de rutas' : 'Rutas Asignadas'}</h3>
                        </div>
                        <div className="responsive-container">
                            <table className="ventas-table">
                                <thead>
                                    <tr style={{ background: '#be2b48' }}>
                                        <th>ID</th>
                                        <th>Fecha</th>
                                        {user.role === 'ADMINISTRADOR'
                                            && <th>Nombre de vendedor</th>
                                        }
                                        {user.role === 'ADMINISTRADOR'
                                            && <th>Tipo Cliente</th>
                                        }
                                        <th style={{ textAlign: 'right' }}>Total Estimado</th>
                                        <th style={{ textAlign: 'center' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordenesFiltradas.length > 0 ? (
                                        ordenesFiltradas.map(o => (
                                            <tr key={o.id}>

                                                <td><span className="badge-id" style={{ background: '#be2b48', color: 'white', padding: '5px 10px', borderRadius: '5px' }}>#{o.id}</span></td>

                                                <td>{formatFechaConDia(o.created_at)}</td>

                                                {user.role === 'ADMINISTRADOR' && (
                                                    <td className="seller-cell">
                                                        <div className="user-avatar-mini">
                                                            <User size={14} /> <span>{o.seller_name}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                {user.role === 'ADMINISTRADOR' && (
                                                    <td>{o.customer_type_name}</td>
                                                )}


                                                <td className="text-right font-bold">
                                                    ${Number(o.total_amount).toLocaleString()}
                                                </td>

                                                <td className="text-center">
                                                    <button className="btn-main" onClick={() => handleSelectOrder(o)} style={{
                                                        alignSelf: 'end',
                                                        padding: '10px 20px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        background: 'transparent',
                                                        color: '#d71c32', // El azul de tus botones "Hacer Venta"
                                                        border: '1px solid #d71c32',
                                                        borderRadius: '8px',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '5px'
                                                    }}>
                                                        Hacer Venta <ArrowRight size={16} />
                                                    </button>
                                                </td>

                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={user.role === 'ADMINISTRADOR' ? 5 : 4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                No hay rutas programadas para el día {DIAS_SEMANA[diaSeleccionado]}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="order-details-container">
                    {/* BOTÓN VOLVER Y TÍTULO */}
                    {/* --- AGREGAR ESTO JUSTO AQUÍ --- */}
                    <div style={{ marginBottom: '15px' }}>
                        <button
                            onClick={handleVolver}
                            className="btn-back-list"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <ChevronLeft size={20} /> Volver a mis rutas
                        </button>
                    </div>
                    <div className="vendedores-layout">
                        {/* COLUMNA IZQUIERDA: STOCK REAL EN CAMIÓN */}
                        <div className="camion-sidebar">
                            <h4><Truck size={20} /> STOCK DISPONIBLE</h4>
                            <div className="stock-list">
                                {orderItems.map(item => {
                                    const vendidoTotal = salesSession.reduce((acc, sale) => {
                                        const prod = sale.items.find(i => i.product_id === item.product_id);
                                        return acc + (prod ? prod.qty : 0);
                                    }, 0);
                                    const disponible = item.quantity - vendidoTotal;

                                    return (
                                        <div key={item.product_id} className={`stock-item ${disponible === 0 ? 'exhausted' : ''}`}>
                                            <span>{item.product_name}</span>
                                            <div className="qty-badge">
                                                <strong>{disponible}</strong> <small>und</small>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* HISTORIAL DE VISITAS (Abajo del stock) */}
                            <div className="visit-history">
                                <h5>HISTORIAL DE HOY</h5>
                                {salesSession.map((s, idx) => (
                                    <div key={idx} className="visit-card">
                                        <div className="visit-info">
                                            <strong>{s.cliente.name}</strong>
                                            <span>{s.cliente.status} - {s.hora}</span>
                                        </div>
                                        <div className="visit-amount">${s.total.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: REGISTRO DE VENTA */}
                        <div className="venta-main">
                            <div className="client-header-form">
                                <input
                                    list="clientes-list"
                                    type="text"
                                    placeholder="Buscar o escribir nombre del cliente..."
                                    className="main-input"
                                    value={clientData.name}
                                    onChange={(e) => {
                                        const val = e.target.value;

                                        // Validamos que clientesConocidos sea un array antes de usar .find()
                                        const clientes = Array.isArray(clientesConocidos) ? clientesConocidos : [];
                                        const clienteExistente = clientes.find(c => c.customer_name === val);

                                        if (clienteExistente) {
                                            setClientData({
                                                ...clientData,
                                                name: clienteExistente.customer_name,
                                                address: clienteExistente.customer_address,
                                                phone: clienteExistente.phone || "",
                                                location_type: clienteExistente.location_type || "Local",
                                                deuda_previa: clienteExistente.total_debt || 0
                                            });
                                        } else {
                                            setClientData({ ...clientData, name: val, deuda_previa: 0 });
                                        }
                                    }}
                                />
                                <datalist id="clientes-list">
                                    {Array.isArray(clientesConocidos) && clientesConocidos.map((c, i) => (
                                        <option key={i} value={c.customer_name}>
                                            {c.customer_address} (Debe: ${Number(c.total_debt).toLocaleString()})
                                        </option>
                                    ))}
                                </datalist>
                                <input
                                    type="text" placeholder="Dirección" className="main-input"
                                    value={clientData.address}
                                    onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                                />
                                <select
                                    className="status-select"
                                    value={clientData.location_type}
                                    onChange={(e) => setClientData({ ...clientData, location_type: e.target.value })}
                                >
                                    <option value="Local">Local</option>
                                    <option value="Edificio">Edificio</option>
                                    <option value="Barrio">Barrio</option>
                                    <option value="Otros">Otros</option>
                                </select>
                                <input
                                    type="text" placeholder="Teléfono" className="main-input"
                                    value={clientData.phone}
                                    onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                                />
                                <select
                                    className="status-select"
                                    value={clientData.status}
                                    onChange={(e) => setClientData({ ...clientData, status: e.target.value })}
                                    style={{
                                        border: `2px solid ${STATUS_COLORS[clientData.status] || '#ccc'}`,
                                        fontWeight: 'bold',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <option value="VISITADO">🟢 VISITADO</option>
                                    <option value="REPASO">🟡 REPASO</option>
                                    <option value="LLESO">🔴 LLESO</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="ABONO RECIBIDO / PAGO TOTAL"
                                    className="main-input"
                                    style={{ border: '2px solid #2ecc71', fontWeight: 'bold' }}
                                    value={clientData.amount_paid}
                                    onChange={(e) => setClientData({ ...clientData, amount_paid: e.target.value })}
                                />
                                {clientData.deuda_previa > 0 && (
                                    <div style={{
                                        gridColumn: '1 / -1',
                                        backgroundColor: '#fff5f5',
                                        border: '1px solid #feb2b2',
                                        color: '#c53030',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '14px'
                                    }}>
                                        <span>⚠️ <strong>Este cliente tiene una deuda anterior:</strong></span>
                                        <span style={{ fontSize: '16px', fontWeight: '800' }}>
                                            ${Number(clientData.deuda_previa).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                            </div>

                            <table className="matrix-table">
                                <thead>
                                    <tr>
                                        <th>PRODUCTO</th>
                                        <th width="100">VENDER</th>
                                        <th width="150">PRECIO UNIT.</th>
                                        <th>SUBTOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderItems.map((item, index) => {
                                        const uniqueKey = `${item.product_id}-${index}`;
                                        const vendidoTotal = salesSession.reduce((acc, sale) => {
                                            const prod = sale.items.find(i => i.product_id === item.product_id);
                                            return acc + (prod ? prod.qty : 0);
                                        }, 0);
                                        const disponible = item.quantity - vendidoTotal;

                                        return (
                                            <tr key={uniqueKey}>
                                                <td>{item.product_name}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className={`input-cell ${Number(saleQuantities[uniqueKey]) > disponible ? 'error-stock' : ''}`}
                                                        placeholder="0"
                                                        max={disponible} // BLOQUEO VISUAL
                                                        value={saleQuantities[uniqueKey] ?? ""}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            if (val > disponible) {
                                                                alertError(`Solo tienes ${disponible} en stock`);
                                                                return;
                                                            }
                                                            handleQuantityChange(uniqueKey, e.target.value, disponible);
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    <input type="number" className="input-cell price"
                                                        value={salePrices[uniqueKey] ?? ""}
                                                        onChange={(e) => handlePriceChange(uniqueKey, e.target.value)}
                                                    />
                                                </td>
                                                <td className="font-bold">
                                                    ${((Number(saleQuantities[uniqueKey]) || 0) * (Number(salePrices[uniqueKey]) || 0)).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Debajo del aviso de deuda anterior en VentasPage.jsx */}
                            <div style={{
                                gridColumn: '1 / -1',
                                marginTop: '10px',
                                padding: '15px',
                                borderRadius: '10px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>VENTA ACTUAL:</span>
                                    <span style={{ fontSize: '18px', fontWeight: '700' }}>${totalSale.toLocaleString()}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>NUEVO SALDO TOTAL:</span>
                                    <span style={{
                                        fontSize: '20px',
                                        fontWeight: '800',
                                        color: (Number(clientData.deuda_previa) + totalSale - (Number(clientData.amount_paid) || 0)) > 0 ? '#e53e3e' : '#38a169'
                                    }}>
                                        ${(
                                            Number(clientData.deuda_previa) +
                                            totalSale -
                                            (Number(clientData.amount_paid) || 0)
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="action-footer">
                                <button className="btn-add-client" onClick={registrarVentaLocal}>
                                    REGISTRAR CLIENTE Y SIGUIENTE
                                </button>

                                {/* Solo se habilita si ya hay ventas registradas */}
                                <button
                                    className="btn-finalizar-ruta"
                                    disabled={salesSession.length === 0}
                                    onClick={handleConfirmSale}
                                >
                                    FINALIZAR LIQUIDACIÓN DEL DÍA
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}