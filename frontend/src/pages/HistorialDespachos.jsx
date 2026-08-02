import { useEffect, useState, useMemo } from "react";
import { orderService } from "../services/orderService";
import { inventoryService } from "../services/inventoryService";
import { alertError, alertSuccess, alertConfirm } from "../services/alertService";
import {
    ClipboardList, ShoppingBag,
    X, Eye, Edit3, Save, Trash2, Plus, Minus,
} from "lucide-react";
import "../styles/HistorialDespachos.css"; // <-- IMPORTACIÓN DEL CSS APARTE

export default function HistorialDespachos() {
    const [orders, setOrders] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
    const [passcode, setPasscode] = useState("");
    const [orderToDelete, setOrderToDelete] = useState(null);
    const SECURITY_CODE = "9988";
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);

    // ESTADOS DE EDICIÓN
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editForm, setEditForm] = useState({
        seller_name: "",
        items: []
    });

    const user = JSON.parse(localStorage.getItem("user"));
    const canManage = ["ADMINISTRADOR", "DESPACHADOR"].includes(user?.role?.toUpperCase());

    useEffect(() => {
        loadOrders();
        loadProducts();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await orderService.getOrdersHistory(user);
            setOrders(data || []);
        } catch (err) { alertError("Error", "No se cargaron los pedidos."); }
        finally { setLoading(false); }
    };

    const loadProducts = async () => {
        try {
            const data = await inventoryService.getProducts();
            setAllProducts(data || []);
        } catch (err) {
            console.error("Error cargando productos", err);
        }
    };

    const handleViewDetail = async (order) => {
        setSelectedOrder(order);
        try {
            const res = await orderService.getOrderDetail(order.id);
            setOrderItems(res || []);
        } catch (err) { alertError("Error", "No se pudo cargar el detalle."); }
    };

    const handleOpenEdit = async (order) => {
        try {
            const detail = await orderService.getOrderDetail(order.id);

            setEditingOrder(order);
            setEditForm({
                seller_name: order.seller_name || "",
                customer_type_id: order.customer_type_id,
                items: detail.map(i => ({
                    product_id: i.product_id,
                    product_name: i.product_name || i.name || "Producto desconocido",
                    quantity: Number(i.quantity),
                    unit_price: Number(i.unit_price)
                }))
            });
            setIsEditModalOpen(true);
        } catch (err) {
            alertError("Error", "No se pudo cargar el detalle.");
        }
    };

    const handleUpdateQty = (index, delta) => {
        const newItems = [...editForm.items];
        const newQty = newItems[index].quantity + delta;
        if (newQty > 0) {
            newItems[index].quantity = newQty;
            setEditForm({ ...editForm, items: newItems });
        }
    };

    const handleRemoveItem = async (index) => {
        const itemToRemove = editForm.items[index];

        const confirm = await alertConfirm(
            "¿Eliminar producto?",
            `¿Estás seguro de quitar "${itemToRemove.product_name}" de este pedido?`
        );

        if (confirm.isConfirmed) {
            const newItems = editForm.items.filter((_, i) => i !== index);
            setEditForm({ ...editForm, items: newItems });
        }
    };

    const handleAddItem = (productId) => {
        const prod = allProducts.find(p => p.id === parseInt(productId));
        if (!prod) return;

        if (editForm.items.find(i => i.product_id === prod.id)) {
            return alertError("Aviso", "El producto ya está en el pedido.");
        }

        setEditForm({
            ...editForm,
            items: [...editForm.items, {
                product_id: prod.id,
                product_name: prod.name,
                quantity: 1,
                unit_price: 0
            }]
        });
    };

    const handleSaveEdit = async () => {
        const itemsValidos = editForm.items
            .filter(it => it.product_id && !isNaN(it.product_id))
            .map(it => ({
                product_id: Number(it.product_id),
                quantity: Number(it.quantity)
            }));

        if (itemsValidos.length === 0) {
            return alertError("Error", "El pedido no tiene productos válidos.");
        }
        const confirm = await alertConfirm("¿Actualizar pedido?", "Se ajustará el stock automáticamente.");
        if (confirm.isConfirmed) {
            try {
                const payload = {
                    seller_name: editForm.seller_name,
                    customer_type_id: editingOrder.customer_type_id,
                    items: itemsValidos
                };

                await orderService.updateOrderFull(editingOrder.id, payload);

                alertSuccess("Éxito", "Pedido actualizado correctamente.");
                setIsEditModalOpen(false);
                loadOrders();
            } catch (err) {
                alertError("Error al guardar", err);
            }
        }
    };

    const handleDeleteOrder = async (order) => {
        if (user?.role?.toUpperCase() === 'DESPACHADOR') {
            setOrderToDelete(order);
            setIsPasscodeModalOpen(true);
            return;
        }

        const confirm = await alertConfirm("¿Eliminar pedido?", "Esta acción devolverá todos los productos al inventario.");
        if (confirm.isConfirmed) {
            executeDeletion(order.id);
        }
    };

    const executeDeletion = async (orderId) => {
        try {
            await orderService.deleteOrder(orderId);
            alertSuccess("Eliminado", "El pedido fue borrado y el stock restaurado.");
            loadOrders();
            setIsPasscodeModalOpen(false);
            setPasscode("");
        } catch (err) {
            alertError("Error", err);
        }
    };

    const handleVerifyCode = () => {
        if (passcode === SECURITY_CODE) {
            executeDeletion(orderToDelete.id);
        } else {
            alertError("Código Incorrecto", "El código de seguridad no es válido.");
            setPasscode("");
        }
    };

    const [filters, setFilters] = useState({
        fecha: "",
        tipoCliente: "",
        vendedor: "",
        despachador: ""
    });

    const filteredOrders = useMemo(() => {
        let baseOrders = orders;

        if (user?.role?.toUpperCase() !== 'ADMINISTRADOR' && user?.role?.toUpperCase() !== 'DESPACHADOR') {
            baseOrders = orders.filter(o => Number(o.seller_name) === Number(user.id));
        }

        return baseOrders.filter(o => {
            const matchesSearch = o.seller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.id.toString().includes(searchTerm);

            const d = new Date(o.created_at);
            const orderDateFormatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const matchesFecha = !filters.fecha || orderDateFormatted === filters.fecha;
            const matchesTipo = !filters.tipoCliente || o.customer_type_name?.toLowerCase() === filters.tipoCliente.toLowerCase();
            const matchesVendedor = !filters.vendedor || o.seller_name?.toString().toLowerCase().includes(filters.vendedor.toLowerCase());
            
            const dispatcherField = o.dispatcher_name || o.dispatcher || o.created_by_name || "";
            const matchesDespachador = !filters.despachador || dispatcherField.toLowerCase().includes(filters.despachador.toLowerCase());

            if (user?.role?.toUpperCase() === 'ADMINISTRADOR' || user?.role?.toUpperCase() === 'DESPACHADOR') {
                return matchesSearch && matchesFecha && matchesTipo && matchesVendedor && matchesDespachador;
            } else {
                return matchesSearch && matchesFecha;
            }
        });
    }, [orders, searchTerm, user, filters]);

    const stats = useMemo(() => {
        const role = user?.role?.toUpperCase();
        const totalPedidos = filteredOrders.length;
        const totalDinero = filteredOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
        const pedidosSocio = filteredOrders.filter(o => o.customer_type_name?.toUpperCase() === 'SOCIO').length;
        const pedidosNoSocio = filteredOrders.filter(o => o.customer_type_name?.toUpperCase() === 'NO_SOCIO').length;

        const config = {
            ADMINISTRADOR: [
                { label: "TOTAL PEDIDOS", value: totalPedidos, color: "#6366f1", icon: <ClipboardList size={20} />, sub: "Operaciones totales" },
                { label: "TOTAL DESPACHADO", value: `$${totalDinero.toLocaleString()}`, color: "#10b981", icon: <ShoppingBag size={20} />, sub: "Dinero ingresado" },
                { label: "TOTAL SOCIO", value: pedidosSocio, color: "#f59e0b", icon: <Plus size={20} />, sub: "Pedidos generales" },
                { label: "TOTAL NO SOCIO", value: pedidosNoSocio, color: "#ef4444", icon: <Minus size={20} />, sub: "Pedidos generales" }
            ],
            DESPACHADOR: [
                { label: "PEDIDOS DESPACHADOS", value: totalPedidos, color: "#6366f1", icon: <ClipboardList size={20} />, sub: "Listos para entrega" },
                { label: "VOLUMEN DESPACHO", value: `$${totalDinero.toLocaleString()}`, color: "#10b981", icon: <ShoppingBag size={20} />, sub: "Valor mercancía" }
            ],
            DEFAULT: [
                { label: "MIS PEDIDOS", value: totalPedidos, color: "#6366f1", icon: <ClipboardList size={20} />, sub: "Historial personal" }
            ]
        };

        return config[role] || config.DEFAULT;
    }, [filteredOrders, user]);

    const pageHeader = useMemo(() => {
        switch (user?.role?.toUpperCase()) {
            case 'ADMINISTRADOR':
                return { title: "Historial de Despachos cargados", subtitle: "Supervisión total de despachos" };
            case 'DESPACHADOR':
                return { title: "Historial de Mis Despachos cargados", subtitle: "Control de salida de mercancía y pedidos activos" };
            default:
                return { title: "Mis Pedidos Realizados", subtitle: "Historial personal de ventas y seguimiento" };
        }
    }, [user]);

    if (loading) return <div className="inv-page">Cargando panel de control...</div>;

    const formatFechaConDia = (fechaStr) => {
        const fecha = new Date(fechaStr);
        const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const opcionesDia = { weekday: 'long' };

        const fechaNum = fecha.toLocaleDateString('es-ES', opcionesFecha);
        const nombreDia = fecha.toLocaleDateString('es-ES', opcionesDia);

        return `${fechaNum} - ${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)}`;
    };

    return (
        <div className="inv-page full-layout">
            <div className="module-intro historial-header-container">
                <div className="historial-header-content">
                    <div className="historial-header-icon">
                        <ClipboardList size={28} />
                    </div>
                    <div>
                        <h1 className="historial-header-title">{pageHeader.title}</h1>
                        <p className="historial-header-subtitle">{pageHeader.subtitle}</p>
                    </div>
                </div>
            </div>

            {/* ESTADÍSTICAS */}
            <div className="inventory-stats inventory-stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card" style={{ borderLeft: `5px solid ${stat.color}` }}>
                        <div>
                            <span className="stat-label">{stat.label}</span>
                            <h2 className="stat-value">{stat.value}</h2>
                            <p className="stat-sub" style={{ color: stat.color }}>{stat.sub}</p>
                        </div>
                        <div className="stat-icon-wrapper" style={{ background: `${stat.color}15`, color: stat.color }}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* SECCIÓN DE FILTROS */}
            <div className="inv-card filters-card">
                <div className="filters-grid">

                    {/* FECHA */}
                    <div className="filter-group">
                        <label className="filter-group-label">FECHA</label>
                        <input
                            type="date"
                            className="input filter-input-full"
                            value={filters.fecha}
                            onChange={(e) => setFilters({ ...filters, fecha: e.target.value })}
                        />
                    </div>

                    {(user?.role === 'ADMINISTRADOR' || user?.role === 'DESPACHADOR') && (
                        <>
                            {/* TIPO CLIENTE */}
                            <div className="filter-group">
                                <label className="filter-group-label">TIPO CLIENTE</label>
                                <select
                                    className="input filter-input-full"
                                    value={filters.tipoCliente}
                                    onChange={(e) => setFilters({ ...filters, tipoCliente: e.target.value })}
                                >
                                    <option value="">Todos</option>
                                    <option value="SOCIO">Socio</option>
                                    <option value="NO_SOCIO">No Socio</option>
                                    <option value="CLIENTE">Cliente</option>
                                    <option value="DESPACHO_MAYOR">Despacho Mayor</option>
                                </select>
                            </div>

                            {/* RECEPTOR */}
                            <div className="filter-group">
                                <label className="filter-group-label">A QUIEN SE LE ENTREGA</label>
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente..."
                                    className="input filter-input-full"
                                    value={filters.vendedor}
                                    onChange={(e) => setFilters({ ...filters, vendedor: e.target.value })}
                                />
                            </div>

                            {/* DESPACHADOR */}
                            <div className="filter-group">
                                <label className="filter-group-label">DESPACHADO POR</label>
                                <input
                                    type="text"
                                    placeholder="Buscar despachador..."
                                    className="input filter-input-full"
                                    value={filters.despachador}
                                    onChange={(e) => setFilters({ ...filters, despachador: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    <div className="filter-btn-container">
                        <button
                            className="btn-edit btn-clear-filters"
                            onClick={() => setFilters({ fecha: "", tipoCliente: "", vendedor: "", despachador: "" })}
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="inv-card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th>ID Pedido</th>
                                <th>Fecha</th>
                                {(user?.role === 'ADMINISTRADOR' || user?.role === 'DESPACHADOR') && (
                                    <>
                                        <th>Nombre a quien se le entrega</th>
                                        <th>Despachado Por</th>
                                    </>
                                )}
                                {user?.role === 'ADMINISTRADOR' && (
                                    <th>Tipo Cliente</th>
                                )}
                                <th style={{ textAlign: 'right' }}>Total</th>
                                <th style={{ textAlign: 'center' }}>Estado</th>
                                <th style={{ textAlign: 'center' }}>Gestión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(o => (
                                <tr key={o.id}>
                                    <td className="table-order-id">#{o.id}</td>
                                    <td>{formatFechaConDia(o.created_at)}</td>
                                    
                                    {(user?.role === 'ADMINISTRADOR' || user?.role === 'DESPACHADOR') && (
                                        <>
                                            <td className="table-text-medium">{o.seller_name}</td>
                                            <td className="table-text-muted">
                                                {o.dispatcher_name || o.dispatcher || o.created_by_name || "N/A"}
                                            </td>
                                        </>
                                    )}

                                    {user?.role === 'ADMINISTRADOR' && (
                                        <td className="table-text-medium">{o.customer_type_name}</td>
                                    )}

                                    <td style={{ textAlign: 'right', fontWeight: '700' }}>
                                        ${Number(o.total_amount).toLocaleString()}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="badge-stock" style={{ background: '#dcfce7', color: '#15803d' }}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="table-cell-actions">
                                        <button className="btn-edit" onClick={() => handleViewDetail(o)} title="Ver Detalle">
                                            <Eye size={14} />
                                        </button>
                                        {canManage && o.status?.toUpperCase() !== 'LIQUIDADO' && (
                                            <>
                                                <button
                                                    className="btn-edit btn-edit-warning"
                                                    onClick={() => handleOpenEdit(o)}
                                                    title="Editar Pedido"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                {(user?.role === 'ADMINISTRADOR' || user?.role === 'DESPACHADOR') && (
                                                    <button
                                                        className="btn-edit btn-edit-danger"
                                                        onClick={() => handleDeleteOrder(o)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL EDITAR */}
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-content-rounded" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h2>Editar Pedido #{editingOrder.id}</h2>
                            <button onClick={() => setIsEditModalOpen(false)}><X /></button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group" style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Nombre del Receptor</label>
                                <input
                                    className="input filter-input-full"
                                    value={editForm.seller_name}
                                    onChange={(e) => setEditForm({ ...editForm, seller_name: e.target.value })}
                                />
                            </div>

                            <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShoppingBag size={18} /> Productos en el Pedido
                            </h4>

                            <div className="edit-items-scroll">
                                {editForm.items.map((item, idx) => (
                                    <div key={idx} className="edit-item-row">
                                        <div style={{ flex: 2 }}>
                                            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{item.product_name}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'center' }}>
                                            <button onClick={() => handleUpdateQty(idx, -1)} style={{ padding: '4px', background: '#f1f5f9', borderRadius: '6px' }}><Minus size={14} /></button>
                                            <span style={{ fontWeight: 'bold', minWidth: '25px', textAlign: 'center' }}>{item.quantity}</span>
                                            <button onClick={() => handleUpdateQty(idx, 1)} style={{ padding: '4px', background: '#f1f5f9', borderRadius: '6px' }}><Plus size={14} /></button>
                                        </div>
                                        <button onClick={() => handleRemoveItem(idx)} style={{ color: '#ef4444', padding: '8px' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="edit-add-product-box">
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Agregar Nuevo Producto</label>
                                <select
                                    className="input filter-input-full"
                                    onChange={(e) => handleAddItem(e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Seleccione para añadir...</option>
                                    {allProducts
                                        .filter(p => p.stock > 0)
                                        .map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (Stock: {p.stock})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn-primary-main" onClick={handleSaveEdit} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                                    <Save size={18} /> Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALLE */}
            {selectedOrder && (
                <div className="modal-overlay">
                    <div className="modal-content modal-content-rounded" style={{ maxWidth: '650px', width: '90%' }}>
                        <div className="modal-header modal-header-bordered">
                            <h2 style={{ margin: 0, color: '#1e293b' }}>Orden #{selectedOrder.id}</h2>
                            <button onClick={() => setSelectedOrder(null)} className="modal-close-btn">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body modal-body-padded">
                            {/* Info General */}
                            <div className="detail-grid-info">
                                <div>
                                    <p className="detail-info-label">A QUIEN SE LE ENTREGA</p>
                                    <p className="detail-info-value">{selectedOrder.seller_name || 'Sin nombre'}</p>
                                </div>
                                <div>
                                    <p className="detail-info-label">DESPACHADO POR</p>
                                    <p className="detail-info-value">
                                        {selectedOrder.dispatcher_name || selectedOrder.dispatcher || selectedOrder.created_by_name || 'N/A'}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="detail-info-label">FECHA DEL PEDIDO</p>
                                    <p className="detail-info-value" style={{ fontSize: '0.9rem' }}>
                                        {selectedOrder.created_at ? formatFechaConDia(selectedOrder.created_at) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Tabla de Productos */}
                            <div style={{ overflowX: 'auto' }}>
                                <table className="inv-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                            <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontSize: '0.85rem' }}>Producto</th>
                                            <th style={{ textAlign: 'center', padding: '12px 8px', color: '#64748b', fontSize: '0.85rem' }}>Cant.</th>
                                            <th style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b', fontSize: '0.85rem' }}>Precio Unit.</th>
                                            <th style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b', fontSize: '0.85rem' }}>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderItems.map((item, idx) => {
                                            const price = Number(item.unit_price || 0);
                                            const qty = Number(item.quantity || 0);
                                            const subtotal = price * qty;

                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 8px', fontSize: '0.95rem', color: '#334155' }}>{item.product_name}</td>
                                                    <td style={{ textAlign: 'center', padding: '14px 8px', fontWeight: '500' }}>{qty}</td>
                                                    <td style={{ textAlign: 'right', padding: '14px 8px', color: '#64748b' }}>
                                                        ${price.toLocaleString('es-CO')}
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: '14px 8px', fontWeight: '700', color: '#1e293b' }}>
                                                        ${subtotal.toLocaleString('es-CO')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Total Final */}
                            <div className="detail-total-section">
                                <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>TOTAL A PAGAR</p>
                                <span className="detail-total-amount">
                                    ${Number(selectedOrder.total_amount || 0).toLocaleString('es-CO')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CÓDIGO DESPACHADOR */}
            {isPasscodeModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content security-modal-content">
                        <div style={{ marginBottom: '20px' }}>
                            <div className="security-icon-circle">
                                <Trash2 size={30} />
                            </div>
                            <h2 style={{ margin: 0 }}>Confirmación de Seguridad</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '10px' }}>
                                Ingresa el código de autorización para eliminar el pedido <b>#{orderToDelete?.id}</b>
                            </p>
                        </div>

                        <input
                            type="password"
                            placeholder="****"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            className="security-input-passcode"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                        />

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn-edit"
                                style={{ flex: 1, background: '#f1f5f9' }}
                                onClick={() => {
                                    setIsPasscodeModalOpen(false);
                                    setPasscode("");
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-primary-main"
                                style={{ flex: 1, background: '#ef4444' }}
                                onClick={handleVerifyCode}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}