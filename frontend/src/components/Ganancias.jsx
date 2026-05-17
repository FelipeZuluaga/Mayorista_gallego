import React, { useState, useEffect } from 'react';
import { saleService } from '../services/saleService';
import { ClipboardList } from 'lucide-react'; // Ajustado a los iconos reales en uso

export default function Ganancias({ user, canManage, handleViewDetail, handleOpenEdit, handleDeleteOrder, formatFechaConDia }) {
    const [vendedores, setVendedores] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [filters, setFilters] = useState({
        fecha: "",
        tipoCliente: "",
        vendedor: ""
    });

    const pageHeader = {
        title: "Ganancias y Pérdidas de la Empresa",
        subtitle: "Ganancias acumuladas por vendedor basadas en semanas liquidadas"
    };

    useEffect(() => {
        const cargarGanancias = async () => {
            try {
                const response = await saleService.getGananciasVendedores();
                if (response.success) {
                    setVendedores(response.data);
                }
            } catch (error) {
                console.error("Error cargando el módulo de ganancias:", error);
            } finally {
                setLoading(false);
            }
        };
        cargarGanancias();
    }, []);

    const filteredOrders = vendedores.filter(v => {
        const matchVendedor = !filters.vendedor || (v.vendedor && v.vendedor.toLowerCase().includes(filters.vendedor.toLowerCase()));
        return matchVendedor;
    });

    const totalVendedores = filteredOrders.length;
    const totalGananciasEmpresa = filteredOrders.reduce((acc, v) => acc + Number(v.ganancias_totales_acumuladas || 0), 0);
    const totalSaldoEntregado = filteredOrders.reduce((acc, v) => acc + Number(v.saldo_neto_entregado || 0), 0);

    // 1. FORMATO DINÁMICO PARA LAS TARJETAS SUPERIORES (Opcional pero recomendado para consistencia)
    // Si el total acumulado global es negativo, invertimos visualmente el color a rojo
    const esGananciaNegativaGlobal = totalGananciasEmpresa < 0;

    const stats = [
        { label: "NÚMERO DE VENDEDORES", value: totalVendedores, sub: "VENDEDORES ACTIVOS FILTRADOS", color: "#a855f7", icon: <ClipboardList size={20} /> },
        { 
            label: "TOTAL GANANCIAS ACUMULADAS", 
            value: `$${Number(totalGananciasEmpresa).toLocaleString()}`, 
            sub: esGananciaNegativaGlobal ? "ALERTA: SALDO NEGATIVO" : "DINERO TOTAL ACUMULADO", 
            color: esGananciaNegativaGlobal ? "#ef4444" : "#10b981", // Cambia a rojo si es menor a 0
            icon: <ClipboardList size={20} /> 
        },
    ];

    if (loading) return <div className="p-6 text-center font-sans text-gray-600">Cargando métricas de ganancias...</div>;

    return (
        <div className="inv-page full-layout" style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
            
            {/* ENCABEZADO DE LA PÁGINA */}
            <div className="module-intro" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#8B1D22', color: 'white', padding: '12px', borderRadius: '12px' }}>
                        <ClipboardList size={28} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1e293b', fontWeight: '700' }}>{pageHeader.title}</h1>
                        <p style={{ margin: 0, opacity: 0.8, color: '#64748b', fontSize: '0.85rem' }}>{pageHeader.subtitle}</p>
                    </div>
                </div>
            </div>

            {/* TARJETAS DE ESTADÍSTICAS */}
            <div className="inventory-stats" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                {stats.map((stat, index) => (
                    <div key={index} style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                        borderLeft: `5px solid ${stat.color}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        position: 'relative'
                    }}>
                        <div>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                color: '#64748b',
                                display: 'block',
                                marginBottom: '8px',
                                letterSpacing: '0.05em'
                            }}>
                                {stat.label}
                            </span>
                            <h2 style={{
                                margin: 0,
                                fontSize: '1.6rem',
                                fontWeight: '800',
                                color: '#1e293b'
                            }}>
                                {stat.value}
                            </h2>
                            <p style={{
                                margin: '5px 0 0 0',
                                fontSize: '0.7rem',
                                color: stat.color,
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                {stat.sub}
                            </p>
                        </div>

                        <div style={{
                            background: `${stat.color}15`,
                            color: stat.color,
                            padding: '10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px'
                        }}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* SECCIÓN DE FILTROS DINÁMICOS */}
            <div className="inv-card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div className="filter-group" style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>FECHA</label>
                        <input
                            type="date"
                            className="input"
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            value={filters.fecha}
                            onChange={(e) => setFilters({ ...filters, fecha: e.target.value })}
                        />
                    </div>

                    {(user?.role === 'ADMINISTRADOR' || user?.role === 'DESPACHADOR') && (
                        <>
                            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>TIPO CLIENTE</label>
                                <select
                                    className="input"
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}
                                    value={filters.tipoCliente}
                                    onChange={(e) => setFilters({ ...filters, tipoCliente: e.target.value })}
                                >
                                    <option value="">Todos</option>
                                    <option value="SOCIO">Socio</option>
                                    <option value="NO_SOCIO">No Socio</option>
                                    <option value="CLIENTE">Cliente</option>
                                    <option value="DESPACHO_MAYOR">Despacho Mayor</option>
                                </select>
                            </div>

                            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>NOMBRE DEL VENDEDOR</label>
                                <input
                                    type="text"
                                    placeholder="Buscar por vendedor..."
                                    className="input"
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                                    value={filters.vendedor}
                                    onChange={(e) => setFilters({ ...filters, vendedor: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            className="btn-edit"
                            style={{ width: '100%', height: '40px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                            onClick={() => setFilters({ fecha: "", tipoCliente: "", vendedor: "" })}
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="inv-card" style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '20px' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="inv-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Vendedor</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Semanas Liquidadas</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Ganancias Totales Acum.</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                        No se encontraron registros de liquidaciones para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((o, idx) => {
                                    // 2. DETECTAR SI EL VALOR INDIVIDUAL EN LA FILA ES NEGATIVO
                                    const valorGanancia = Number(o.ganancias_totales_acumuladas || 0);
                                    const esNegativo = valorGanancia < 0;

                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            
                                            <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b', textTransform: 'uppercase' }}>
                                                {o.vendedor}
                                            </td>

                                            <td style={{ padding: '12px', textAlign: 'center', color: '#6366f1', fontWeight: '700' }}>
                                                {o.semanas_liquidadas} sem.
                                            </td>
                                            
                                            {/* 3. CAMBIO DE COLOR DINÁMICO EN LA CELDA DE LA TABLA */}
                                            <td style={{ 
                                                padding: '12px', 
                                                textAlign: 'right', 
                                                fontWeight: '700', 
                                                color: esNegativo ? '#ef4444' : '#10b981' // Rojo si es negativo, verde si es positivo
                                            }}>
                                                ${valorGanancia.toLocaleString()}
                                            </td>

                                            {/* 4. CAMBIO DE COLOR EN EL BADGE DE ESTADO */}
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <span className="badge-stock" style={{ 
                                                    background: esNegativo ? '#ffeeef' : '#dcfce7', // Fondo rojo claro o verde claro
                                                    color: esNegativo ? '#ef4444' : '#15803d',      // Texto rojo fuerte o verde fuerte
                                                    padding: '4px 8px', 
                                                    borderRadius: '6px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: '700' 
                                                }}>
                                                    {esNegativo ? 'CON DEUDA' : 'LIQUIDADO'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}