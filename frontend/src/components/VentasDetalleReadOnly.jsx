import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, FileText, Printer } from "lucide-react";

export default function VentasDetalleReadOnly() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const sale = state?.saleData;

    if (!sale) return <p>No se encontró información de la ruta.</p>;

    // Simulamos la estructura de la planilla a partir de los items de la venta
    // Nota: El backend debe devolver los items en la respuesta de historial
    const items = sale.items || []; 

    return (
        <div className="planilla-excel-view" style={{ padding: '20px' }}>
            <div className="header-actions">
                <button onClick={() => navigate(-1)} className="btn-back-list">
                    <ChevronLeft size={20} /> Volver al Historial
                </button>
                <div className="header-center">
                    <h3 className="ruta-title">Consulta de Ruta: #{sale.id}</h3>
                    <p className="ruta-subtitle">VENDEDOR: {sale.seller_name} | FECHA: {new Date(sale.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => window.print()} className="btn-confirm-all" style={{ background: '#64748b' }}>
                    <Printer size={20} /> Imprimir Vista
                </button>
            </div>

            <div className="planilla-wrapper">
                <table className="excel-table">
                    <thead>
                        <tr>
                            <th>CLIENTE</th>
                            <th>DIRECCIÓN</th>
                            <th>ESTADO</th>
                            <th>VENTA TOTAL</th>
                            <th>PAGO RECIBIDO</th>
                            <th>DEUDA PREVIA</th>
                            <th>ABONO</th>
                            <th>SALDO FINAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="name-col">{sale.name}</td>
                            <td className="address-col">{sale.address}</td>
                            <td><span className="badge-status">{sale.visit_status}</span></td>
                            <td className="text-right">${Number(sale.total_amount).toLocaleString()}</td>
                            <td className="text-right">${Number(sale.amount_paid).toLocaleString()}</td>
                            <td className="text-right">${Number(sale.previous_debt || 0).toLocaleString()}</td>
                            <td className="text-right" style={{ color: '#3182ce', fontWeight: 'bold' }}>
                                ${Number(sale.credit_amount).toLocaleString()}
                            </td>
                            <td className={`total-cell ${sale.total_debt > 0 ? 'deuda' : 'saldo-ok'}`}>
                                ${Number(sale.total_debt).toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h4 style={{ marginTop: '30px', color: '#475569' }}>Detalle de Productos Entregados</h4>
            <div className="inv-card">
                <table className="inv-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => (
                            <tr key={i}>
                                <td>{item.product_name}</td>
                                <td>{item.quantity}</td>
                                <td>${Number(item.unit_price).toLocaleString()}</td>
                                <td>${(item.quantity * item.unit_price).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}