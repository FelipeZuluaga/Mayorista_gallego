import React, { useState, useEffect } from 'react';
import { saleService } from '../services/saleService';
import { useNavigate } from 'react-router-dom';
import { Eye, DollarSign } from 'lucide-react';

export default function HistorialPagos() {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();

    const esAdmin = user?.role === 'ADMINISTRADOR';

    useEffect(() => {
        cargarHistorial();
    }, []);

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            const data = await saleService.getWeeklyHistory();
            
            // --- FILTRADO POR ROL (FRONTEND) ---
            // Si no es Administrador, filtramos para que solo vea sus propios registros
            if (!esAdmin && user) {
                // Ajusta 'user.name' o 'user.username' según cómo guardes el nombre en tu localStorage
                const nombreUsuarioLogueado = (user.name || user.username || "").toLowerCase();
                
                const datosFiltradosPorUsuario = data.filter(item => 
                    item.vendedor_nombre?.toLowerCase() === nombreUsuarioLogueado
                );
                setHistorial(datosFiltradosPorUsuario);
            } else {
                // Si es Administrador, ve todo el historial completo
                setHistorial(data);
            }

        } catch (error) {
            console.error("Error al cargar el historial:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- FUNCIÓN DE FORMATEO CORREGIDA ---
    const formatearRangoEstetico = (rangoOriginal, fechaBaseStr) => {
        if (!fechaBaseStr) return rangoOriginal;

        try {
            const hoy = new Date(fechaBaseStr + 'T12:00:00');
            const diaSemana = hoy.getDay();
            const diferenciaAlMartes = diaSemana >= 2 ? diaSemana - 2 : diaSemana + 5;

            const martes = new Date(hoy);
            martes.setDate(hoy.getDate() - diferenciaAlMartes); // Se quitó el 'const' repetido

            const sabado = new Date(martes);
            sabado.setDate(martes.getDate() + 4);

            const fVista = (d) => d.toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace('.', '');

            return `${fVista(martes)} - ${fVista(sabado)}`;
        } catch (e) {
            return rangoOriginal;
        }
    };

    // Lógica de filtrado en tiempo real (Sobre los datos ya segmentados por rol)
    const historialFiltrado = historial.filter((item) => {
        const termino = busqueda.toLowerCase();
        return (
            item.vendedor_nombre?.toLowerCase().includes(termino) ||
            item.id?.toString().includes(termino) ||
            item.rango_fechas?.toLowerCase().includes(termino) ||
            item.estado?.toLowerCase().includes(termino) ||
            item.status?.toLowerCase().includes(termino)
        );
    });

    if (loading) return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#800000] mb-4"></div>
            <p className="text-[#800000] font-bold tracking-widest uppercase text-xs">Cargando datos...</p>
        </div>
    );

    return (
        <div className="devoluciones-container">
            <div className="max-w-7xl mx-auto">
                {/* Encabezado */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <header className="ruta-header-main">
                        <h1>{esAdmin ? '🚀 Historial y proceso de pagos semanal' : '🚚 Mi historial y proceso de pagos semanal'}</h1>
                        <p>{esAdmin ? 'GESTIÓN, HISTORIAL DE LIQUIDACIÓN Y PAGOS SEMANALES' : 'HISTORIAL DE LIQUIDACIÓN Y PAGOS SEMANALES'}</p>
                    </header>
                    <div style={{ marginLeft: 'auto', paddingLeft: '15px', width: '260px', flexShrink: 0 }}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar por Vendedor"
                            className="input-search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', width: '100%' }}
                        />
                    </div>
                </div>

                <div className="planilla-wrapper overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Ref ID</th>
                                    <th>Vendedor</th>
                                    <th>Periodo de Liquidación</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historialFiltrado.length > 0 ? (
                                    historialFiltrado.map((item) => {
                                        const valorEstado = (item.estado || item.status || "").toUpperCase();
                                        const esSemanaLiquidada = valorEstado === "SEMANA LIQUIDADA" || valorEstado === "LIQUIDADO";

                                        // Extraemos la fecha limpia
                                        const fechaLimpia = item.created_at ? item.created_at.split('T')[0] : null;

                                        // Formateamos visualmente el texto
                                        const rangoFormateado = formatearRangoEstetico(item.rango_fechas, fechaLimpia);

                                        return (
                                            <tr key={item.id}>
                                                <td className="text-center font-bold">#{item.id}</td>
                                                <td className="uppercase text-xs font-semibold">{item.vendedor_nombre || 'Sin nombre'}</td>

                                                {/* Despliegue unificado y estético de las fechas */}
                                                <td className="text-center font-medium text-gray-700">{rangoFormateado}</td>

                                                <td className="text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${esSemanaLiquidada
                                                        ? 'bg-green-100 text-green-700 border-green-300'
                                                        : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                        }`}>
                                                        {esSemanaLiquidada
                                                            ? "Semana Liquidada"
                                                            : (esAdmin ? "Liquidar Semana" : "Pendiente de liquidación")}
                                                    </span>
                                                </td>

                                                <td className="text-center">
                                                    <div className="flex items-center justify-center gap-2" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>

                                                        {/* Acción: Ver histórico (Permitido para TODOS) */}
                                                        <button
                                                            onClick={() => navigate('/pagos-detalle', {
                                                                state: {
                                                                    datosLiquidacion: {
                                                                        ...item,
                                                                        fecha: fechaLimpia,
                                                                        rango_fechas: rangoFormateado
                                                                    },
                                                                    modoLectura: true
                                                                }
                                                            })}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '6px 12px',
                                                                backgroundColor: '#ffffff',
                                                                color: '#374151',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                transition: 'background-color 0.2s'
                                                            }}
                                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                                            title="Ver histórico"
                                                        >
                                                            <Eye className="w-4 h-4 text-gray-500" />
                                                            Ver Histórico
                                                        </button>

                                                        {/* Acción: Liquidar semana (SOLO ADMINISTRADOR) */}
                                                        {esAdmin && (
                                                            <button
                                                                disabled={esSemanaLiquidada}
                                                                onClick={() => navigate('/pagos-detalle', {
                                                                    state: {
                                                                        datosLiquidacion: {
                                                                            ...item,
                                                                            fecha: fechaLimpia,
                                                                            rango_fechas: rangoFormateado
                                                                        },
                                                                        modoLectura: false
                                                                    }
                                                                })}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    padding: '6px 12px',
                                                                    backgroundColor: !esSemanaLiquidada ? '#9b111e' : '#f3f4f6',
                                                                    color: !esSemanaLiquidada ? '#ffffff' : '#9ca3af',
                                                                    border: !esSemanaLiquidada ? '1px solid #9b111e' : '1px solid #e5e7eb',
                                                                    borderRadius: '6px',
                                                                    cursor: !esSemanaLiquidada ? 'pointer' : 'not-allowed',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    transition: 'background-color 0.2s'
                                                                }}
                                                                onMouseOver={(e) => {
                                                                    if (!esSemanaLiquidada) e.currentTarget.style.backgroundColor = '#7a0d18';
                                                                }}
                                                                onMouseOut={(e) => {
                                                                    if (!esSemanaLiquidada) e.currentTarget.style.backgroundColor = '#9b111e';
                                                                }}
                                                                title={esSemanaLiquidada ? "Esta semana ya está completamente cerrada" : "Liquidar semana de comisiones"}
                                                            >
                                                                <DollarSign className="w-4 h-4" />
                                                                Liquidar Semana
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-10 text-gray-500 italic">
                                            No se encontraron resultados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}