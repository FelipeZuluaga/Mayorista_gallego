import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { alertSuccess, alertError, alertConfirmUsers } from '../services/alertService';
import '../styles/SettlementModule.css'; // Importamos el nuevo archivo CSS

const SettlementModule = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const totalSurtidoDesdePlanilla = location.state?.totalSurtido; 
// Ahora pasará a valer 88000 de forma fija y limpia.

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [efectivoFisico, setEfectivoFisico] = useState(0);
    const [valorAlmuerzo, setValorAlmuerzo] = useState(0);
    const [valorGasolina, setValorGasolina] = useState(0);

    useEffect(() => {
        const fetchSettlementData = async () => {
            try {
                const response = await orderService.settleOrder(orderId);
                setData(response);
                if (response.status === 'LIQUIDADO') {
                    setEfectivoFisico((response.efectivo_fisico || 0) / 1000);
                    setValorAlmuerzo((response.valor_almuerzo || 0) / 1000);
                    setValorGasolina((response.valor_gasolina || 0) / 1000);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error cargando liquidación:", error);
                setLoading(false);
            }
        };
        fetchSettlementData();
    }, [orderId]);

    const isClosed = data?.status === 'LIQUIDADO';
    if (loading) return <div className="p-5 text-center mt-5"><div className="spinner-border text-primary" role="status"></div><p className="mt-2">Calculando balance de ruta...</p></div>;



    //CALCULOS DE LA LIQUIDACIÓN DIARIA

    //COBRO
    const recaude_abono = parseFloat(data?.total_recaudado || 0);
    const debe_ruta = parseFloat(data?.cartera_anterior || 0);

    //SURTIDO ESPERAR QUE RESPONDAN CUAL PRECIO VA
    const venta_hoy = totalSurtidoDesdePlanilla !== undefined ? parseFloat(totalSurtidoDesdePlanilla) : parseFloat(data?.ventas_totales_hoy || 0);


    const gastoAlmuerzo = parseFloat(valorAlmuerzo || 0);
    const gastoGasolina = parseFloat(valorGasolina || 0);

    //EFECTIVO A ENTREGAR
    const efectivoEntregadoReal = parseFloat(efectivoFisico || 0);

    //GANANCIA NETA O PERDIDA NETA
    const ganancia_vendedor = recaude_abono - (gastoAlmuerzo + gastoGasolina) - venta_hoy;
    
    // Valores ficticios o mapeados desde tu backend según requieras
    const efectivoAEntregar = 0;
    const prestamoOTransferencia = 0;

    const handleFinalizar = async () => {
        if (isClosed) return;

        const confirmed = await alertConfirmUsers(
            "¿Finalizar Liquidación?",
            "Verifica que los valores sean correctos antes de continuar."
        );

        if (!confirmed) return;

        try {
            setIsSaving(true);
            const settlementData = {
                user_id: data?.user_id,
                total_recaudado: recaude_abono,
                ventas_totales: venta_hoy,
                cartera_anterior: debe_ruta,
                valor_almuerzo: gastoAlmuerzo * 1000,
                valor_gasolina: gastoGasolina * 1000,
                ganancia_vendedor: ganancia_vendedor,
                efectivo_fisico: efectivoEntregadoReal * 1000,
                diferencia: ganancia_vendedor + efectivoEntregadoReal,
                status: 'LIQUIDADO'
            };

            await orderService.settleOrder(orderId, settlementData);
            await alertSuccess("Liquidación guardada", "Los datos se han registrado con éxito.");
            navigate(`/ventas-detalle/${orderId}`);
        } catch (error) {
            alertError("Error al finalizar", error.message || "Ocurrió un problema al guardar los datos.");
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

                    {/*<tr>
                        <td className="label-cell">COBRO</td>
                        <td className="value-cell input-cell">
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                value={efectivoFisico}
                                onChange={(e) => setEfectivoFisico(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                disabled={isClosed}
                                placeholder="0"
                            />
                        </td>
                    </tr> */}

                    {/* 2. ALMUERZO */}
                    <tr>
                        <td className="label-cell">ALMUERZO</td>
                        <td className="value-cell input-cell">
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                value={valorAlmuerzo}
                                onChange={(e) => setValorAlmuerzo(e.target.value)}
                                disabled={isClosed}
                                placeholder="0"
                            />
                        </td>
                    </tr>

                    {/* 3. GASOLINA */}
                    <tr>
                        <td className="label-cell">GASOLINA</td>
                        <td className="value-cell input-cell">
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                value={valorGasolina}
                                onChange={(e) => setValorGasolina(e.target.value)}
                                disabled={isClosed}
                                placeholder="0"
                            />
                        </td>
                    </tr>

                    {/* 4. SURTIDO */}
                    <tr>
                        <td className="label-cell">SURTIDO</td>
                        <td className="value-cell">${venta_hoy.toLocaleString()}</td>
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

                    {/* EFECTIVO A ENTREGAR >*/}
                    <tr>
                        <td className="label-cell">EFECTIVO A ENTREGAR</td>
                        <td className="value-cell input-cell">
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                value={efectivoFisico}
                                onChange={(e) => efectivoAEntregar(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                disabled={isClosed}
                                placeholder="0"
                            />
                        </td>
                    </tr>
                    {/*<tr>
                        <td className="label-cell">EFECTIVO A ENTREGAR</td>
                        <td className="value-cell">${efectivoAEntregar.toLocaleString()}</td>
                    </tr>*/}

                    {/* PRESTAMO O TRANSFERENCIA */}
                    <tr>
                        <td className="label-cell">PRESTAMO O TRANSFERENCIA</td>
                        <td className="value-cell">${prestamoOTransferencia.toLocaleString()}</td>
                    </tr>

                    {/* 6. TOTAL CARTERA FECHA */}
                    <tr>
                        <td className="label-cell">TOTAL CARTERA FECHA</td>
                        <td className="value-cell">${debe_ruta.toLocaleString()}</td>
                    </tr>

                    {/* 7. TOTAL CARTERA SIGUIENTE SEMANA */}
                    <tr>
                        <td className="label-cell">TOTAL CARTERA SIGUIENTE SEMANA</td>
                        <td className="value-cell">${recaude_abono.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div className="button-container">
                <button
                    className={`btn-submit ${isClosed ? 'closed' : ''}`}
                    onClick={handleFinalizar}
                    disabled={isClosed || isSaving}
                >
                    {isClosed ? "ORDEN LIQUIDADA" : isSaving ? "GUARDANDO..." : "FINALIZAR LIQUIDACIÓN"}
                </button>
            </div>
        </div>
    );
};

export default SettlementModule;