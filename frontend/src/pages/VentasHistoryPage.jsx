import { useEffect, useState, useMemo } from "react";
import { saleService } from "../services/saleService";
import { alertError } from "../services/alertService";
import {
    ShoppingBag,
    User,
    Calendar,
    DollarSign,
    Search,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    ArrowUpRight
} from "lucide-react";

export default function VentasHistoryPage() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async () => {
        try {
            setLoading(true);
            const allSales = await saleService.getSalesHistory();

            if (user.role === "ADMINISTRADOR") {
                setSales(allSales);
            } else {
                const filtered = allSales.filter(s =>
                    s.seller_name?.trim().toLowerCase() === user.name?.trim().toLowerCase()
                );
                setSales(filtered);
            }
        } catch (err) {
            alertError("Error", "No se pudo cargar el historial de ventas.");
        } finally {
            setLoading(false);
        }
    };

    // --- CÁLCULO DE MÉTRICAS DEL HISTORIAL ---
    const stats = useMemo(() => {
        const totalSalesCount = sales.length;
        const totalRevenue = sales.reduce((acc, s) => acc + Number(s.amount_paid || 0), 0);
        const totalPending = sales.reduce((acc, s) => acc + Number(s.balance_due || 0), 0);

        return { totalSalesCount, totalRevenue, totalPending };
    }, [sales]);

    const filteredSales = sales.filter(s =>
        s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toString().includes(searchTerm)
    );

    if (loading) return <div className="inv-page">Cargando historial de ventas...</div>;

    return (
        <div className="inv-page full-layout">
            <div className="module-intro" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#10b981', color: 'white', padding: '12px', borderRadius: '12px' }}>
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Historial de Ventas</h1>
                        <p style={{ margin: 0, opacity: 0.8 }}>Registro detallado de ingresos y saldos pendientes</p>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE MÉTRICAS PROFESIONALES */}
            <div className="inventory-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                <div className="stat-card" style={{ borderLeft: '5px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label" style={{ color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>RECAUDO REALIZADO</span>
                            <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>${stats.totalRevenue.toLocaleString()}</h2>
                        </div>
                        <div style={{ background: '#dcfce7', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                            <CheckCircle size={22} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpRight size={14} /> <span>Dinero ingresado</span>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '5px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label" style={{ color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>POR COBRAR (SALDOS)</span>
                            <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>${stats.totalPending.toLocaleString()}</h2>
                        </div>
                        <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '10px' }}>
                            <AlertCircle size={22} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '10px' }}>
                        Saldos pendientes de clientes
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '5px solid #6366f1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label" style={{ color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>VENTAS TOTALES</span>
                            <h2 className="stat-value" style={{ fontSize: '2rem', margin: '5px 0' }}>{stats.totalSalesCount}</h2>
                        </div>
                        <div style={{ background: '#e0e7ff', color: '#6366f1', padding: '10px', borderRadius: '10px' }}>
                            <ShoppingBag size={22} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>
                        Operaciones liquidadas
                    </div>
                </div>
            </div>

            {/* TABLA DE VENTAS */}
            <div className="inv-card" style={{ border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="search-box" style={{ maxWidth: '400px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Search size={18} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente o ID de venta..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Fecha</th>
                                <th>Dirección</th>
                                <th>Nombre Cliente</th>
                                <th>Nombre Vendedor</th>
                                <th>Total Compra</th>
                                <th>Total</th>
                                <th>DEBE</th>
                                <th>Abono</th>
                                <th>Teléfono</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map((s) => (
                                <tr key={s.id}>
                                    {/* id */}
                                    <td>#{s.id}</td>

                                    {/* Fecha: created_at */}
                                    <td>{new Date(s.created_at).toLocaleDateString()}</td>

                                    {/* Dirección: address */}
                                    <td>{s.address}</td>

                                    {/* Nombre cliente: name */}
                                    <td style={{ fontWeight: '600' }}>{s.name}</td>

                                    {/* Nombre vendedor: seller_name */}
                                    <td>{s.seller_name}</td>

                                    {/* total compra: total_amount */}
                                    <td style={{ textAlign: 'right' }}>
                                        ${Number(s.total_amount).toLocaleString()}
                                    </td>

                                    {/* Total: balance_due (Saldo en ese momento) */}
                                    <td style={{ textAlign: 'right', backgroundColor: '#f8fafc' }}>
                                        ${Number(s.balance_due).toLocaleString()}
                                    </td>

                                    {/* DEBE: total_debt (Deuda global hoy) */}
                                    <td style={{
                                        textAlign: 'right',
                                        fontWeight: '800',
                                        color: s.total_debt > 0 ? '#e53e3e' : '#38a169'
                                    }}>
                                        ${Number(s.total_debt || 0).toLocaleString()}
                                    </td>

                                    {/* Abono: credit_amount */}
                                    <td style={{ textAlign: 'right', color: '#3182ce', fontWeight: 'bold' }}>
                                        ${Number(s.credit_amount || 0).toLocaleString()}
                                    </td>

                                    {/* Teléfono: phone */}
                                    <td>{s.phone}</td>

                                    {/* estado: visit_status */}
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`status-badge ${s.visit_status?.toLowerCase()}`}>
                                            {s.visit_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredSales.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <ShoppingBag size={48} color="#e2e8f0" style={{ marginBottom: '10px' }} />
                        <p style={{ color: '#64748b' }}>No se encontraron registros de ventas.</p>
                    </div>
                )}
            </div>
        </div>
    );
}