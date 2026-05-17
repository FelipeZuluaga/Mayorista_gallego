import React, { useState, useEffect } from 'react';
import { saleService } from '../services/saleService';

export default function Ganancias() {
    const [vendedores, setVendedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

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

    const formatMoneda = (val) => {
        // CORREGIDO: Ambos usan la variable 'absoluto' en español para evitar el ReferenceError
        const absoluto = Math.abs(val || 0);
        const formateado = new Intl.NumberFormat('es-CO', {
            maximumFractionDigits: 0
        }).format(absoluto);
        return val < 0 ? `-$${formateado}` : `$${formateado}`;
    };

    // Filtrador por nombre de vendedor dinámico (Igual al de tu módulo de historial)
    const vendedoresFiltrados = vendedores.filter(v => 
        v.vendedor && v.vendedor.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (loading) return <div className="p-6 text-center font-sans text-gray-600">Cargando métricas de ganancias...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-[1100px] mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                
                {/* ENCABEZADO ESTILO DASHBOARD */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            💰 Consolidado Histórico de Ganancias
                        </h2>
                        <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mt-1">
                            Gestión, historial de rendimiento y balances generales
                        </p>
                    </div>

                    {/* BARRA DE BÚSQUEDA */}
                    <div className="relative w-full md:w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            🔍
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por Vendedor"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* TABLA DE CONTENIDO */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="w-full text-left border-collapse bg-white">
                        <thead>
                            <tr className="bg-[#8B1D22] text-white text-xs uppercase font-bold tracking-wider">
                                <th className="px-6 py-3.5 text-center">Vendedor</th>
                                <th className="px-6 py-3.5 text-center">Semanas Liquidadas</th>
                                <th className="px-6 py-3.5 text-right">(Dividido 2)</th>
                            </tr>
                        </thead>
                        
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {vendedoresFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500 font-medium">
                                        No se encontraron registros de liquidaciones para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                vendedoresFiltrados.map((v, index) => {
                                    const netoNegativo = v.saldo_neto_entregado < 0;
                                    const gananciaNegativa = v.ganancias_totales_acumuladas < 0;

                                    return (
                                        <tr 
                                            key={v.vendedor} 
                                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-gray-50 transition-colors`}
                                        >
                                            {/* Nombre Vendedor */}
                                            <td className="px-6 py-4 font-bold text-gray-700 tracking-wide text-center uppercase">
                                                {v.vendedor}
                                            </td>

                                            {/* Semanas Liquidadas con Badge sutil */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full font-bold border border-gray-200">
                                                    {v.semanas_liquidadas} {v.semanas_liquidadas === 1 ? 'Semana' : 'Semanas'}
                                                </span>
                                            </td>

                                            {/* Ganancias Totales Acumuladas */}
                                            <td className={`px-6 py-4 text-right font-semibold tracking-wide ${gananciaNegativa ? 'text-red-600' : 'text-gray-900'}`}>
                                                {formatMoneda(v.ganancias_totales_acumuladas)}
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