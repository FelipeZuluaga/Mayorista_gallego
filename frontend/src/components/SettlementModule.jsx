import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { orderService } from '../services/orderService';
// Importamos tus alertas personalizadas
import { alertSuccess, alertError, alertConfirmUsers } from '../services/alertService'; 

const SettlementModule = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); 
    
    const totalSurtidoDesdePlanilla = location.state?.totalSurtido;

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

    const recaude_abono = parseFloat(data?.total_recaudado || 0);
    const debe_ruta = parseFloat(data?.cartera_anterior || 0);
    const venta_hoy = totalSurtidoDesdePlanilla !== undefined ? parseFloat(totalSurtidoDesdePlanilla) : parseFloat(data?.ventas_totales_hoy || 0);
    const gastoAlmuerzo = parseFloat(valorAlmuerzo || 0);
    const gastoGasolina = parseFloat(valorGasolina || 0);
    const efectivoEntregadoReal = parseFloat(efectivoFisico || 0);

    const ganancia_vendedor = recaude_abono - venta_hoy - (gastoAlmuerzo + gastoGasolina);
    const falta = ganancia_vendedor + efectivoEntregadoReal;
    const totalSaldoFinal = debe_ruta + venta_hoy - recaude_abono;

    // FUNCIÓN MEJORADA CON SWEETALERT
    const handleFinalizar = async () => {
        if (isClosed) return;

        // 1. Pedir confirmación antes de proceder
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
                diferencia: falta,
                status: 'LIQUIDADO'
            };

            await orderService.settleOrder(orderId, settlementData);
            
            // 2. Alerta de éxito profesional
            await alertSuccess("Liquidación guardada", "Los datos se han registrado con éxito.");
            
            navigate(`/ventas-detalle/${orderId}`);
        } catch (error) {
            // 3. Alerta de error clara
            alertError("Error al finalizar", error.message || "Ocurrió un problema al guardar los datos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container py-4" style={{ maxWidth: '650px' }}>
            <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
                <div className={`p-4 text-center ${isClosed ? 'bg-secondary' : 'bg-primary'} text-white`}>
                    <p className="text-uppercase mb-1 fw-bold opacity-75 small">Módulo de Liquidación</p>
                    <h4 className="mb-0 fw-bold">
                        {isClosed ? `RUTA #${orderId} - CERRADA` : `CIERRE DE CAJA #${orderId}`}
                    </h4>
                </div>

                <div className="card-body p-4 bg-light">
                    <div className="bg-white p-3 rounded-3 shadow-sm mb-4">
                        <div className="row align-items-center">
                            <div className="col-7 border-end">
                                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>TOTAL CARTERA FECHA: </small>
                                <span className="h5 mb-0 text-dark">$ {debe_ruta.toLocaleString()}</span>
                            </div>
                            <div className="col-5">
                                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>TOTAL CARTERA SIGUIENTE SEMANA: </small>
                                <span className="h5 mb-0 text-success fw-bold">$ {recaude_abono.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <h6 className="fw-bold mb-3 text-muted px-1">Gastos de Ruta (en Miles)</h6>
                    <div className="row g-3 mb-4">
                        <div className="col-6">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">🍱</span>
                                <div className="form-floating">
                                    <input 
                                        type="number" 
                                        className="form-control border-start-0 ps-0" 
                                        id="almuerzo" 
                                        placeholder="0"
                                        value={valorAlmuerzo}
                                        onChange={(e) => setValorAlmuerzo(e.target.value)}
                                        disabled={isClosed}
                                    />
                                    <label htmlFor="almuerzo">Almuerzo</label>
                                </div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">⛽</span>
                                <div className="form-floating">
                                    <input 
                                        type="number" 
                                        className="form-control border-start-0 ps-0" 
                                        id="gasolina" 
                                        placeholder="0"
                                        value={valorGasolina}
                                        onChange={(e) => setValorGasolina(e.target.value)}
                                        disabled={isClosed}
                                    />
                                    <label htmlFor="gasolina">Gasolina</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-3 mb-4">
                        <div className="col-12">
                            <div className="d-flex justify-content-between align-items-center bg-white p-3 rounded-3 shadow-sm">
                                <div>
                                    <small className="text-muted d-block fw-bold" style={{fontSize: '0.7rem'}}>SURTIDO</small>
                                    <span className="h5 fw-bold text-danger">-$ {venta_hoy.toLocaleString()}</span>
                                </div>
                                <div className="text-end">
                                    <small className="text-muted d-block fw-bold" style={{fontSize: '0.7rem'}}>GANANCIA NETA</small>
                                    <span className="h5 fw-bold text-dark">$ {ganancia_vendedor.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-4 shadow-sm border border-primary border-2 mb-4 text-center">
                        <label className="form-label fw-bold text-primary text-uppercase mb-3">COBRO</label>
                        <div className="d-flex align-items-center justify-content-center">
                            <span className="display-6 fw-bold text-primary me-2">$</span>
                            <input
                                type="number"
                                className="form-control form-control-lg text-center border-0 fw-bold p-0"
                                style={{ fontSize: '3rem', width: '200px', outline: 'none', boxShadow: 'none' }}
                                value={efectivoFisico}
                                onChange={(e) => setEfectivoFisico(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                disabled={isClosed}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <button
                        className={`btn ${isClosed ? 'btn-secondary' : 'btn-primary'} btn-lg w-100 py-3 rounded-3 fw-bold shadow`}
                        onClick={handleFinalizar}
                        disabled={isClosed || isSaving}
                    >
                        {isClosed ? (
                            <span><i className="bi bi-check-circle-fill me-2"></i>ORDEN LIQUIDADA</span>
                        ) : isSaving ? (
                            <span><span className="spinner-border spinner-border-sm me-2"></span>GUARDANDO...</span>
                        ) : (
                            "FINALIZAR LIQUIDACIÓN"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettlementModule;