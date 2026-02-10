import { useEffect, useState, useMemo } from "react";
import { orderService } from "../services/orderService";
import { saleService } from "../services/saleService";
import { alertSuccess, alertError } from "../services/alertService";
import {
    ArrowRight,
    ChevronLeft,
    User,
    Truck,
    Clock,
    BarChart3
} from "lucide-react";

export default function VentasPage() {
    // --- ESTADOS ---
    const [pendingOrders, setPendingOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para la venta actual (por cliente)
    const [salePrices, setSalePrices] = useState({});
    const [saleQuantities, setSaleQuantities] = useState({});
    const [clientData, setClientData] = useState({
        name: "",
        address: "",
        phone: "",
        status: "VISITADO",
        location_type: "Local",
        amount_paid: ""
    });

    // Sesión de la ruta (acumulado de clientes)
    const [salesSession, setSalesSession] = useState([]);

    // Filtros y UI
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay());
    const [filtros, setFiltros] = useState({ id: "", vendedor: "", tipoCliente: "" });

    const user = JSON.parse(localStorage.getItem("user"));
    const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // --- EFECTOS ---
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
            setPendingOrders(data.filter(o => o.status === "DESPACHADO"));
        } catch (err) {
            alertError("Error", "No se pudieron cargar los despachos.");
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE FILTRADO ---
    const ordenesFiltradas = useMemo(() => {
        return pendingOrders.filter(order => {
            if (!order.created_at) return false;
            const fechaOrden = new Date(order.created_at);
            const coincideDia = fechaOrden.getDay() === diaSeleccionado;
            const coincideId = order.id.toString().includes(filtros.id);
            const coincideVendedor = order.seller_name.toLowerCase().includes(filtros.vendedor.toLowerCase());
            const coincideTipo = order.customer_type_name.toLowerCase().includes(filtros.tipoCliente.toLowerCase());
            return coincideDia && coincideId && coincideVendedor && coincideTipo;
        });
    }, [pendingOrders, diaSeleccionado, filtros]);

    const stats = useMemo(() => {
        return {
            count: ordenesFiltradas.length,
            totalValue: ordenesFiltradas.reduce((acc, o) => acc + Number(o.total_amount || 0), 0)
        };
    }, [ordenesFiltradas]);

    // --- MANEJO DE SELECCIÓN Y VENTAS ---
    const handleSelectOrder = async (order) => {
        try {
            const items = await orderService.getOrderDetail(order.id);
            setSelectedOrder(order);
            setOrderItems(items);

            const initialPrices = {};
            items.forEach((item, index) => {
                const uniqueKey = `${item.product_id}-${index}`;
                initialPrices[uniqueKey] = item.unit_price;
            });
            setSalePrices(initialPrices);
            setSaleQuantities({});
        } catch (err) {
            alertError("Error", "No se pudo cargar el detalle del despacho.");
        }
    };

    const handleQuantityChange = (uniqueKey, newValue, disponible) => {
        if (newValue === "") {
            setSaleQuantities(prev => ({ ...prev, [uniqueKey]: "" }));
            return;
        }
        const val = Number(newValue);
        if (val > disponible) {
            alertError(`Solo tienes ${disponible} en stock`);
            setSaleQuantities(prev => ({ ...prev, [uniqueKey]: disponible }));
        } else {
            setSaleQuantities(prev => ({ ...prev, [uniqueKey]: val }));
        }
    };

    const registrarVentaLocal = () => {
        if (!clientData.name) return alertError("Error", "El nombre del cliente es obligatorio");

        const itemsVendidos = orderItems.map((item, index) => {
            const key = `${item.product_id}-${index}`;
            const qty = Number(saleQuantities[key]) || 0;
            const price = Number(salePrices[key]) || 0;
            return { ...item, qty, price, total: qty * price };
        }).filter(i => i.qty > 0);

        if (itemsVendidos.length === 0 && clientData.status !== "LLESO") {
            return alertError("Error", "Debes ingresar al menos un producto o marcar como LLESO");
        }

        const totalVenta = itemsVendidos.reduce((acc, i) => acc + i.total, 0);
        const abonoEntregado = clientData.amount_paid === "" ? totalVenta : Number(clientData.amount_paid);

        const nuevaVenta = {
            cliente: { ...clientData },
            items: itemsVendidos,
            total: totalVenta,
            pagado: isNaN(abonoEntregado) ? 0 : abonoEntregado,
            hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setSalesSession([...salesSession, nuevaVenta]);
        // Reset campos
        setClientData({ name: "", address: "", phone: "", status: "VISITADO", location_type: "Local", amount_paid: "" });
        setSaleQuantities({});
    };

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
                        unit_price: i.price,
                        total_price: i.total
                    }))
                }))
            };

            await saleService.createSale(payload);
            alertSuccess("Ruta Sincronizada", "Liquidación registrada exitosamente.");
            limpiarYSalir();
            loadPendingOrders();
        } catch (err) {
            alertError("Error", "No se pudo sincronizar la liquidación.");
        } finally {
            setLoading(false);
        }
    };

    const limpiarYSalir = () => {
        setSelectedOrder(null);
        setSalesSession([]);
        setSaleQuantities({});
        setClientData({ name: "", address: "", phone: "", status: "VISITADO", location_type: "Local", amount_paid: "" });
    };

    const handleVolver = () => {
        const hayProgreso = Object.keys(saleQuantities).some(k => saleQuantities[k] > 0) || salesSession.length > 0;
        if (hayProgreso) {
            if (window.confirm("Tienes datos sin guardar. ¿Seguro que quieres salir?")) {
                limpiarYSalir();
            }
        } else {
            limpiarYSalir();
        }
    };

    // --- RENDERS AUXILIARES ---
    if (loading) return <div className="inv-page">Cargando...</div>;

    const formatFechaConDia = (fechaStr) => {
        const fecha = new Date(fechaStr);
        return fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' 
        }).toUpperCase();
    };

    return (
        <div className="inv-page full-layout">
            {!selectedOrder ? (
                /* VISTA: LISTADO DE RUTAS */
                <div className="ventas-container">
                    <div className="ventas-header">
                        <h1>{user.role === 'ADMINISTRADOR' ? 'Control de Ventas' : 'Mis Rutas de Trabajo'}</h1>
                    </div>

                    <div className="dias-selector-container">
                        {DIAS_SEMANA.map((dia, index) => (
                            <button
                                key={dia}
                                onClick={() => setDiaSeleccionado(index)}
                                className={`btn-dia ${diaSeleccionado === index ? 'active' : ''}`}
                            >
                                {dia}
                            </button>
                        ))}
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card blue-border">
                            <Clock size={24} />
                            <div className="stat-info">
                                <span className="label">Rutas</span>
                                <h2 className="value">{stats.count}</h2>
                            </div>
                        </div>
                        <div className="stat-card green-border">
                            <BarChart3 size={24} />
                            <div className="stat-info">
                                <span className="label">Total Estimado</span>
                                <h2 className="value">${stats.totalValue.toLocaleString()}</h2>
                            </div>
                        </div>
                    </div>

                    <div className="table-wrapper">
                        {/* Filtros aquí... */}
                        <table className="ventas-table">
                            <thead>
                                <tr style={{ background: '#be2b48', color: 'white' }}>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    {user.role === 'ADMINISTRADOR' && <th>Vendedor</th>}
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                    <th style={{ textAlign: 'center' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordenesFiltradas.map(o => (
                                    <tr key={o.id}>
                                        <td><span className="badge-id">#{o.id}</span></td>
                                        <td>{formatFechaConDia(o.created_at)}</td>
                                        {user.role === 'ADMINISTRADOR' && <td>{o.seller_name}</td>}
                                        <td className="text-right font-bold">${Number(o.total_amount).toLocaleString()}</td>
                                        <td className="text-center">
                                            <button className="btn-action-outline" onClick={() => handleSelectOrder(o)}>
                                                Hacer Venta <ArrowRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* VISTA: LIQUIDACIÓN DE RUTA (DETALLE) */
                <div className="order-details-container">
                    <button onClick={handleVolver} className="btn-back-list">
                        <ChevronLeft size={20} /> Volver a mis rutas
                    </button>

                    <div className="vendedores-layout">
                        {/* Sidebar: Stock en Camión */}
                        <div className="camion-sidebar">
                            <h4><Truck size={20} /> STOCK DISPONIBLE</h4>
                            <div className="stock-list">
                                {orderItems.map(item => {
                                    const vendido = salesSession.reduce((acc, sale) => {
                                        const prod = sale.items.find(i => i.product_id === item.product_id);
                                        return acc + (prod ? prod.qty : 0);
                                    }, 0);
                                    const disponible = item.quantity - vendido;
                                    return (
                                        <div key={item.product_id} className={`stock-item ${disponible === 0 ? 'exhausted' : ''}`}>
                                            <span>{item.product_name}</span>
                                            <div className="qty-badge"><strong>{disponible}</strong></div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="visit-history">
                                <h5>HISTORIAL DE HOY ({salesSession.length})</h5>
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

                        {/* Formulario de Venta */}
                        <div className="venta-main">
                            <div className="client-header-form">
                                <input type="text" placeholder="Cliente" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} className="main-input" />
                                <input type="text" placeholder="Dirección" value={clientData.address} onChange={e => setClientData({...clientData, address: e.target.value})} className="main-input" />
                                <select value={clientData.status} onChange={e => setClientData({...clientData, status: e.target.value})} className="status-select">
                                    <option value="VISITADO">VISITADO</option>
                                    <option value="REPASO">REPASO</option>
                                    <option value="LLESO">LLESO</option>
                                </select>
                                <input type="number" placeholder="Abonó $" value={clientData.amount_paid} onChange={e => setClientData({...clientData, amount_paid: e.target.value})} className="main-input highlight-money" />
                            </div>

                            <table className="matrix-table">
                                <thead>
                                    <tr>
                                        <th>PRODUCTO</th>
                                        <th width="100">CANT.</th>
                                        <th width="120">PRECIO</th>
                                        <th>TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderItems.map((item, index) => {
                                        const key = `${item.product_id}-${index}`;
                                        const vendido = salesSession.reduce((acc, s) => acc + (s.items.find(i => i.product_id === item.product_id)?.qty || 0), 0);
                                        const disponible = item.quantity - vendido;

                                        return (
                                            <tr key={key}>
                                                <td>{item.product_name}</td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={saleQuantities[key] ?? ""} 
                                                        onChange={e => handleQuantityChange(key, e.target.value, disponible)}
                                                        className="input-cell"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        value={salePrices[key] ?? ""} 
                                                        onChange={e => setSalePrices({...salePrices, [key]: e.target.value})}
                                                        className="input-cell"
                                                    />
                                                </td>
                                                <td className="font-bold">
                                                    ${((Number(saleQuantities[key]) || 0) * (Number(salePrices[key]) || 0)).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="action-footer">
                                <button className="btn-add-client" onClick={registrarVentaLocal}>
                                    REGISTRAR CLIENTE Y SIGUIENTE
                                </button>
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