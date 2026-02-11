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
import "../styles/ventas.css";

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
    // Aquí aplicamos todos los filtros combinados
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

    // Funciones para manejar la selección de orden, cambios en precios/cantidades, y confirmación de venta
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
    // Funciones para manejar cambios en precios y cantidades, con validaciones
    const handlePriceChange = (uniqueKey, newValue) => {
        const val = newValue === "" ? "" : Number(newValue);
        setSalePrices(prev => ({ ...prev, [uniqueKey]: val }));
    };
    // Función para manejar cambios en cantidades, con validación de stock
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
    // Cálculo del total de la venta actual y el saldo pendiente
    const totalSale = useMemo(() => {
        return orderItems.reduce((acc, item, index) => {
            const uniqueKey = `${item.product_id}-${index}`;
            const qty = Number(saleQuantities[uniqueKey]) || 0;
            const price = Number(salePrices[uniqueKey]) || 0;
            return acc + (qty * price);
        }, 0);
    }, [salePrices, saleQuantities, orderItems]);

    //const balanceDue = totalSale - amountPaid;

    //º Función para confirmar la venta y enviar los datos al backend
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
                    amount_paid: v.pago_venta,   // CORREGIDO: antes decía pago_compra
                    credit_amount: v.abono_deuda, // CORREGIDO: coincide con registrarVentaLocal

                    items: v.items.map(i => ({
                        product_id: i.product_id,
                        product_name: i.product_name,
                        quantity: i.qty,
                        unit_price: i.price,
                        total_price: i.total_price
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

    // Nuevo estado para manejar los datos del cliente que se va a registrar en cada venta
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

    // Función para registrar la venta localmente antes de confirmar con el backend
    const registrarVentaLocal = () => {
        if (!clientData.name.trim()) return alertError("Error", "Nombre de cliente requerido");

        // 1. CAPTURA CORRECTA: Leer 'amount_paid' y 'credit_amount' (que es lo que viene de los inputs)
        const pagoDeVentaHoy = Number(clientData.amount_paid) || 0;
        const abonoADeudaVieja = Number(clientData.credit_amount) || 0;

        const totalVentaHoy = orderItems.reduce((acc, item, index) => {
            const key = `${item.product_id}-${index}`;
            const qty = Number(saleQuantities[key]) || 0;
            const price = Number(salePrices[key]) || 0;
            return acc + (qty * price);
        }, 0);

        const totalDineroEntregado = pagoDeVentaHoy + abonoADeudaVieja;
        const nuevoSaldoCalculado = (Number(clientData.deuda_previa) + totalVentaHoy) - totalDineroEntregado;

        const nuevaVenta = {
            cliente: { ...clientData },
            items: orderItems.map((item, index) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                qty: Number(saleQuantities[`${item.product_id}-${index}`]) || 0,
                price: Number(salePrices[`${item.product_id}-${index}`]) || 0,
                total_price: (Number(saleQuantities[`${item.product_id}-${index}`]) || 0) * (Number(salePrices[`${item.product_id}-${index}`]) || 0)
            })).filter(i => i.qty > 0 || totalVentaHoy === 0),

            total: totalVentaHoy,
            pago_venta: pagoDeVentaHoy,    // Guardamos con este nombre
            abono_deuda: abonoADeudaVieja, // Guardamos con este nombre
            nuevo_saldo: nuevoSaldoCalculado,
            hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setSalesSession([...salesSession, nuevaVenta]);

        // Limpiar campos (importante limpiar credit_amount)
        setClientData({
            name: "", address: "", phone: "",
            status: "REPASO", location_type: "Local",
            amount_paid: "", credit_amount: "",
            deuda_previa: 0
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
        <div>
            {!selectedOrder ? (
                <div>
                    {/* --- PRIMERA PARTE TITULOS --- */}
                    <div>
                        <h1>
                            {user.role === 'ADMINISTRADOR' ? 'Control de Ventas' : 'Mis Rutas de Trabajo'}
                        </h1>
                        <p className="text-muted">
                            {user.role === 'ADMINISTRADOR' ? 'Gestión global de ventas y vendedores' : 'Listado de entregas para hoy'}
                        </p>
                    </div>
                    {/* --- TEMA DE LOS DIAS --- */}
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
                    {/* --- METRICAS Y DEMAS --- */}
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
                        <div className="filters-row">
                            {/* Filtro 1: Buscar ID */}
                            <div className="filter-group">
                                <label className="label-filtro">Buscar ID</label>
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
                                    {/* Filtro 2: Vendedor */}
                                    <div className="filter-group">
                                        <label className="label-filtro">Vendedor</label>
                                        <input
                                            type="text"
                                            placeholder="Nombre..."
                                            className="main-input"
                                            value={filtros.vendedor}
                                            onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })}
                                        />
                                    </div>

                                    {/* Filtro 3: Tipo Cliente */}
                                    <div className="filter-group">
                                        <label className="label-filtro">Tipo Cliente</label>
                                        <select
                                            className="status-select"
                                            value={filtros.tipoCliente}
                                            onChange={(e) => setFiltros({ ...filtros, tipoCliente: e.target.value })}
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

                            {/* Botón: Limpiar */}
                            <button
                                onClick={() => setFiltros({ id: "", vendedor: "", tipoCliente: "" })}
                                className="btn-clear-filters"
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
                                    <tr className="tr-table">
                                        <th>ID</th>
                                        <th>Fecha</th>
                                        {user.role === 'ADMINISTRADOR'
                                            && <th>Nombre de vendedor</th>
                                        }
                                        {user.role === 'ADMINISTRADOR'
                                            && <th>Tipo Cliente</th>
                                        }
                                        <th className="th-table-center">Total Estimado</th>
                                        <th className="th-table-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordenesFiltradas.length > 0 ? (
                                        ordenesFiltradas.map(o => (
                                            <tr key={o.id}>

                                                <td><span className="badge-id">#{o.id}</span></td>

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
                                                    <button className="btn-main" onClick={() => handleSelectOrder(o)}>
                                                        Hacer Venta <ArrowRight size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={user.role === 'ADMINISTRADOR' ? 5 : 4} className="text-table-not-found">
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
                    {/* --- BOTON DE VOLVER A MIS RUTAS --- */}
                    <div style={{ marginBottom: '15px' }}>
                        <button
                            onClick={handleVolver}
                            className="btn-back-list"
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
                        <div>
                            <div className="client-header-form">
                                {/* FILA 1: Nombre y Dirección */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <input
                                            list="clientes-list"
                                            type="text"
                                            placeholder="NOMBRE"
                                            className="custom-input"
                                            value={clientData.name}
                                            onChange={(e) => {
                                                const val = e.target.value;
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
                                                <option key={i} value={c.customer_name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div className="form-group">
                                        <input
                                            type="text"
                                            placeholder="Dirección"
                                            className="custom-input"
                                            value={clientData.address}
                                            onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* FILA 2: Tipo, Teléfono y Estado */}
                                <div className="form-row three-cols">
                                    <select
                                        className="custom-select"
                                        value={clientData.location_type}
                                        onChange={(e) => setClientData({ ...clientData, location_type: e.target.value })}
                                    >
                                        <option value="Local">🏠 Local</option>
                                        <option value="Edificio">🏢 Edificio</option>
                                        <option value="Barrio">🏘️ Barrio</option>
                                        <option value="Otros">📍 Otros</option>
                                    </select>

                                    <input
                                        type="text"
                                        placeholder="Teléfono"
                                        className="custom-input"
                                        value={clientData.phone}
                                        onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                                    />

                                    <select
                                        className="custom-select"
                                        value={clientData.status}
                                        onChange={(e) => setClientData({ ...clientData, status: e.target.value })}
                                    >
                                        <option value="VISITADO">🟢 VISITADO</option>
                                        <option value="REPASO">🟡 REPASO</option>
                                        <option value="LLESO">🔴 LLESO</option>
                                    </select>
                                </div>

                                {/* FILA 3: Pagos (Destacados) */}
                                <div className="form-row payments-row">
                                    <input
                                        type="number"
                                        placeholder="PAGO DE COMPRA"
                                        className="payment-input buy"
                                        value={clientData.amount_paid}
                                        onChange={(e) => setClientData({ ...clientData, amount_paid: e.target.value })}
                                    />

                                    <input
                                        type="number"
                                        placeholder="ABONO"
                                        className="payment-input credit"
                                        value={clientData.credit_amount}
                                        onChange={(e) => setClientData({ ...clientData, credit_amount: e.target.value })}
                                    />
                                </div>

                                {/* Alerta de Deuda */}
                                {clientData.deuda_previa > 0 && (
                                    <div className="debt-alert">
                                        <span>⚠️ <strong>Deuda anterior:</strong></span>
                                        <span className="debt-amount">
                                            ${Number(clientData.deuda_previa).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="table-container">
                                <table className="matrix-table">
                                    <thead>
                                        <tr>
                                            <th>PRODUCTO</th>
                                            <th width="100">P.BASE</th> {/* Columna estática */}
                                            <th className="text-center">VENDER</th>
                                            <th className="text-center">PRECIO UNIT.</th>
                                            <th className="text-right">SUBTOTAL</th>
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
                                                    <td className="product-name-cell">
                                                        {item.product_name}
                                                        <small className="stock-info">Disp: {disponible}</small>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="price-ref-tag">
                                                            {/* Usamos Number(item.price || 0) para asegurar que siempre sea un número */}
                                                            ${salePrices[uniqueKey] || ""}

                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="input-wrapper">
                                                            <input
                                                                type="number"
                                                                className={`input-cell ${Number(saleQuantities[uniqueKey]) > disponible ? 'error-stock' : ''}`}
                                                                placeholder="0"
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
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="input-wrapper">
                                                            <input
                                                                type="number"
                                                                className="input-cell price-input"
                                                                value={salePrices[uniqueKey] ?? ""}
                                                                onChange={(e) => handlePriceChange(uniqueKey, e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="text-right subtotal-cell">
                                                        ${((Number(saleQuantities[uniqueKey]) || 0) * (Number(salePrices[uniqueKey]) || 0)).toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

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
                                        color: (Number(clientData.deuda_previa) + totalSale - (Number(clientData.amount_paid) || 0) - (Number(clientData.credit_amount) || 0)) > 0 ? '#e53e3e' : '#38a169'
                                    }}>
                                        ${(
                                            Number(clientData.deuda_previa) +
                                            totalSale -
                                            (Number(clientData.amount_paid) || 0) -
                                            (Number(clientData.credit_amount) || 0) // Restamos el abono para ver el saldo real
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="action-footer">
                                <button className="btn-add-client" onClick={registrarVentaLocal}>
                                    REGISTRAR CLIENTE - REGISTRAR COMPRA - REGISTRAR ABONO
                                </button>

                                {/* Solo se habilita si ya hay ventas registradas */}
                                <button
                                    className="btn-finalizar-ruta"
                                    disabled={salesSession.length === 0}
                                    onClick={handleConfirmSale}
                                >
                                    FINALIZAR RUTA - APLICAR VENTAS AL CLIENTE
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}