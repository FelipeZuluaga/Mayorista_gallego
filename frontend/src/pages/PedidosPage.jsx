import { useEffect, useState, useMemo } from "react";
import { orderService } from "../services/orderService";
import { alertError } from "../services/alertService";
import {
    ClipboardList, Search, DollarSign, ShoppingBag,
    Users, Calendar, User as UserIcon, X, Eye, Clock, Package, TrendingUp
} from "lucide-react";
import "../styles/inventory.css";

export default function PedidosPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await orderService.getOrdersHistory(user);
            setOrders(data || []);
        } catch (err) { alertError("Error", "No se pudieron cargar los pedidos."); }
        finally { setLoading(false); }
    };

    const handleViewDetail = async (order) => {
        setSelectedOrder(order);
        setLoadingDetail(true);
        try {
            const res = await orderService.getOrderDetail(order.id);
            setOrderItems(res);
        } catch (err) { alertError("Error", "No se pudo cargar el detalle."); }
        finally { setLoadingDetail(false); }
    };

    // --- CÁLCULO DE MÉTRICAS ---
    const stats = useMemo(() => {
        const total = orders.length;
        const totalMoney = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
        const pending = orders.filter(o => o.status === 'PENDIENTE' || o.status === 'DESPACHADO').length;
        const uniqueSellers = new Set(orders.map(o => o.seller_name)).size;
        return { total, totalMoney, pending, uniqueSellers };
    }, [orders]);

    const filteredOrders = orders.filter(o =>
        o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toString().includes(searchTerm)
    );

    if (loading) return <div className="inv-page">Cargando panel de control...</div>;

    return (
        <div className="inv-page full-layout">
            <div className="module-intro" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '12px' }}>
                        <ClipboardList size={28} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Panel de Pedidos</h1>
                        <p style={{ margin: 0, opacity: 0.8 }}>Monitoreo de actividad y recaudación en tiempo real</p>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE MÉTRICAS PROFESIONALES */}
            <div className="inventory-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                
                <div className="stat-card" style={{ borderLeft: '5px solid #6366f1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label" style={{ color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>TOTAL ÓRDENES</span>
                            <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>{stats.total}</h2>
                        </div>
                        <div style={{ background: '#e0e7ff', color: '#6366f1', padding: '10px', borderRadius: '10px' }}>
                            <ShoppingBag size={22} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingUp size={14} /> <span>Pedidos registrados</span>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '5px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label" style={{ color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>VOLUMEN VENTAS</span>
                            <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>${stats.totalMoney.toLocaleString()}</h2>
                        </div>
                        <div style={{ background: '#dcfce7', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                            <DollarSign size={22} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>
                        Ingresos proyectados
                    </div>
                </div>

                {user.role === "ADMINISTRADOR" ? (
                    <div className="stat-card" style={{ borderLeft: '5px solid #f59e0b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <span className="stat-label" style={{ color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>FUERZA VENTAS</span>
                                <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>{stats.uniqueSellers}</h2>
                            </div>
                            <div style={{ background: '#fef3c7', color: '#f59e0b', padding: '10px', borderRadius: '10px' }}>
                                <Users size={22} />
                            </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>
                            Vendedores activos
                        </div>
                    </div>
                ) : (
                    <div className="stat-card" style={{ borderLeft: '5px solid #ef4444' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <span className="stat-label" style={{ color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>POR LIQUIDAR</span>
                                <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>{stats.pending}</h2>
                            </div>
                            <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '10px' }}>
                                <Clock size={22} />
                            </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '10px' }}>
                            Atención requerida
                        </div>
                    </div>
                )}
            </div>

            {/* TABLA REESTILIZADA */}
            <div className="inv-card" style={{ border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="search-box" style={{ maxWidth: '400px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Search size={18} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Buscar cliente, ID o estado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="inv-table">
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>ID Pedido</th>
                                <th style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Fecha Registro</th>
                                <th style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Cliente</th>
                                {user.role === "ADMINISTRADOR" && <th style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Vendedor</th>}
                                <th style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
                                <th style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Estado</th>
                                <th style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Gestión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(o => (
                                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td className="font-bold" style={{ color: '#6366f1' }}>#{o.id}</td>
                                    <td style={{ color: '#64748b' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: '500' }}>{o.customer_name}</td>
                                    {user.role === "ADMINISTRADOR" && <td>{o.seller_name}</td>}
                                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                                        ${Number(o.total_amount).toLocaleString()}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: o.status === 'PAGADO' ? '#dcfce7' : '#fee2e2',
                                            color: o.status === 'PAGADO' ? '#15803d' : '#b91c1c'
                                        }}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button 
                                            className="btn-edit" 
                                            onClick={() => handleViewDetail(o)}
                                            style={{ padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                        >
                                            <Eye size={14} /> Detalles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DETALLE (Simplificado y Moderno) */}
            {selectedOrder && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ borderRadius: '16px', maxWidth: '800px' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <h2>Orden de Despacho #{selectedOrder.id}</h2>
                            <button className="close-btn" onClick={() => setSelectedOrder(null)}><X /></button>
                        </div>
                        
                        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', margin: '20px', borderRadius: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Cliente</label>
                                <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedOrder.customer_name}</span>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Vendedor Responsable</label>
                                <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedOrder.seller_name}</span>
                            </div>
                        </div>

                        <div style={{ padding: '0 20px 20px' }}>
                            <table className="inv-table">
                                <thead style={{ background: '#fff' }}>
                                    <tr>
                                        <th>Producto</th>
                                        <th style={{ textAlign: 'center' }}>Cant.</th>
                                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.product_name}</td>
                                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '600' }}>${Number(item.total_price).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '20px', textAlign: 'right', paddingTop: '20px', borderTop: '2px solid #f1f5f9' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>Total: ${Number(selectedOrder.total_amount).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}