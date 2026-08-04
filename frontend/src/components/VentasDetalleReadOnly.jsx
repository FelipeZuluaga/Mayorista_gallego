import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Printer, MapPin, Phone, FileText } from "lucide-react";
import { settlementService } from "../services/settlementService";
import { saleService } from "../services/saleService";
import { alertError } from "../services/alertService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function VentasDetalleReadOnly() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [rutaData, setRutaData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [settlement, setSettlement] = useState(null);
    const [headerInfo, setHeaderInfo] = useState({ seller_name: "", date: "" });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [dataPlanilla, dataSettlement] = await Promise.all([
                    
                    saleService.getRutaCompleta(orderId),
                    settlementService.getSettlementByOrder(orderId)
                ]);

                setRutaData(dataPlanilla);
                setSettlement(dataSettlement);

                // Prioridad 1: Datos de la planilla (registros de ventas)
                // Prioridad 2: Datos de la liquidación consolidada
                const nombreVendedor =
                    dataPlanilla[0]?.vendedor_nombre ||
                    dataSettlement?.seller_name ||
                    "VENDEDOR DESCONOCIDO";

                // IMPORTANTE: Usar la fecha de la base de datos
                const fechaRuta =
                    dataPlanilla[0]?.fecha_venta ||
                    dataSettlement?.created_at;

                setHeaderInfo({
                    seller_name: nombreVendedor,
                    date: fechaRuta ? new Date(fechaRuta).toLocaleDateString() : "FECHA NO DISPONIBLE"
                });

            } catch (err) {
                // ... error handling
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orderId]);

    // --- FUNCIÓN PARA GENERAR EL TICKET (FORMATO 80MM) ---
    const generarFacturaTicket = (item) => {
        // Definimos el ancho real de la impresora térmica estándar
        const pageWidth = 58;
        const doc = new jsPDF({
            unit: "mm",
            format: [pageWidth, 200] // Altura flexible de 200mm
        });

        const margin = 4; // Margen izquierdo/derecho pequeño para aprovechar el papel
        const contentWidth = pageWidth - (margin * 2);

        // --- ENCABEZADO ---
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("MAYORISTA GALLEGO", pageWidth / 2, 8, { align: "center" });

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("--------------------------------------------------", pageWidth / 2, 11, { align: "center" });

        // Información del servicio y cliente
        doc.text(`FECHA: ${headerInfo.date}`, margin, 15);
        doc.text(`VENDEDOR: ${headerInfo.seller_name.toUpperCase()}`, margin, 18);
        doc.text(`CLIENTE: ${item.nombre_cliente.toUpperCase()}`, margin, 21);
        doc.text(`DIR: ${String(item.direccion || "N/A").substring(0, 30)}`, margin, 24);
        doc.text("--------------------------------------------------", pageWidth / 2, 27, { align: "center" });

        // --- TABLA DE PRODUCTOS ---
        // Usamos los datos procesados del backend
        const productosParaTabla = (item.productos_detalle && item.productos_detalle.length > 0)
            ? item.productos_detalle.map(prod => [
                String(prod.nombre).toUpperCase(),
                prod.cantidad,
                `$${Number(prod.total_precio || 0).toLocaleString()}`
            ])
            : [['VENTA DEL DÍA', '1', `$${Number(item.venta || 0).toLocaleString()}`]];

        autoTable(doc, {
            startY: 29,
            theme: 'plain',
            margin: { left: margin, right: margin },
            styles: {
                fontSize: 6.5, // Tamaño reducido para 58mm
                cellPadding: 0.5,
                overflow: 'linebreak'
            },
            head: [['ARTICULO', 'CANT', 'TOTAL']],
            body: productosParaTabla,
            columnStyles: {
                0: { cellWidth: 26 }, // Nombre del producto
                1: { cellWidth: 7, halign: 'center' }, // Cantidad
                2: { cellWidth: 17, halign: 'right' } // Total
            },
            headStyles: { fontStyle: 'bold' }
        });

        // --- RESUMEN DE CUENTA ---
        let finalY = doc.lastAutoTable.finalY + 3;
        doc.setFontSize(7);
        doc.text("--------------------------------------------------", pageWidth / 2, finalY, { align: "center" });

        finalY += 4;
        const colDerecha = pageWidth - margin; // El punto máximo a la derecha (54mm)

        doc.text("DEUDA ANTERIOR O ACTUAL:", margin, finalY);
        doc.text(`$${Number(item.debe || 0).toLocaleString()}`, colDerecha, finalY, { align: "right" });

        finalY += 3.5;
        doc.text("VENTA HOY (+):", margin, finalY);
        doc.text(`$${Number(item.venta || 0).toLocaleString()}`, colDerecha, finalY, { align: "right" });

        finalY += 3.5;
        doc.text("PAGO RECIBIDO (-):", margin, finalY);
        doc.text(`$${Number(item.abono || 0).toLocaleString()}`, colDerecha, finalY, { align: "right" });

        // --- SALDO TOTAL ---
        finalY += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("SALDO TOTAL:", margin, finalY);

        const saldoFinal = Number(item.debe || 0) - Number(item.abono || 0);
        doc.text(`$${saldoFinal.toLocaleString()}`, colDerecha, finalY, { align: "right" });

        finalY += 6;
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.text("¡Gracias por su compra!", pageWidth / 2, finalY, { align: "center" });

        // Guardar archivo
        doc.save(`Factura_${item.nombre_cliente.replace(/\s+/g, '_')}.pdf`);
    };
    const filteredData = rutaData.filter((item) => {
        const term = searchTerm.toLowerCase();
        return item.nombre_cliente?.toLowerCase().includes(term) || item.direccion?.toLowerCase().includes(term);
    });
    const formatCurrency = (value) => {
        // Si tus datos en la BD guardan 20000 como 20000, no dividas.
        // Si los guardan con 3 ceros extra por error, usa (Number(value) / 1000)
        const amount = Number(value) || 0;
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(amount);
    };
    if (loading) return <div className="inv-page">Cargando Planilla...</div>;

    const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });


    const totalSaldoFinal = filteredData.reduce((acc, item) => acc + (Number(item.venta || 0) + Number(item.debe || 0)), 0);

    // Por esto (dentro del componente antes del return):
    const fechaRutaFormateada = headerInfo.date;
    return (
        <div className="inv-page full-layout">
            <div className="header-actions">
                <div className="header-left">
                    <button onClick={() => navigate(-1)} className="btn-back-list"><ChevronLeft size={20} /> <span>Volver</span></button>
                    <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-search-planilla" />
                </div>
                <div className="header-center">
                    <h3 className="ruta-title">Hoja de Ruta: {headerInfo.seller_name}</h3>
                    <p className="ruta-subtitle">FECHA DE RUTA: {headerInfo.date.toUpperCase()}</p>
                </div>
                <div className="header-right">
                    <button onClick={() => window.print()} className="btn-confirm-all" style={{ background: '#64748b' }}><Printer size={20} /> <span>Imprimir</span></button>
                </div>
            </div>

            <div className="planilla-wrapper">
                <table className="excel-table">
                    <thead>
                        <tr><th>POS</th><th>DIRECCIÓN</th><th>CLIENTE</th><th>ESTADO</th><th>VENTA</th><th>DEBE</th><th>ABONO</th><th>TOTAL</th><th>FACTURA</th><th>TELÉFONO</th></tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item, idx) => {
                            const saldoFinal = Number(item.venta || 0) + Number(item.debe || 0)- Number(item.abono || 0);
                            return (
                                <tr key={idx} className={`fila-${item.estado?.toLowerCase()}`}>
                                    <td>{item.posicion || idx + 1}</td>
                                    <td><MapPin size={12} /> {item.direccion}</td>
                                    <td>{item.nombre_cliente}</td>
                                    <td><span className={`status-badge ${item.estado?.toLowerCase()}`}>{item.estado}</span></td>
                                    <td style={{ textAlign: 'right' }}>${Number(item.venta || 0).toLocaleString()}</td>
                                    <td style={{ textAlign: 'right' }}>${Number(item.debe || 0).toLocaleString()}</td>
                                    
                                    <td style={{ textAlign: 'right', color: '#3182ce' }}>${Number(item.abono || 0).toLocaleString()}</td>

                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${saldoFinal.toLocaleString()}</td>



                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => generarFacturaTicket(item)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                            <FileText size={18} color="#7a0d18" />
                                        </button>
                                    </td>
                                    <td><Phone size={12} /> {item.telefono}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>


            
            {/* TABLA DE LIQUIDACIÓN */}
            <div className="resumen-liquidacion" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                <table className="excel-table summary-table" style={{ width: '400px' }}>
                    <tbody>
                        {/* ... (filas anteriores de cartera y cobro se mantienen igual) */}
                        <tr><th>COBRO</th><td style={{ textAlign: 'right' }}>${Number(settlement?.total_recaudado || 0).toLocaleString()}</td></tr>

                        <tr><th>ALMUERZO</th><td style={{ textAlign: 'right' }}>${(Number(settlement?.valor_almuerzo || 0) / 1000).toLocaleString()}</td></tr>

                        <tr><th>GASOLINA</th><td style={{ textAlign: 'right' }}>${(Number(settlement?.valor_gasolina || 0) / 1000).toLocaleString()}</td></tr>

                        <tr><th>SURTIDO</th><td style={{ textAlign: 'right' }}>${Number(settlement?.ventas_totales || 0).toLocaleString()}</td></tr>

                        {/* FILA DINÁMICA: GANANCIA / PERDIDA */}
                        <tr style={{
                            backgroundColor: Number(settlement?.ganancia_vendedor || 0) < 0 ? '#fee2e2' : '#fef08a',
                            color: Number(settlement?.ganancia_vendedor || 0) < 0 ? '#dc2626' : 'inherit'
                        }}>
                            <th style={{ fontWeight: 'bold' }}>
                                {Number(settlement?.ganancia_vendedor || 0) < 0 ? 'PERDIDA NETA' : 'GANANCIA NETA'}
                            </th>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                ${Number(settlement?.ganancia_vendedor || 0).toLocaleString()}
                            </td>
                        </tr>
                        <tr style={{ borderTop: '2px solid #333' }}>
                            <th>EFECTIVO A ENTREGAR</th>
                            <td style={{ textAlign: 'right', color: '#2f855a' }}>
                                ${(Number(settlement?.efectivo_fisico || 0) / 1000).toLocaleString()}
                            </td>
                        </tr>     
                        <tr style={{ borderTop: '2px solid #333' }}>
                            <th>PRESTAMO O TRANSFERENCIA</th>
                            <td style={{ textAlign: 'right' }}>
                                ${(
                                    (Number(settlement?.total_recaudado || 0)) -
                                    (Number(settlement?.valor_almuerzo || 0) / 1000) -
                                    (Number(settlement?.valor_gasolina || 0) / 1000) -
                                    (Number(settlement?.efectivo_fisico || 0) / 1000)
                                ).toLocaleString()}
                            </td>
                        </tr>
                        <tr><th>TOTAL CARTERA FECHA</th><td style={{ textAlign: 'right' }}>${Number(settlement?.cartera_anterior || 0).toLocaleString()}</td></tr>
                        <tr><th>TOTAL CARTERA SIGUIENTE SEMANA</th><td style={{ textAlign: 'right' }}>${totalSaldoFinal.toLocaleString()}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}