import React, { useState, useEffect } from 'react';
import { saleService } from '../services/saleService';
import { useNavigate } from 'react-router-dom';
import { Eye, DollarSign, Search } from 'lucide-react';
import '../styles/devoluciones.css';

export default function HistorialPagos() {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        cargarHistorial();
    }, []);

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            const data = await saleService.getWeeklyHistory();
            setHistorial(data);
        } catch (error) {
            console.error("Error al cargar el historial:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- FUNCIÓN DE FORMATEO IDÉNTICA A LA DE DETALLES ---
    const formatearRangoEstetico = (rangoOriginal, fechaBaseStr) => {
        if (!fechaBaseStr) return rangoOriginal;

        try {
            const hoy = new Date(fechaBaseStr + 'T12:00:00');
            const diaSemana = hoy.getDay();
            const diferenciaAlMartes = diaSemana >= 2 ? diaSemana - 2 : diaSemana + 5;

            const martes = new Date(hoy);
            martes.setDate(hoy.getDate() - diferenciaAlMartes);

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

    // Lógica de filtrado en tiempo real (Corregida para el nuevo estado del backend)
    const historialFiltrado = historial.filter((item) => {
        const termino = busqueda.toLowerCase();
        return (
            item.vendedor_nombre?.toLowerCase().includes(termino) ||
            item.id?.toString().includes(termino) ||
            item.rango_fechas?.toLowerCase().includes(termino) ||
            item.estado?.toLowerCase().includes(termino) // Ahora busca perfectamente sobre el string calculado de la DB
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
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            HISTORIAL DE LIQUIDACIÓN SEMANAL / PAGOS
                        </h1>
                        <p className="text-gray-500 mt-2 text-lg">
                            Gestiona y visualiza tus pagos semanales de forma organizada.
                        </p>
                    </div>

                    {/* Buscador UI */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por vendedor, ID o estado..."
                            className="block w-full md:w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#9b111e] focus:border-[#9b111e] text-sm"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
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
                                        // Leemos directamente la columna calculada del Backend
                                        const esSemanaLiquidada = item.estado === "SEMANA LIQUIDADA";
                                        
                                        // Extraemos la fecha limpia enviada con MAX(s.created_at)
                                        const fechaLimpia = item.created_at ? item.created_at.split('T')[0] : null;

                                        // Formateamos visualmente el texto para que coincida con la vista de detalles
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
                                                        {esSemanaLiquidada ? "Semana Liquidada" : "Liquidar Semana"}
                                                    </span>
                                                </td>

                                                <td className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* Acción: Ver histórico */}
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
                                                            className="p-1.5 border rounded bg-white border-gray-300 hover:bg-gray-100 text-[#9b111e] transition-colors"
                                                            title="Ver histórico"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>

                                                        {/* Acción: Liquidar semana */}
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
                                                            className={`p-1.5 border rounded transition-colors ${!esSemanaLiquidada
                                                                ? 'bg-[#9b111e] text-white hover:bg-[#7a0d18] border-[#9b111e]'
                                                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                            }`}
                                                            title={esSemanaLiquidada ? "Esta semana ya está completamente cerrada" : "Liquidar semana de comisiones"}
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                        </button>
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