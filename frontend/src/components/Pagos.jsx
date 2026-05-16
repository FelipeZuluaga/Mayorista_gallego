import React, { useState, useEffect } from 'react';
import { saleService } from '../services/saleService';
import { useNavigate, useLocation } from 'react-router-dom';
import { alertConfirmUsers, alertSuccess, alertError } from '../services/alertService';

export default function Pagos() {
    const navigate = useNavigate();
    const [settlementsWeek, setSettlementsWeek] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rangoTexto, setRangoTexto] = useState(""); // Estado para el texto visible (05/May...)
    const [transferenciasRecibidas, setTransferenciasRecibidas] = useState(0);

    const diasSemana = ['Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // --- FUNCIÓN PARA CALCULAR LA SEMANA ACTUAL AUTOMÁTICAMENTE ---
    const obtenerFechasSemana = () => {
        const hoy = new Date();
        const diaSemana = hoy.getDay(); // 0: Dom, 1: Lun, 2: Mar...

        // Si hoy es Domingo (0) o Lunes (1), queremos ver la semana que acaba de pasar.
        // Si es de Martes (2) en adelante, vemos la semana en curso.
        const diferenciaAlMartes = diaSemana >= 2 ? diaSemana - 2 : diaSemana + 5;

        const martes = new Date(hoy);
        martes.setDate(hoy.getDate() - diferenciaAlMartes);

        const sabado = new Date(martes);
        sabado.setDate(martes.getDate() + 4);

        // Formato para la API (YYYY-MM-DD)
        const fISO = (d) => d.toISOString().split('T')[0];

        // Formato para la Vista e Historial (12/May/2026)
        const fVista = (d) => d.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace('.', '');

        return {
            start: fISO(martes),
            end: fISO(sabado),
            texto: `${fVista(martes)} - ${fVista(sabado)}`
        };
    };

    // Agrega useLocation para recibir datos del historial
    const { state } = useLocation();

    useEffect(() => {
        const fetchDatosSemanales = async () => {
            try {
                // 1. Prioridad: Si venimos del historial, usamos el user_id guardado en ese registro.
                // 2. Si es una liquidación nueva, usamos el del usuario logueado.
                const targetUserId = state?.datosLiquidacion?.user_id || JSON.parse(localStorage.getItem("user"))?.id;

                if (!targetUserId) return;

                const fechas = obtenerFechasSemana();
                // Si es modo lectura (desde historial), usamos el rango que se guardó en la DB
                setRangoTexto(state?.datosLiquidacion?.rango_fechas || fechas.texto);

                // Llamada a la API con el ID del vendedor específico
                const data = await saleService.getWeeklySettlements(targetUserId, fechas.start, fechas.end);
                setSettlementsWeek(data);
            } catch (error) {
                console.error("Error cargando pagos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDatosSemanales();
    }, [state]);

    const format = (val) => new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0
    }).format(val);

    // LÓGICA DE PROCESAMIENTO DE DATOS
    const datosPorDia = diasSemana.reduce((acc, nombreDia) => {
        const diaBuscado = nombreDia.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const settlementDia = settlementsWeek.find(s => {
            if (!s.dia_semana) return false;
            const diaDB = s.dia_semana.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return diaDB === diaBuscado;
        });

        acc[nombreDia] = settlementDia
            ? { ganancia: Number(settlementDia.total_ganancia || 0), falta: Number(settlementDia.total_ganancia || 0) }
            : { ganancia: 0, falta: 0 };
        return acc;
    }, {});

    const gananciasTotales = Object.values(datosPorDia).reduce((acc, curr) => acc + curr.ganancia, 0);
    const dividido2 = gananciasTotales / 2;
    const faltaTotalGeneral = Object.values(datosPorDia).reduce((acc, curr) => acc + curr.falta, 0);

    const prestamoFijo = Math.abs(faltaTotalGeneral) - (Number(transferenciasRecibidas) || 0);
    const netoFinal = dividido2 - prestamoFijo;

    const handleCerrarSemana = async () => {
        // 1. Identificar a quién estamos liquidando
        // Prioridad al ID que viene del historial/estado, si no, el del usuario actual
        const targetUserId = state?.datosLiquidacion?.user_id || JSON.parse(localStorage.getItem("user"))?.id;

        const confirmed = await alertConfirmUsers(
            "¿Finalizar y Cerrar Semana?",
            `Se guardará el registro para el periodo: ${rangoTexto}`
        );

        if (confirmed) {
            try {
                const payload = {
                    userId: targetUserId, // <--- USAR EL ID DEL VENDEDOR DESTINO
                    rango_fechas: rangoTexto,
                    total_ganancia: gananciasTotales,
                    neto_pagado: netoFinal,
                    transferencias: transferenciasRecibidas,
                    prestamo: prestamoFijo
                };

                await saleService.saveWeeklyHistory(payload);
                await alertSuccess("¡Semana Cerrada!", "Datos guardados correctamente en el historial.");
                navigate('/historial-pagos');
            } catch (error) {
                alertError("Error al cerrar", error.message || "No se pudo procesar.");
            }
        }
    };

    if (loading) return <div className="p-4">Cargando liquidaciones...</div>;

    return (
        <div className="p-4 bg-white min-h-screen font-sans">
            {/* Indicador de semana actual */}
            <div className="max-w-[1000px] mx-auto mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                <p className="text-blue-800 font-semibold">
                    📅 Periodo de Liquidación: <span className="underline">{rangoTexto}</span>
                </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '1000px', margin: '0 auto 20px auto' }}>
                <button onClick={() => navigate('/historial-pagos')} className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-700 transition-colors">
                    📁 Ver Historial de Pagos
                </button>
                <button onClick={handleCerrarSemana} className="bg-green-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-green-700 transition-transform active:scale-95">
                    🔒 Finalizar y Cerrar Semana
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '40px', maxWidth: '1000px', margin: '0 auto' }}>

                {/* TABLA GANANCIAS */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>Ganancias</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                        <tbody>
                            {diasSemana.map(dia => (
                                <tr key={dia}>
                                    <td style={{ border: '1px solid #eee', padding: '4px 8px' }}>{dia}</td>
                                    <td style={{ border: '1px solid #eee', padding: '4px 8px', textAlign: 'right' }}>
                                        $ {format(datosPorDia[dia].ganancia)}
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#ffff00' }}>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>Ganancias Totales</td>
                                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>$ {format(gananciasTotales)}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', fontWeight: 'bold' }}>DIVIDIDO 2</td>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', textAlign: 'right' }}>$ {format(dividido2)}</td>
                            </tr>
                            <tr style={{ color: '#d32f2f' }}>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', fontWeight: 'bold' }}>Menos Préstamo</td>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', textAlign: 'right' }}>
                                    -${format(prestamoFijo)}
                                </td>
                            </tr>
                            <tr style={{ fontWeight: 'bold', fontSize: '1.1rem', borderTop: '2px solid black' }}>
                                <td style={{ padding: '8px' }}>Neto</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>
                                    <span style={{ color: netoFinal < 0 ? 'red' : 'black' }}>$ {format(netoFinal)}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* TABLA FALTA EN TRANSFERENCIAS */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>Falta en transferencias</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                        <tbody>
                            {diasSemana.map(dia => (
                                <tr key={dia}>
                                    <td style={{ border: '1px solid #eee', padding: '4px 8px' }}>{dia}</td>
                                    <td style={{ border: '1px solid #eee', padding: '4px 8px', textAlign: 'right' }}>
                                        -{format(Math.abs(datosPorDia[dia].falta))}
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 'bold', color: 'white', backgroundColor: '#ff0000' }}>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>Falta Total</td>
                                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>-{format(Math.abs(faltaTotalGeneral))}</td>
                            </tr>

                            <tr>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', fontWeight: 'bold' }}>Menos Transferencias</td>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', textAlign: 'right' }}>
                                    <span style={{ marginRight: '4px' }}>$</span>
                                    <input
                                        type="number"
                                        value={transferenciasRecibidas}
                                        onChange={(e) => setTransferenciasRecibidas(e.target.value)}
                                        style={{ width: '100px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '4px' }}
                                    />
                                </td>
                            </tr>

                            <tr style={{ color: '#d32f2f' }}>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', fontWeight: 'bold' }}>Préstamo</td>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', textAlign: 'right' }}>
                                    <span style={{ fontWeight: 'bold' }}>-${format(prestamoFijo)}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}