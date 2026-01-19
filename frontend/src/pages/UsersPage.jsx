import { useEffect, useState } from "react";
import { Trash2, UserPlus, RefreshCcw, ShieldCheck } from "lucide-react";
// Importación de tu arquitectura
import { userService } from "../services/userService";
import { alertSuccess, alertError, alertConfirm } from "../services/alertService";

const ROLES = ["ADMINISTRADOR", "DESPACHADOR", "SOCIO", "NO_SOCIO"];

function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "" });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (err) {
            alertError("Error de Conexión", "No se pudo sincronizar con la base de datos.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await userService.create(form);
            alertSuccess("Usuario Creado", `El acceso para ${form.name} ha sido habilitado.`);
            setForm({ name: "", email: "", password: "", role: "" });
            loadUsers();
        } catch (err) {
            alertError("Error al Registrar", err.response?.data?.message || "Verifique los datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await alertConfirm("¿Eliminar Cuenta?", "El usuario perderá el acceso inmediato al sistema.");
        
        if (result.isConfirmed) {
            try {
                await userService.delete(id);
                alertSuccess("Eliminado", "Registro borrado correctamente.");
                loadUsers();
            } catch (err) {
                alertError("Error", "No se pudo procesar la eliminación.");
            }
        }
    };

    return (
        <div className="users-module-container">
            <div className="module-intro">
                <h1>Gestión de Usuarios</h1>
                <p>Administra los permisos y perfiles de <strong>Mayorista Gallego</strong>.</p>
            </div>

            <div className="users-grid-layout">
                {/* COLUMNA IZQUIERDA: REGISTRO */}
                <aside className="form-column">
                    <div className="admin-card">
                        <div className="card-icon-wrapper">
                            <UserPlus size={28} />
                        </div>
                        <h3>Nuevo Perfil</h3>
                        <form onSubmit={handleSubmit} className="module-form">
                            <div className="input-field">
                                <label>Nombre Completo</label>
                                <input 
                                    type="text"
                                    placeholder="Ej: Juan Pérez" 
                                    value={form.name} 
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                                    required 
                                />
                            </div>
                            <div className="input-field">
                                <label>Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    placeholder="correo@empresa.com" 
                                    value={form.email} 
                                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                                    required 
                                />
                            </div>
                            <div className="input-field">
                                <label>Contraseña Temporal</label>
                                <input 
                                    type="password" 
                                    placeholder="********" 
                                    value={form.password} 
                                    onChange={(e) => setForm({ ...form, password: e.target.value })} 
                                    required 
                                />
                            </div>
                            <div className="input-field">
                                <label>Rol del Sistema</label>
                                <select 
                                    value={form.role} 
                                    onChange={(e) => setForm({ ...form, role: e.target.value })} 
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="action-btn-primary" disabled={loading}>
                                {loading ? <RefreshCcw className="spin-icon" size={18} /> : "Crear Usuario"}
                            </button>
                        </form>
                    </div>
                </aside>

                {/* COLUMNA DERECHA: TABLA */}
                <main className="table-column">
                    <div className="admin-card table-container-card">
                        <div className="table-responsive">
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Colaborador</th>
                                        <th>Nivel de Acceso</th>
                                        <th style={{textAlign: 'center'}}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? (
                                        users.map((u) => (
                                            <tr key={u.id}>
                                                <td>
                                                    <div className="user-info-td">
                                                        <span className="u-name">{u.name}</span>
                                                        <span className="u-email">{u.email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge-role ${u.role?.toLowerCase()}`}>
                                                        <ShieldCheck size={12} style={{marginRight: '4px'}} />
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td style={{textAlign: 'center'}}>
                                                    <button 
                                                        className="btn-icon-delete" 
                                                        onClick={() => handleDelete(u.id)}
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" style={{textAlign: 'center', padding: '50px', color: '#999'}}>
                                                No se encontraron usuarios en la base de datos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default UsersPage;