import React, { useState, useEffect } from 'react';
import { saleService } from '../services/saleService';
import { useNavigate, useLocation } from 'react-router-dom';
import { alertConfirmUsers, alertSuccess, alertError } from '../services/alertService';

export default function Pagos() {
    const navigate = useNavigate();
    const { state } = useLocation();

    const [settlementsWeek, setSettlementsWeek] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rangoTexto, setRangoTexto] = useState("");
    const [transferenciasRecibidas, setTransferenciasRecibidas] = useState(0);

    // Almacena si la semana ya llegó liquidada desde el componente anterior
    const [esSemanaLiquidada, setEsSemanaLiquidada] = useState(false);
    const [cierreGuardado, setCierreGuardado] = useState(null);

    const diasSemana = ['Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // --- FUNCIÓN PARA CALCULAR LA SEMANA AUTOMÁTICAMENTE O POR PARÁMETRO ---
    const obtenerFechasSemana = (fechaBaseOpcional) => {
        const hoy = fechaBaseOpcional ? new Date(fechaBaseOpcional + 'T12:00:00') : new Date();
        const diaSemana = hoy.getDay();

        const diferenciaAlMartes = diaSemana >= 2 ? diaSemana - 2 : diaSemana + 5;

        const martes = new Date(hoy);
        martes.setDate(hoy.getDate() - diferenciaAlMartes);

        const sabado = new Date(martes);
        sabado.setDate(martes.getDate() + 4);

        const domingo = new Date(martes);
        domingo.setDate(martes.getDate() + 5);

        const fISO = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dia = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dia}`;
        };

        const fVista = (d) => d.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace('.', '');

        return {
            start: fISO(martes),
            end: fISO(domingo),
            texto: `${fVista(martes)} - ${fVista(sabado)}`
        };
    };

    useEffect(() => {
        const fetchDatosSemanales = async () => {
            try {
                const userLocalStorage = JSON.parse(localStorage.getItem("user"));
                const targetSellerName = state?.datosLiquidacion?.vendedor_nombre || userLocalStorage?.name || userLocalStorage?.username;

                if (!targetSellerName) {
                    console.error("No se encontró el nombre del vendedor para consultar.");
                    return;
                }

                // 🛠️ CORRECCIÓN AQUÍ:
                // Si la semana ya está liquidada, extraemos 'menosTransferencias' de la base de datos
                if (state?.datosLiquidacion?.estado === 'SEMANA LIQUIDADA') {
                    setEsSemanaLiquidada(true);

                    // CAMBIADO: Ahora lee correctamente 'menosTransferencias' enviado desde el backend/historial
                    const valorPrevioInput = Number(state?.datosLiquidacion?.menosTransferencias || 0);

                    setTransferenciasRecibidas(valorPrevioInput);
                    setCierreGuardado({ valorRegistrado: valorPrevioInput });
                }

                const fechaReferencia = state?.datosLiquidacion?.fecha;
                const fechas = obtenerFechasSemana(fechaReferencia);

                setRangoTexto(state?.datosLiquidacion?.rango_fechas || fechas.texto);

                const data = await saleService.getWeeklySettlements(targetSellerName, fechas.start, fechas.end);

                console.log("Datos que llegaron al Frontend:", data);
                setSettlementsWeek(data);
            } catch (error) {
                console.error("Error cargando pagos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDatosSemanales();
    }, [state]);

    const format = (val) => {
        const absoluto = Math.abs(val);
        const formateado = new Intl.NumberFormat('es-CO', {
            maximumFractionDigits: 0
        }).format(absoluto);
        return val < 0 ? `-${formateado}` : formateado;
    };

    // --- LÓGICA DE PROCESAMIENTO ADAPTATIVA ---
    const datosPorDia = diasSemana.reduce((acc, nombreDia) => {
        const fechaReferencia = state?.datosLiquidacion?.fecha;
        const fechas = obtenerFechasSemana(fechaReferencia);
        const fechaBase = new Date(fechas.start + 'T00:00:00');

        const mapaDesplazamientoDias = {
            'martes': 0, 'miercoles': 1, 'jueves': 2, 'viernes': 3, 'sabado': 4
        };

        const diaClave = nombreDia.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const diasASumar = mapaDesplazamientoDias[diaClave];

        const fechaTargetObjeto = new Date(fechaBase);
        fechaTargetObjeto.setDate(fechaBase.getDate() + diasASumar);

        const y = fechaTargetObjeto.getFullYear();
        const m = String(fechaTargetObjeto.getMonth() + 1).padStart(2, '0');
        const d = String(fechaTargetObjeto.getDate()).padStart(2, '0');
        const fechaTargetString = `${y}-${m}-${d}`;

        const settlementDia = settlementsWeek.find(s => {
            if (!s.fecha) return false;
            const fechaLimpiaDB = s.fecha.split('T')[0];
            return fechaLimpiaDB === fechaTargetString;
        });

        if (settlementDia) {
            const valorMonto = Number(settlementDia.total_ganancia || 0);
            acc[nombreDia] = {
                ganancia: valorMonto,
                falta: valorMonto
            };
        } else {
            acc[nombreDia] = { ganancia: 0, falta: 0 };
        }

        return acc;
    }, {});

    const gananciasTotales = Object.values(datosPorDia).reduce((acc, curr) => acc + curr.ganancia, 0);
    const dividido2 = gananciasTotales / 2;
    const faltaTotalGeneral = Object.values(datosPorDia).reduce((acc, curr) => acc + curr.falta, 0);

    const prestamoFijo = Math.abs(faltaTotalGeneral) - (Number(transferenciasRecibidas) || 0);
    const netoFinal = dividido2 - prestamoFijo;

    // --- PROCESAR EL CIERRE CON LOS NUEVOS CAMPOS ---
    const handleCerrarSemana = async () => {
        const confirmar = await alertConfirmUsers(
            "¿Estás seguro?",
            `Vas a liquidar y cerrar de forma definitiva el periodo:\n${rangoTexto}`
        );

        if (!confirmar) return;

        try {
            const valorAEnviar = Number(transferenciasRecibidas) || 0;
            const userLocalStorage = JSON.parse(localStorage.getItem("user"));
            const nombreVendedor = state?.datosLiquidacion?.vendedor_nombre || userLocalStorage?.name || userLocalStorage?.username;

            // Enviamos el payload completo estructurado para las nuevas columnas del historial
            const payload = {
                user_id: nombreVendedor,
                rango_fechas: rangoTexto,
                total_ganancia: gananciasTotales,
                neto_pagado: netoFinal,
                status: 'SEMANA LIQUIDADA',
                dividido_2: dividido2,
                menosTransferencias: valorAEnviar
            };

            const response = await saleService.saveWeeklySettlement(payload);

            if (response.success) {
                await alertSuccess("¡Éxito!", "La semana ha sido guardada en la base de datos.");
                setEsSemanaLiquidada(true);
                setCierreGuardado({
                    valorRegistrado: valorAEnviar
                });
            } else {
                alertError("Error", response.message || "No se pudo cerrar la semana");
            }
        } catch (error) {
            console.error("Error al cerrar la semana desde UI:", error);
            alertError("Error de Servidor", error.message);
        }
    };

    if (loading) return <div className="p-4">Cargando liquidaciones...</div>;

    return (
        <div className="p-4 bg-white min-h-screen font-sans">
            <div className="max-w-[1000px] mx-auto mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                <p className="text-blue-800 font-semibold">
                    📅 Periodo de Liquidación: <span className="underline">{rangoTexto}</span>
                </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '1000px', margin: '0 auto 20px auto' }}>
                <button
                    onClick={() => navigate('/historial-pagos')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                        backgroundColor: '#ffffff', color: '#374151', border: '1px solid #d1d5db',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                >
                    Ver Historial de Pagos
                </button>

                {/* 🚀 EL BOTÓN SE OCULTA SI LA SEMANA YA ESTÁ LIQUIDADA */}
                {!esSemanaLiquidada && (
                    <button
                        onClick={handleCerrarSemana}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px',
                            backgroundColor: '#9b111e', color: '#ffffff', border: '1px solid #9b111e',
                            borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        Finalizar y Cerrar Semana
                    </button>
                )}
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
                                        disabled={esSemanaLiquidada} // 👈 SE INHABILITA SI YA FUE CERRADA
                                        value={transferenciasRecibidas}
                                        onChange={(e) => setTransferenciasRecibidas(e.target.value)}
                                        style={{
                                            width: '100px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '4px',
                                            backgroundColor: esSemanaLiquidada ? '#f3f4f6' : '#fff',
                                            color: esSemanaLiquidada ? '#6b7280' : '#000'
                                        }}
                                    />
                                </td>
                            </tr>

                            <tr style={{ color: '#d32f2f' }}>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', fontWeight: 'bold' }}>Préstamo</td>
                                <td style={{ border: '1px solid #eee', padding: '4px 8px', textAlign: 'right' }}>
                                    <span style={{ fontWeight: 'bold' }}>-${format(prestamoFijo)}</span>
                                </td>
                            </tr>

                            {/* 🚀 FILA DINÁMICA DE REPORTE FINAL: Se renderiza siempre que 'cierreGuardado' exista */}
                            {cierreGuardado && (
                                <tr style={{ backgroundColor: '#e2f0d9', color: '#385723', fontWeight: 'bold', borderTop: '2px solid #385723' }}>
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>Valor Registrado en menos Transferencias</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                                        $ {format(cierreGuardado.valorRegistrado)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}