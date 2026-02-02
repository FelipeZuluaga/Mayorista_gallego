import { useEffect, useState, useMemo } from "react";
import { orderService } from "../services/orderService";
import { saleService } from "../services/saleService";
import { alertSuccess, alertError } from "../services/alertService";
import {
    DollarSign,
    ArrowRight,
    ChevronLeft,
    User,
    Package,
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

    const user = JSON.parse(localStorage.getItem("user"));

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

    // --- ESTADÍSTICAS PARA EL DASHBOARD DE LIQUIDACIÓN ---
    const stats = useMemo(() => {
        const count = pendingOrders.length;
        const totalValue = pendingOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
        return { count, totalValue };
    }, [pendingOrders]);

    const handleSelectOrder = async (order) => {
        try {
            const items = await orderService.getOrderDetail(order.id);
            setSelectedOrder(order);
            setOrderItems(items);

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
        for (let i = 0; i < orderItems.length; i++) {
            const item = orderItems[i];
            const uniqueKey = `${item.product_id}-${i}`;
            const currentPrice = Number(salePrices[uniqueKey]);
            if (currentPrice < item.unit_price) {
                alertError("Precio Insuficiente", `${item.product_name} no puede venderse bajo costo base.`);
                return;
            }
        }

        const saleData = {
            order_id: selectedOrder.id,
            seller_name: selectedOrder.seller_name.trim(),
            customer_name: selectedOrder.customer_name,
            total_amount: totalSale,
            amount_paid: amountPaid,
            items: orderItems.map((item, index) => {
                const uniqueKey = `${item.product_id}-${index}`;
                return {
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: Number(saleQuantities[uniqueKey]),
                    unit_price: Number(salePrices[uniqueKey]),
                    total_price: Number(saleQuantities[uniqueKey]) * Number(salePrices[uniqueKey])
                };
            })
        };

        try {
            await saleService.createSale(saleData);
            alertSuccess("Completado", "Venta liquidada con éxito.");
            setSelectedOrder(null);
            loadPendingOrders();
        } catch (err) {
            alertError("Error", "Error al procesar la liquidación.");
        }
    };
    // Estados adicionales
    const [clientData, setClientData] = useState({ name: "", address: "", phone: "", status: "VISITADO" });
    const [salesSession, setSalesSession] = useState([]); // Historial de la ruta actual

    const registrarVentaLocal = () => {
        // 1. Validaciones básicas
        if (!clientData.name) return alertError("El nombre del cliente es obligatorio");

        // 2. Crear el objeto de items vendidos en esta parada
        const itemsVendidos = orderItems.map((item, index) => {
            const key = `${item.product_id}-${index}`;
            const qty = Number(saleQuantities[key]) || 0;
            const price = Number(salePrices[key]) || 0;
            return { ...item, qty, price, total: qty * price };
        }).filter(i => i.qty > 0);

        if (itemsVendidos.length === 0 && clientData.status === "VISITADO") {
            return alertError("No has ingresado productos para vender");
        }

        // 3. Guardar en la lista temporal de la sesión
        const nuevaVenta = {
            cliente: { ...clientData },
            items: itemsVendidos,
            total: itemsVendidos.reduce((acc, i) => acc + i.total, 0),
            hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setSalesSession([...salesSession, nuevaVenta]);

        // 4. Limpiar formulario para el siguiente cliente
        setClientData({ name: "", address: "", phone: "", status: "VISITADO" });
        setSaleQuantities({});
        alertSuccess(`Registro de ${nuevaVenta.cliente.name} guardado`);
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

    return (
        <div className="inv-page full-layout">


            {!selectedOrder ? (
                <div className="ventas-container">
                    <div className="ventas-header">
                        <h1>{user.role === 'ADMINISTRADOR' ? 'Control de Despachos' : 'Mis Rutas de Trabajo'}</h1>
                        <p className="text-muted">
                            {user.role === 'ADMINISTRADOR' ? 'Gestión global de ventas y vendedores' : 'Listado de entregas para hoy'}
                        </p>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card blue-border">
                            <div className="stat-icon blue-bg"><Clock size={24} /></div>
                            <div className="stat-info">
                                <span className="label">{user.role === 'ADMINISTRADOR' ? 'Despachos Activos' : 'Pendientes'}</span>
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
                        <div className="table-title">
                            <h3>{user.role === 'ADMINISTRADOR' ? 'Listado General de Vendedores' : 'Rutas Asignadas'}</h3>
                        </div>
                        <div className="responsive-container">
                            <table className="ventas-table">
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th>ID</th>
                                        {user.role === 'ADMINISTRADOR' && <th>Vendedor</th>}
                                        <th>Cliente</th>
                                        <th style={{ textAlign: 'right' }}>Total Estimado</th>
                                        <th style={{ textAlign: 'center' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingOrders.map(o => (
                                        <tr key={o.id}>
                                            <td><span className="badge-id">#{o.id}</span></td>
                                            <td className="text-muted">
                                                {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            {user.role === 'ADMINISTRADOR' && (
                                                <td className="seller-cell">
                                                    <div className="user-avatar-mini">
                                                        <User size={14} /> <span>{o.seller_name}</span>
                                                    </div>
                                                </td>
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
                                    ))}
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
                                    type="text" placeholder="Nombre del Cliente" className="main-input"
                                    value={clientData.name} onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                                />
                                <input
                                    type="text" placeholder="Dirección" className="main-input"
                                    value={clientData.address} onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                                />
                                <input
                                    type="text" placeholder="Teléfono" className="main-input"
                                    value={clientData.phone} onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                                />
                                <select
                                    className="status-select"
                                    value={clientData.status} onChange={(e) => setClientData({ ...clientData, status: e.target.value })}
                                >
                                    <option value="VISITADO">VISITADO (Venta)</option>
                                    <option value="NO VISITADO">NO VISITADO (Cerrado/No estaba)</option>
                                </select>
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