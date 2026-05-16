import React, { useState, useEffect } from 'react';
import { saleService } from '../services/saleService';
import { useNavigate } from 'react-router-dom';
import { Eye, DollarSign, Search } from 'lucide-react'; // Añadí Search
import '../styles/devoluciones.css';

export default function HistorialPagos() {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    // 1. Estado para el término de búsqueda
    const [busqueda, setBusqueda] = useState("");
    
    const navigate = useNavigate();

    useEffect(() => {
        cargarHistorial();
    }, []);

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem("user"));
            if (user?.id) {
                const data = await saleService.getWeeklyHistory(user.id);
                setHistorial(data);
            }
        } catch (error) {
            console.error("Error al cargar el historial:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Lógica de filtrado en tiempo real
    const historialFiltrado = historial.filter((item) => {
        const termino = busqueda.toLowerCase();
        return (
            item.vendedor_nombre?.toLowerCase().includes(termino) ||
            item.id?.toString().includes(termino) ||
            item.rango_fechas?.toLowerCase().includes(termino)
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
                            Historial de Liquidaciones Semanal
                        </h1>
                        <p className="text-gray-500 mt-2 text-lg">
                            Gestiona y visualiza tus pagos semanales de forma organizada.
                        </p>
                    </div>

                    {/* 3. El Buscador UI */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por vendedor o ID..."
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
                                {/* 4. Usar la lista filtrada aquí */}
                                {historialFiltrado.length > 0 ? (
                                    historialFiltrado.map((item) => {
                                        const esLiquidado = item.neto_pagado !== null && item.neto_pagado !== undefined && item.neto_pagado !== 0;
                                        return (
                                            <tr key={`${item.id}-${item.vendedor_nombre}`}>
                                                <td className="text-center font-bold">#{item.id}</td>
                                                <td className="uppercase text-xs font-semibold">{item.vendedor_nombre || 'Sin nombre'}</td>
                                                <td className="text-center">{item.rango_fechas}</td>
                                                <td className="text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${esLiquidado ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                                                        {esLiquidado ? "Liquidado" : "Pendiente"}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            disabled={!esLiquidado}
                                                            onClick={() => navigate('/pagos-detalle', {
                                                                state: { datosLiquidacion: item, modoLectura: true }
                                                            })}
                                                            className={`p-1.5 border rounded transition-colors ${esLiquidado ? 'bg-white border-gray-300 hover:bg-gray-100 text-[#9b111e]' : 'text-gray-200 border-gray-100'}`}
                                                            title="Ver detalle"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            disabled={esLiquidado}
                                                            onClick={() => navigate('/pagos-detalle')}
                                                            className={`p-1.5 border rounded transition-colors ${!esLiquidado ? 'bg-[#9b111e] text-white hover:bg-[#7a0d18]' : 'bg-gray-200 text-gray-400 border-gray-200'}`}
                                                            title="Liquidar"
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
                                            No se encontraron resultados para "{busqueda}"
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