import { customerService } from '../services/customerService';
import { useEffect, useState, useMemo } from "react";
import { Search, Trash2, Edit } from "lucide-react";
import { alertSuccess, alertError, alertConfirmUsers } from '../services/alertService';
import '../styles/CustomerList.css';

const CustomerList = ({ sellerId }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteEdicion, setClienteEdicion] = useState(null);
    const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay());

    const user = JSON.parse(localStorage.getItem("user"));

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const nombreDia = DIAS_SEMANA[diaSeleccionado];
            const data = await customerService.getDetailedList(sellerId, nombreDia);
            setCustomers(data);
        } catch (error) {
            alertError("Error de conexión", "No se pudieron cargar los clientes.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, [sellerId, diaSeleccionado]);

    const clientesFiltrados = useMemo(() => {
        return customers.filter(c => {
            const esAdmin = user.role === "ADMINISTRADOR";
            const esDueñoDelCliente = String(c.seller_id) === String(user.id);

            if (!esAdmin && !esDueñoDelCliente) {
                return false;
            }

            const coincideBusqueda =
                c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.id.toString().includes(searchTerm);

            const coincideVendedor =
                vendedorSeleccionado === "" ||
                c.seller_name === vendedorSeleccionado;

            return coincideBusqueda && coincideVendedor;
        });
    }, [customers, searchTerm, vendedorSeleccionado, user.id, user.role]);

    const listaVendedores = useMemo(() => {
        const nombres = customers.map(c => c.seller_name).filter(Boolean);
        return [...new Set(nombres)];
    }, [customers]);

    const vendedoresParaAsignar = useMemo(() => {
        return customers.reduce((acc, curr) => {
            if (curr.seller_id && !acc.find(v => v.id === curr.seller_id)) {
                acc.push({ id: curr.seller_id, name: curr.seller_name });
            }
            return acc;
        }, []);
    }, [customers]);

    const handleResetFilters = () => {
        setSearchTerm("");
        setVendedorSeleccionado("");
        setDiaSeleccionado(new Date().getDay());
    };

    const handleEdit = (cliente) => {
        setClienteEdicion({ ...cliente });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const confirmado = await alertConfirmUsers(
            "¿Eliminar cliente?",
            "Esta acción no se puede deshacer y el cliente será borrado de la base de datos."
        );

        if (confirmado) {
            try {
                await customerService.deleteCustomer(id);
                alertSuccess("Eliminado", "El cliente ha sido borrado exitosamente.");
                loadCustomers();
            } catch (error) {
                alertError("Error", "No se pudo eliminar el cliente.");
            }
        }
    };

    const handleAddNew = () => {
        setClienteEdicion({
            customer_name: "",
            customer_address: "",
            phone: "",
            visit_day: DIAS_SEMANA[diaSeleccionado],
            total_debt: 0,
            position: 1,
            visit_status_c: "PENDIENTE",
            seller_id: sellerId || ""
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!clienteEdicion.seller_id) {
            return alertError("Campo requerido", "Debes asignar un vendedor para poder guardar el cliente.");
        }

        if (!clienteEdicion.customer_name || !clienteEdicion.customer_address) {
            return alertError("Faltan datos", "Nombre y Dirección son campos obligatorios.");
        }

        try {
            if (clienteEdicion.id) {
                await customerService.updateCustomer(clienteEdicion.id, clienteEdicion);
                alertSuccess("Actualizado", "Datos guardados correctamente.");
            } else {
                const newCustomerData = {
                    name: clienteEdicion.customer_name,
                    address: clienteEdicion.customer_address,
                    phone: clienteEdicion.phone,
                    visit_day: clienteEdicion.visit_day,
                    seller_id: clienteEdicion.seller_id,
                    position: parseInt(clienteEdicion.position) || 0
                };
                await customerService.createCustomer(newCustomerData);
                alertSuccess("Creado", "Cliente registrado en la ruta exitosamente.");
            }
            setIsModalOpen(false);
            loadCustomers();
        } catch (error) {
            alertError("Error al guardar", error.message || "No se pudo procesar la solicitud.");
        }
    };

    return (
        <>
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <div>
                                <h3>Gestionar Cliente</h3>
                                {clienteEdicion.id && (
                                    <p>
                                        ID: {clienteEdicion.id} • Deuda: ${parseFloat(clienteEdicion.total_debt).toLocaleString()}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">&times;</button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-grid">
                                <div className="modal-column">
                                    <h4 className="modal-section-title">Información General</h4>
                                    <div className="modal-input-group">
                                        <label className="modal-label">Nombre del Cliente *</label>
                                        <input
                                            className="modal-input"
                                            value={clienteEdicion.customer_name}
                                            onChange={(e) => setClienteEdicion({ ...clienteEdicion, customer_name: e.target.value })}
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                    <div className="modal-input-group">
                                        <label className="modal-label">Dirección *</label>
                                        <input
                                            className="modal-input"
                                            value={clienteEdicion.customer_address}
                                            onChange={(e) => setClienteEdicion({ ...clienteEdicion, customer_address: e.target.value })}
                                            placeholder="Calle, Número, Barrio"
                                        />
                                    </div>
                                    <div className="modal-input-group">
                                        <label className="modal-label">Teléfono</label>
                                        <input
                                            className="modal-input"
                                            value={clienteEdicion.phone}
                                            onChange={(e) => setClienteEdicion({ ...clienteEdicion, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="modal-column">
                                    <h4 className="modal-section-title">Logística y Ruta</h4>
                                    <div className="modal-input-row">
                                        <div className="modal-input-group flex-1">
                                            <label className="modal-label">Día Visita</label>
                                            <select
                                                className="modal-input"
                                                value={clienteEdicion.visit_day}
                                                onChange={(e) => setClienteEdicion({ ...clienteEdicion, visit_day: e.target.value })}
                                            >
                                                {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="modal-input-group flex-1">
                                            <label className="modal-label">Posición</label>
                                            <input
                                                type="number"
                                                className="modal-input"
                                                value={clienteEdicion.position}
                                                onChange={(e) => setClienteEdicion({ ...clienteEdicion, position: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {user.role === "ADMINISTRADOR" && (
                                        <div className="modal-input-group">
                                            <label className="modal-label">Asignar Vendedor *</label>
                                            <select
                                                className={`modal-input ${!clienteEdicion.seller_id ? 'input-error' : ''}`}
                                                value={clienteEdicion.seller_id}
                                                onChange={(e) => setClienteEdicion({ ...clienteEdicion, seller_id: e.target.value })}
                                            >
                                                <option value="">-- Seleccione un vendedor --</option>
                                                {vendedoresParaAsignar.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="modal-input-group">
                                        <label className="modal-label">Estado de Visita</label>
                                        <select
                                            className="modal-input"
                                            value={clienteEdicion.visit_status_c}
                                            onChange={(e) => setClienteEdicion({ ...clienteEdicion, visit_status_c: e.target.value })}
                                        >
                                            <option value="PENDIENTE">Pendiente</option>
                                            <option value="VISITADO">Visitado</option>
                                            <option value="NO_VISITADO">No Visitado</option>
                                        </select>
                                    </div>

                                    <div className="modal-input-group">
                                        <label className="modal-label">Deuda Total ($)</label>
                                        <input
                                            type="number"
                                            className="modal-input"
                                            value={clienteEdicion.total_debt}
                                            onChange={(e) => setClienteEdicion({ ...clienteEdicion, total_debt: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setIsModalOpen(false)} className="btn-modal-cancel">Cancelar</button>
                            <button className="btn-modal-save" onClick={handleSave}>
                                {clienteEdicion.id ? "Actualizar Datos" : "Guardar Nuevo Cliente"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="inv-page full-layout history-container">
                <header className="ruta-header-main">
                    <h1>{user.role === 'ADMINISTRADOR' ? '🚀 Informe de Clientes' : '🚚 Informe de Mi Clientes'}</h1>
                    <p>Viendo clientes del día: <strong>{DIAS_SEMANA[diaSeleccionado]}</strong></p>
                    {user.role === 'ADMINISTRADOR' && (
                        <button
                            onClick={handleAddNew}
                            className="btn-modal-save btn-add-customer"
                        >
                            + Agregar Nuevo Cliente
                        </button>
                    )}
                </header>

                <div className="dias-selector-container">
                    {DIAS_SEMANA.map((dia, index) => (
                        <button
                            key={dia}
                            onClick={() => setDiaSeleccionado(index)}
                            className={`btn-dia ${diaSeleccionado === index ? 'selected' : ''}`}
                        >
                            {dia}
                        </button>
                    ))}
                </div>

                <div className="inv-card">
                    <div className="card-header filters-bar">
                        <div className="filters-group-left">
                            <div className="search-box">
                                <Search size={18} color="#94a3b8" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {user.role === "ADMINISTRADOR" && (
                                <select
                                    className="admin-select-vendedor"
                                    value={vendedorSeleccionado}
                                    onChange={(e) => setVendedorSeleccionado(e.target.value)}
                                >
                                    <option value="">Todos los vendedores</option>
                                    {listaVendedores.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <button className="btn-clear-filters" onClick={handleResetFilters}>
                            <Trash2 size={16} /> Limpiar Filtros
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="inv-table" style={{ width: '100%', tableLayout: 'auto' }}>
                            <thead>
                                <tr>
                                    <th className="table-col-pos">Pos.</th>
                                    <th style={{ padding: '12px 8px' }}>Dirección</th>
                                    <th style={{ padding: '12px 8px' }}>Nombre</th>
                                    <th style={{ padding: '12px 8px' }}>Teléfono</th>
                                    <th style={{ padding: '12px 8px' }}>Día Visita</th>
                                    <th className="table-col-debt">Deuda Total</th>
                                    <th style={{ padding: '12px 8px' }}>Nombre vendedor</th>
                                    {user.role === 'ADMINISTRADOR' && <th style={{ padding: '12px 8px', textAlign: 'center' }}>Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center p-4">Cargando clientes...</td></tr>
                                ) : clientesFiltrados.length > 0 ? (
                                    clientesFiltrados.map((c) => (
                                        <tr key={c.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 text-center font-bold text-gray-500 table-col-pos">
                                                {c.position || '-'}
                                            </td>
                                            <td className="p-3 text-sm">{c.customer_address}</td>
                                            <td className="p-3 font-medium">{c.customer_name}</td>
                                            <td className="p-3 text-sm">{c.phone || 'N/A'}</td>
                                            <td className="p-3 text-center">
                                                <span className="badge-dia">{c.visit_day}</span>
                                            </td>
                                            <td className="p-3 text-red-600 font-bold text-center table-col-debt">
                                                ${parseFloat(c.total_debt).toLocaleString()}
                                            </td>
                                            <td className="p-3 text-sm font-medium text-blue-700 italic">
                                                {c.seller_name || "Vendedor General"}
                                            </td>
                                            {user.role === 'ADMINISTRADOR' && (
                                                <td className="p-3">
                                                    <div className="actions-cell-container">
                                                        <button
                                                            onClick={() => handleEdit(c)}
                                                            className="btn-action btn-action-edit"
                                                            title="Editar cliente"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(c.id)}
                                                            className="btn-action btn-action-delete"
                                                            title="Eliminar cliente"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="7" className="text-center p-10 text-gray-500">No se encontraron clientes para este día.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CustomerList;