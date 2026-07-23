import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { returnsService } from "../services/returnsService";
import { alertSuccess, alertError, alertConfirmUsers } from '../services/alertService';
import '../styles/SettlementModule.css';

const SettlementModule = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const totalSurtidoDesdePlanilla = location.state?.totalSurtido;
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Almacenamos los valores en formato string formateado para la interfaz visual
    const [efectivoFisico, setEfectivoFisico] = useState("0");
    const [valorAlmuerzo, setValorAlmuerzo] = useState("0");
    const [valorGasolina, setValorGasolina] = useState("0");

    // --- FUNCIONES AUXILIARES PARA FORMATO COP ---
    
    const formatNumber = (value) => {
        if (!value && value !== 0) return "";
        const cleanValue = value.toString().replace(/\D/g, "");
        if (!cleanValue) return "0";
        return new Intl.NumberFormat("es-CO").format(parseInt(cleanValue, 10));
    };

    const unformatNumber = (value) => {
        if (!value) return 0;
        const cleanValue = value.toString().replace(/\./g, "");
        return parseFloat(cleanValue) || 0;
    };

    const handleInputChange = (rawVal, setter) => {
        const formatted = formatNumber(rawVal);
        setter(formatted);
    };

    // Función para cargar o refrescar los datos del servidor
    const fetchSettlementData = async () => {
        try {
            const response = await returnsService.settleOrder(orderId);
            setData(response);
            
            // Si tiene valores previamente guardados (esté liquidado o no), los cargamos en los inputs
            // NOTA: Si tu API ya te devuelve el valor real sin necesidad de dividirlo por 1000, 
            // retira el "/ 1000" de estas tres líneas.
            setEfectivoFisico(formatNumber((response.efectivo_fisico || 0) / 1000));
            setValorAlmuerzo(formatNumber((response.valor_almuerzo || 0) / 1000));
            setValorGasolina(formatNumber((response.valor_gasolina || 0) / 1000));
            
            setLoading(false);
        } catch (error) {
            console.error("Error cargando liquidación:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettlementData();
    }, [orderId]);

    // Ya no bloqueamos la pantalla ni los inputs si está 'LIQUIDADO'
    const isClosed = data?.status === 'LIQUIDADO'; 

    if (loading) return <div className="p-5 text-center mt-5"><div className="spinner-border text-primary" role="status"></div><p className="mt-2">Calculando balance de ruta...</p></div>;

    // --- CÁLCULOS DE LA LIQUIDACIÓN DIARIA ---

    const recaude_abono = parseFloat(data?.total_recaudado || 0);
    const debe_ruta = parseFloat(data?.cartera_anterior || 0);

    // SURTIDO (Planilla)
    const surtido = totalSurtidoDesdePlanilla !== undefined 
        ? parseFloat(totalSurtidoDesdePlanilla) 
        : parseFloat(data?.ventas_totales_hoy || 0);

    // VENTA HOY (Venta real de BD)
    const venta_hoy = parseFloat(data?.ventas_totales_hoy || 0);
    
    const gastoAlmuerzo = unformatNumber(valorAlmuerzo);
    const gastoGasolina = unformatNumber(valorGasolina);
    const efectivoEntregadoReal = unformatNumber(efectivoFisico) * 1000;

    // GANANCIA NETA O PERDIDA NETA
    const ganancia_vendedor = recaude_abono - (gastoAlmuerzo + gastoGasolina) - surtido;

    const prestamoOTransferencia = 0;
    const total_cartera_fecha = debe_ruta - venta_hoy;

    const handleFinalizar = async () => {
        // Quitamos el "if (isClosed) return;" para que permita volver a guardar siempre

        const confirmed = await alertConfirmUsers(
            isClosed ? "¿Actualizar Liquidación?" : "¿Finalizar Liquidación?",
            "Verifica que los nuevos valores sean correctos."
        );

        if (!confirmed) return;

        try {
            setIsSaving(true);
            const settlementData = {
                user_id: data?.user_id,
                total_recaudado: recaude_abono,
                ventas_totales: surtido,
                cartera_anterior: debe_ruta,
                valor_almuerzo: gastoAlmuerzo * 1000,
                valor_gasolina: gastoGasolina * 1000,
                ganancia_vendedor: ganancia_vendedor,
                efectivo_fisico: efectivoEntregadoReal,
                diferencia: ganancia_vendedor + efectivoEntregadoReal,
                status: 'LIQUIDADO' // Mantenemos el estatus para que el backend sepa que está asentado
            };

            await returnsService.settleOrder(orderId, settlementData);
            await alertSuccess(
                isClosed ? "Liquidación actualizada" : "Liquidación guardada", 
                "Los datos se han registrado con éxito."
            );
            
            // En vez de redirigir inmediatamente, volvemos a consultar para ver los datos frescos actualizados
            await fetchSettlementData();
        } catch (error) {
            alertError("Error al guardar", error.message || "Ocurrió un problema al guardar los datos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="settlement-container">
            <table className="settlement-table">
                <tbody>
                    {/* 1. COBRO */}
                    <tr>
                        <td className="label-cell">COBRO</td>
                        <td className="value-cell">${recaude_abono.toLocaleString()}</td>
                    </tr>
                    
                    {/* 2. ALMUERZO */}
                    <tr>
                        <td className="label-cell">ALMUERZO</td>
                        <td className="value-cell input-cell">
                            <span className="currency-symbol">$</span>
                            <input
                                type="text"
                                value={valorAlmuerzo}
                                onChange={(e) => handleInputChange(e.target.value, setValorAlmuerzo)}
                                placeholder="0"
                                // YA NO ESTÁ DISABLED
                            />
                        </td>
                    </tr>

                    {/* 3. GASOLINA */}
                    <tr>
                        <td className="label-cell">GASOLINA</td>
                        <td className="value-cell input-cell">
                            <span className="currency-symbol">$</span>
                            <input
                                type="text"
                                value={valorGasolina}
                                onChange={(e) => handleInputChange(e.target.value, setValorGasolina)}
                                placeholder="0"
                                // YA NO ESTÁ DISABLED
                            />
                        </td>
                    </tr>

                    {/* 4. SURTIDO */}
                    <tr>
                        <td className="label-cell">SURTIDO</td>
                        <td className="value-cell">${surtido.toLocaleString()}</td>
                    </tr>

                    {/* 5. GANANCIA / PERDIDA NETA */}
                    <tr className={ganancia_vendedor < 0 ? "loss-row" : "highlight-row"}>
                        <td className="label-cell">
                            {ganancia_vendedor < 0 ? "PERDIDA NETA" : "GANANCIA NETA"}
                        </td>
                        <td className="value-cell">
                            ${ganancia_vendedor.toLocaleString()}
                        </td>
                    </tr>

                    {/* EFECTIVO A ENTREGAR */}
                    <tr>
                        <td className="label-cell">EFECTIVO A ENTREGAR</td>
                        <td className="value-cell input-cell">
                            <span className="currency-symbol">$</span>
                            <input
                                type="text"
                                value={efectivoFisico} 
                                onChange={(e) => handleInputChange(e.target.value, setEfectivoFisico)}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                // YA NO ESTÁ DISABLED
                            />
                        </td>
                    </tr>
                    
                    {/* PRESTAMO O TRANSFERENCIA */}
                    <tr>
                        <td className="label-cell">PRESTAMO O TRANSFERENCIA</td>
                        <td className="value-cell">${prestamoOTransferencia.toLocaleString()}</td>
                    </tr>

                    {/* 6. TOTAL CARTERA FECHA
                    <tr>
                        <td className="label-cell">TOTAL CARTERA FECHA</td>
                        <td className="value-cell">${debe_ruta.toLocaleString()}</td>
                    </tr>*/}

                    {/* 7. TOTAL CARTERA SIGUIENTE SEMANA */}
                    <tr>
                        <td className="label-cell">TOTAL CARTERA SIGUIENTE SEMANA</td>
                        <td className="value-cell">${debe_ruta.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div className="button-container">
                <button
                    className="btn-submit" // Quitamos la clase 'closed' condicional para que mantenga su estilo activo
                    onClick={handleFinalizar}
                    disabled={isSaving}
                >
                    {isSaving ? "GUARDANDO..." : isClosed ? "ACTUALIZAR LIQUIDACIÓN" : "FINALIZAR LIQUIDACIÓN"}
                </button>
            </div>
        </div>
    );
};

export default SettlementModule;