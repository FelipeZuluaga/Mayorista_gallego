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
import "../styles/inventory.css";

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

    if (loading) return <div className="inv-page">Cargando despachos...</div>;

    return (
        <div className="inv-page full-layout">
            <div className="module-intro" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '12px' }}>
                        <Truck size={28} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Liquidación de Despachos</h1>
                        <p style={{ margin: 0, opacity: 0.8 }}>Gestione el cobro final de mercancía entregada</p>
                    </div>
                </div>
            </div>

            {!selectedOrder ? (
                <>
                    {/* TARJETAS DE MÉTRICAS */}
                    <div className="inventory-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div className="stat-card" style={{ borderLeft: '5px solid #3b82f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <span className="stat-label" style={{ color: '#64748b', fontWeight: '600' }}>DESPACHOS PENDIENTES</span>
                                    <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>{stats.count}</h2>
                                </div>
                                <div style={{ background: '#dbeafe', color: '#3b82f6', padding: '10px', borderRadius: '10px' }}>
                                    <Clock size={24} />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>Órdenes listas para facturar</p>
                        </div>

                        <div className="stat-card" style={{ borderLeft: '5px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <span className="stat-label" style={{ color: '#64748b', fontWeight: '600' }}>VALOR POR RECAUDAR</span>
                                    <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>${stats.totalValue.toLocaleString()}</h2>
                                </div>
                                <div style={{ background: '#dcfce7', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                                    <BarChart3 size={24} />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>Monto total de mercancía en calle</p>
                        </div>
                    </div>

                    <div className="inv-card full-width-card" style={{ border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0 }}>Listado de Despachos en Ruta</h3>
                        </div>
                        <table className="inv-table">
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
                                        <td className="font-bold" style={{ color: '#3b82f6' }}>#{o.id}</td>
                                        {user.role === 'ADMINISTRADOR' && <td>{o.seller_name}</td>}
                                        <td style={{ fontWeight: '500' }}>{o.customer_name}</td>
                                        <td className="col-total" style={{ textAlign: 'right', fontWeight: '700' }}>
                                            ${Number(o.total_amount).toLocaleString()}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn-edit" onClick={() => handleSelectOrder(o)} style={{ gap: '8px' }}>
                                                Liquidar <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="inv-card full-width-card">
                    <button onClick={() => setSelectedOrder(null)} className="btn-edit" style={{ marginBottom: '20px', background: '#f1f5f9', color: '#1e293b' }}>
                        <ChevronLeft size={16} /> Volver a la lista
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', marginBottom: '20px' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Cliente</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{selectedOrder.customer_name}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Vendedor Responsable</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{selectedOrder.seller_name}</div>
                        </div>
                    </div>

                    <table className="inv-table">
                        <thead>
                            <tr style={{ background: '#1e293b', color: '#fff' }}>
                                <th>Producto / Precio Base</th>
                                <th style={{ textAlign: 'center' }}>Cant. Vendida</th>
                                <th style={{ textAlign: 'right' }}>Precio Venta Final</th>
                                <th style={{ textAlign: 'right' }}>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderItems.map((item, index) => {
                                const uniqueKey = `${item.product_id}-${index}`;
                                return (
                                    <tr key={uniqueKey}>
                                        <td>
                                            <div className="font-bold">{item.product_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Base: ${item.unit_price} | Despachado: {item.quantity}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                className="qty-input"
                                                style={{ width: '80px', textAlign: 'center' }}
                                                value={saleQuantities[uniqueKey] ?? ""}
                                                onChange={(e) => handleQuantityChange(uniqueKey, e.target.value, item.quantity)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="qty-input"
                                                style={{ width: '130px', textAlign: 'right', border: '1px solid #3b82f6', fontWeight: 'bold' }}
                                                value={salePrices[uniqueKey] ?? ""}
                                                onChange={(e) => handlePriceChange(uniqueKey, e.target.value)}
                                                onBlur={(e) => {
                                                    if (Number(e.target.value) < item.unit_price) {
                                                        alertError("Precio mínimo", `El precio base es $${item.unit_price}`);
                                                        handlePriceChange(uniqueKey, item.unit_price);
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="col-total" style={{ textAlign: 'right', fontWeight: '700' }}>
                                            ${((Number(saleQuantities[uniqueKey]) || 0) * (Number(salePrices[uniqueKey]) || 0)).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="inv-card" style={{ marginTop: '30px', padding: '30px', background: '#f8fafc', borderTop: '4px solid #3b82f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '50px', flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>TOTAL VENTA</span>
                                <h2 style={{ margin: 0, fontSize: '2rem' }}>${totalSale.toLocaleString()}</h2>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '700' }}>EFECTIVO RECIBIDO</span>
                                <input
                                    type="number"
                                    className="qty-input"
                                    style={{ fontSize: '1.5rem', width: '200px', textAlign: 'right', border: '2px solid #3b82f6' }}
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                                />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.85rem', color: balanceDue > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                                    {balanceDue > 0 ? 'SALDO PENDIENTE' : 'PAGADO'}
                                </span>
                                <h2 style={{ margin: 0, fontSize: '2rem', color: balanceDue > 0 ? '#ef4444' : '#10b981' }}>
                                    ${Math.abs(balanceDue).toLocaleString()}
                                </h2>
                            </div>
                        </div>
                        <div style={{ marginTop: '30px', textAlign: 'right' }}>
                            <button className="btn-save" onClick={handleConfirmSale} style={{ padding: '15px 50px', fontSize: '1.2rem' }}>
                                Finalizar Liquidación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}