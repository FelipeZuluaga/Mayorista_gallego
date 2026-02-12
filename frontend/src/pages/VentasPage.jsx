import { useEffect, useState, useMemo } from "react";
import { orderService } from "../services/orderService";
import { saleService } from "../services/saleService";
import { alertSuccess, alertError } from "../services/alertService";
import { customerService } from "../services/customerService";
import {
    ArrowRight,
    ChevronLeft,
    Save,
    ShoppingCart,
    X,
    Info,
    FileText, // <--- Agrega esta línea aquí
    UserPlus,    // <--- Agregado
    ChevronUp,   // <--- Agregado
    ChevronDown  // <--- Agregado
} from "lucide-react";
import "../styles/ventas.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function VentasPage() {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [planilla, setPlanilla] = useState([]);

    // Estados para la Modal
    const [showModal, setShowModal] = useState(false);
    const [clienteActualIdx, setClienteActualIdx] = useState(null);

    const user = JSON.parse(localStorage.getItem("user"));
    const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay());
    const [filtros] = useState({ id: "", vendedor: "", tipoCliente: "" });

    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: "", address: "", phone: "", afterCustomerId: "" });

    useEffect(() => { loadPendingOrders(); }, []);
    

    const loadPendingOrders = async () => {
        try {
            setLoading(true);
            const queryParams = { id: user.id, role: user.role, name: user.role === 'ADMINISTRADOR' ? "" : user.name };
            const data = await orderService.getOrdersHistory(queryParams);
            setPendingOrders(data.filter(o => o.status === "DESPACHADO"));
        } catch (err) { alertError("Error", "No se cargaron los despachos."); }
        finally { setLoading(false); }
    };

    const handleSelectOrder = async (order) => {
        try {
            setLoading(true);
            const items = await orderService.getOrderDetail(order.id);
            setSelectedOrder(order);
            setOrderItems(items);

            // INTENTAR CARGAR DESDE LOCALSTORAGE
            const guardado = localStorage.getItem(`planilla_${order.id}`);

            if (guardado) {
                setPlanilla(JSON.parse(guardado));
            } else {
                // Si no hay nada guardado, cargamos de la API como antes
                const clientesBase = await customerService.getBalances();
                const inicializarPlanilla = clientesBase.map(c => ({
                    id: c.id,
                    address: c.customer_address || "",
                    name: c.customer_name,
                    phone: c.phone || "",
                    status: "",
                    deuda_previa: Number(c.total_debt || 0),
                    pago_compra: "",
                    abono_deuda: "",
                    productos: {},
                    facturaBlob: null
                }));
                setPlanilla(inicializarPlanilla);
            }
        } catch (err) {
            alertError("Error", "No se pudo cargar la ruta.");
        } finally {
            setLoading(false);
        }
    };


    // --- FUNCIÓN PARA GENERAR EL PDF ---
    const generarPDFVenta = (cliente) => {
        const doc = new jsPDF();
        const totalVenta = calcularTotalFila(cliente);

        // Encabezado
        doc.setFontSize(18);
        doc.text("FACTURA DE VENTA", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);
        doc.text(`Vendedor: ${selectedOrder.seller_name}`, 20, 35);
        doc.text(`Cliente: ${cliente.name}`, 20, 45);
        doc.text(`Dirección: ${cliente.address}`, 20, 50);

        // Tabla de productos
        const tableRows = [];
        Object.entries(cliente.productos).forEach(([id, cant]) => {
            if (cant > 0) {
                const p = orderItems.find(i => i.product_id === parseInt(id));
                tableRows.push([
                    p.product_name,
                    cant,
                    `$${p.unit_price.toLocaleString()}`,
                    `$${(cant * p.unit_price).toLocaleString()}`
                ]);
            }
        });
        autoTable(doc, {
            startY: 55,
            head: [['Producto', 'Cant', 'Precio', 'Subtotal']],
            body: tableRows,
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.text(`TOTAL VENTA: $${totalVenta.toLocaleString()}`, 140, finalY);

        return doc.output('blob');
    };
    const confirmarVentaModal = () => {
        const cliente = planilla[clienteActualIdx];
        const totalVenta = calcularTotalFila(cliente);

        if (totalVenta > 0 || Number(cliente.abono_deuda) > 0) {
            const pdfBlob = generarPDFVenta(cliente);
            const pdfUrl = URL.createObjectURL(pdfBlob);

            const nuevaPlanilla = [...planilla];
            nuevaPlanilla[clienteActualIdx].facturaBlob = pdfUrl;
            setPlanilla(nuevaPlanilla);
        }
        setShowModal(false);
    };
    const descargarFactura = (url, nombreCliente) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Factura_${nombreCliente.replace(/\s+/g, '_')}.pdf`;
        link.click();
    };
    // --- LÓGICA DE MODAL Y VENTAS ---
    const abrirModalVenta = (idx) => {
        setClienteActualIdx(idx);
        setShowModal(true);
    };

    const updateCantidadVenta = (prodId, nuevaCant) => {
        const itemStock = orderItems.find(i => i.product_id === prodId);
        const cantidadInput = parseInt(nuevaCant) || 0;

        if (cantidadInput > itemStock.quantity) {
            alertError("Sin Stock", `Solo tienes ${itemStock.quantity} en el camión.`);
            return;
        }

        const nuevaPlanilla = [...planilla];
        nuevaPlanilla[clienteActualIdx].productos[prodId] = cantidadInput;
        setPlanilla(nuevaPlanilla);
    };

    const calcularTotalFila = (cliente) => {
        return Object.entries(cliente.productos).reduce((sum, [prodId, cant]) => {
            const item = orderItems.find(i => i.product_id === parseInt(prodId));
            return sum + (cant * (item?.unit_price || 0));
        }, 0);
    };

    const updateCelda = (clienteIdx, campo, valor) => {
        const nuevaPlanilla = [...planilla];
        nuevaPlanilla[clienteIdx][campo] = valor;
        setPlanilla(nuevaPlanilla);
    };

    const ordenesFiltradas = useMemo(() => {
        return pendingOrders.filter(order => {
            if (!order.created_at) return false;
            const coincideDia = new Date(order.created_at).getDay() === diaSeleccionado;
            return coincideDia;
        });
    }, [pendingOrders, diaSeleccionado]);

    const handleConfirmarTodo = async () => {
        const ventasRealizadas = planilla.filter(c =>
            Object.keys(c.productos).length > 0 || c.abono_deuda > 0 || c.status !== "PENDIENTE"
        );

        if (ventasRealizadas.length === 0) return alertError("Aviso", "No hay movimientos.");

        try {
            setLoading(true);
            const payload = {
                order_id: selectedOrder.id,
                sales: ventasRealizadas.map(v => ({
                    customers_id: v.id,
                    customer_address: v.address,
                    customer_name: v.name,
                    customer_phone: v.phone,
                    visit_status: v.status,
                    total_amount: calcularTotalFila(v),
                    amount_paid: Number(v.pago_compra) || 0,
                    credit_amount: Number(v.abono_deuda) || 0,
                    // Asegúrate de enviar solo los productos con cantidad > 0
                    items: Object.entries(v.productos)
                        .filter(([_, cant]) => cant > 0)
                        .map(([id, cant]) => {
                            const p = orderItems.find(i => i.product_id === parseInt(id));
                            return {
                                product_id: p.product_id,
                                quantity: cant,
                                unit_price: p.unit_price,
                                total_price: cant * p.unit_price // <--- ESTO SOLUCIONA EL ERROR 500
                            };
                        })
                }))
            };
            await saleService.createSale(payload);
            alertSuccess("Éxito", "Planilla sincronizada.");
            setSelectedOrder(null);
            loadPendingOrders();
        } catch (err) {
            console.error(err); // Esto te dirá en la consola el error exacto del servidor
            alertError("Error", "Error al sincronizar con el servidor.");
        }
        finally { setLoading(false); }
    };
    const handleAddCustomer = (e) => {
        e.preventDefault();

        const nuevoRegistro = {
            id: "NEW-" + Date.now(), // ID temporal único
            address: newCustomer.address,
            name: newCustomer.name,
            phone: newCustomer.phone,
            status: "VISITADO",
            deuda_previa: 0,
            pago_compra: "",
            abono_deuda: "",
            productos: {},
            facturaBlob: null
        };
        // Si no se seleccionó nadie, va al final. Si se seleccionó, se inserta después.
        if (newCustomer.afterCustomerId === "") {
            setPlanilla([...planilla, nuevoRegistro]);
        } else {
            const index = planilla.findIndex(c => c.id === newCustomer.afterCustomerId);
            const nuevaLista = [...planilla];
            nuevaLista.splice(index + 1, 0, nuevoRegistro); // Inserta en la posición siguiente
            setPlanilla(nuevaLista);
        }

        setShowAddCustomerModal(false);
        setNewCustomer({ name: "", address: "", phone: "", afterCustomerId: "" });
    };

    // Componente Modal Interno
    const ModalProductos = () => {
        if (clienteActualIdx === null) return null;
        const cliente = planilla[clienteActualIdx];

        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <div>
                            <h3>Venta: {cliente.name}</h3>
                            <p className="text-muted">{cliente.address}</p>
                        </div>
                        <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
                    </div>

                    <div className="modal-body">
                        <table className="modal-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Stock Camión</th>
                                    <th>Precio Base</th>
                                    <th>Cantidad</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderItems.map((item) => {
                                    const cant = cliente.productos[item.product_id] || 0;
                                    return (
                                        <tr key={item.product_id}>
                                            <td>{item.product_name}</td>
                                            <td className="stock-count">{item.quantity}</td>
                                            <td>${item.unit_price.toLocaleString()}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input-qty-modal"
                                                    value={cant}
                                                    min="0"
                                                    onChange={(e) => updateCantidadVenta(item.product_id, e.target.value)}
                                                />
                                            </td>
                                            <td className="subtotal-modal">${(cant * item.unit_price).toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="modal-footer">
                        <div className="total-label">
                            TOTAL VENTA: <span className="price-big">${calcularTotalFila(cliente).toLocaleString()}</span>
                        </div>
                        <button className="btn-confirm-modal" onClick={confirmarVentaModal}>Generar y Confirmar</button>
                    </div>
                </div>
            </div>
        );
    };
    if (loading) return <div className="loading-screen">Cargando...</div>;

    return (
        <div className="ventas-container">
            {showModal && <ModalProductos />}

            {
                showAddCustomerModal && (
                    <div className="modal-overlay">
                        <div className="modal-content customer-modal">
                            <div className="modal-header">
                                <h3>Registrar Nuevo Cliente en Ruta</h3>
                                <button className="btn-close" onClick={() => setShowAddCustomerModal(false)}><X /></button>
                            </div>
                            <form onSubmit={handleAddCustomer}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Nombre Completo</label>
                                        <input
                                            required
                                            type="text"
                                            className="form-control"
                                            value={newCustomer.name}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Dirección</label>
                                        <input
                                            required
                                            type="text"
                                            className="form-control"
                                            value={newCustomer.address}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Teléfono / Celular</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newCustomer.phone}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <label>Ubicación en la ruta (Insertar después de:)</label>
                                <select
                                    className="form-control"
                                    value={newCustomer.afterCustomerId}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, afterCustomerId: e.target.value })}
                                >
                                    <option value="">-- Al final de la lista --</option>
                                    {planilla.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            Después de: {c.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="modal-footer">
                                    <button type="button" className="btn-cancel" onClick={() => setShowAddCustomerModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn-confirm-modal">Agregar a la Tabla</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {!selectedOrder ? (
                <div className="ruta-selection">
                    <h1>{user.role === 'ADMINISTRADOR' ? 'Control de Ventas' : 'Mis Rutas'}</h1>
                    <div className="dias-selector-container">
                        {DIAS_SEMANA.map((dia, index) => (
                            <button key={dia} onClick={() => setDiaSeleccionado(index)} className={`btn-dia ${diaSeleccionado === index ? 'selected' : ''}`}>{dia}</button>
                        ))}
                    </div>
                    <div className="table-wrapper">
                        <table className="ventas-table">
                            <thead>
                                <tr>
                                    <th>ID Despacho</th>
                                    <th>Vendedor</th>
                                    <th>Total Carga</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordenesFiltradas.map(o => (
                                    <tr key={o.id}>
                                        <td>#{o.id}</td>
                                        <td>{o.seller_name}</td>
                                        <td>${Number(o.total_amount).toLocaleString()}</td>
                                        <td><button className="btn-main" onClick={() => handleSelectOrder(o)}>Abrir Planilla <ArrowRight size={16} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="planilla-excel-view">
                    <div className="header-actions">
                        <div className="header-left">
                            <button onClick={() => setSelectedOrder(null)} className="btn-back-list">
                                <ChevronLeft size={20} />
                                <span>Volver</span>
                            </button>
                        </div>

                        <div className="header-center">
                            <h3 className="ruta-title">Hoja de Ruta: {selectedOrder.seller_name}</h3>
                            <p className="ruta-subtitle">GESTIÓN DE VENTAS Y RECAUDOS</p>
                        </div>

                        <div className="header-right">
                            {/* Botón Nuevo Cliente */}
                            <button onClick={() => setShowAddCustomerModal(true)} className="btn-add-customer">
                                <UserPlus size={20} />
                                <span>Nuevo Cliente</span>
                            </button>
                            <button onClick={handleConfirmarTodo} className="btn-confirm-all">
                                <Save size={20} />
                                <span>Guardar Todo</span>
                            </button>
                        </div>
                    </div>

                    <div className="planilla-wrapper">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th>COD</th>
                                    <th>DIRECCIÓN</th>
                                    <th>NOMBRE</th>
                                    <th>ESTADO</th>
                                    <th>PRODUCTOS</th>
                                    <th>PAGO VENTA</th>
                                    <th>DEBE</th>
                                    <th>ABONO</th>
                                    <th>TOTAL</th>
                                    <th>FACTURA</th>
                                    <th>CELULAR</th>

                                </tr>
                            </thead>
                            <tbody>
                                {planilla.map((cliente, idx) => {
                                    const totalVentaHoy = calcularTotalFila(cliente);
                                    const nuevoSaldo = (cliente.deuda_previa + totalVentaHoy) - (Number(cliente.pago_compra) + Number(cliente.abono_deuda));

                                    // --- LÓGICA DE CLASE Y BLOQUEO ---
                                    const estadoClase = `fila-${cliente.status.toLowerCase()}`;
                                    const esLleso = cliente.status === "LLESO";

                                    return (
                                        <tr key={idx} className={estadoClase}> {/* AGREGAMOS LA CLASE AQUÍ */}

                                            <td className="code-col">{cliente.id}</td>
                                            <td className="address-col">{cliente.address}</td>
                                            <td className="name-col">{cliente.name}</td>
                                            <td>
                                                <select
                                                    value={cliente.status}
                                                    onChange={(e) => updateCelda(idx, "status", e.target.value)}
                                                    className="status-select-mini"
                                                >
                                                    <option value=""></option>
                                                    <option value="PENDIENTE">PENDIENTE</option>
                                                    <option value="VISITADO">VISITADO</option>
                                                    <option value="LLESO">LLESO</option>
                                                </select>
                                            </td>
                                            <td>
                                                <button
                                                    disabled={esLleso} // BLOQUEO
                                                    className={`btn-vender ${totalVentaHoy > 0 ? 'con-venta' : ''}`}
                                                    onClick={() => abrirModalVenta(idx)}
                                                >
                                                    <ShoppingCart size={14} />
                                                    {totalVentaHoy > 0 ? ` $${totalVentaHoy.toLocaleString()}` : ' Vender'}
                                                </button>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={cliente.pago_compra}
                                                    disabled={esLleso} // BLOQUEO
                                                    onChange={(e) => updateCelda(idx, "pago_compra", e.target.value)}
                                                />
                                            </td>
                                            <td>${cliente.deuda_previa.toLocaleString()}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={cliente.abono_deuda}
                                                    disabled={esLleso} // BLOQUEO
                                                    onChange={(e) => updateCelda(idx, "abono_deuda", e.target.value)}
                                                />
                                            </td>
                                            <td className={`total-cell ${nuevoSaldo > 0 ? 'deuda' : 'saldo-ok'}`}>
                                                ${nuevoSaldo.toLocaleString()}
                                            </td>
                                            <td>
                                                {cliente.facturaBlob && (
                                                    <a href={cliente.facturaBlob} download={`Factura_${cliente.name}.pdf`} className="btn-download-pdf">
                                                        <FileText size={16} /> PDF
                                                    </a>
                                                )}
                                            </td>
                                            <td className="name-col">{cliente.phone}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}