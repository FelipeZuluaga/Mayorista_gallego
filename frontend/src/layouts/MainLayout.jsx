import { useNavigate, NavLink } from "react-router-dom";
import * as Lucide from 'lucide-react';
import logo from "../assets/logo.jpeg";
import "../styles/Dashboard.css";
import Footer from "../components/footer";

function MainLayout({ children }) {
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();
    const userRole = user?.role?.toUpperCase();

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    const menuOptions = [
        { to: "/dashboard", label: "Inicio", icon: <Lucide.LayoutDashboard size={18} />, roles: ["ADMINISTRADOR", "DESPACHADOR", "SOCIO", "NO_SOCIO"] },

        // ADMIN
        { to: "/AdminDashboard/users", label: "Usuarios", icon: <Lucide.Users size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/Inventory", label: "Inventario", icon: <Lucide.Package size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/pedidos", label: "Historial pedidos", icon: <Lucide.ClipboardList size={18} />, roles: ["ADMINISTRADOR"] },
        // NUEVOS MÓDULOS INDEPENDIENTES
        { to: "/liquidacion", label: "Liquidación", icon: <Lucide.Calculator size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/pagos", label: "Pagos", icon: <Lucide.Wallet size={18} />, roles: ["ADMINISTRADOR"] },

        // VENTAS & DEVOLUCIONES
        { to: "/ventas", label: "Hacer Ventas", icon: <Lucide.CircleDollarSign size={18} />, roles: ["ADMINISTRADOR", "SOCIO", "NO_SOCIO"] },
        { to: "/historial-ventas", label: "Historial Ventas", icon: <Lucide.CircleDollarSign size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/devoluciones", label: "Devoluciones", icon: <Lucide.RefreshCcw size={18} />, roles: ["ADMINISTRADOR"] },

        // DESPACHADOR
        { to: "/despacho", label: "Crear pedido", icon: <Lucide.Truck size={18} />, roles: ["ADMINISTRADOR", "DESPACHADOR"] },
        { to: "/pedidos", label: "Detalle mis pedidos", icon: <Lucide.ClipboardList size={18} />, roles: ["DESPACHADOR"] },

        // SOCIO Y NO_SOCIO
        { to: "/pedidos", label: "Mis Pedidos", icon: <Lucide.ClipboardList size={18} />, roles: ["SOCIO", "NO_SOCIO"] },
        { to: "/historial-ventas", label: "Mis Ventas", icon: <Lucide.TrendingUp size={18} />, roles: ["SOCIO", "NO_SOCIO"] },
        { to: "/devoluciones", label: "Hacer Devoluciones", icon: <Lucide.RotateCcw size={18} />, roles: ["SOCIO", "NO_SOCIO"] }
    ];

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div className="header-left" onClick={() => navigate("/dashboard")} style={{ cursor: 'pointer' }}>
                    <img src={logo} alt="Logo" className="header-logo-img" />
                    <div className="header-brand-info">
                        <h2>Mayorista <span>Gallego</span></h2>
                        <p>Panel de Control</p>
                    </div>
                </div>

                <nav className="header-nav-menu">
                    {menuOptions.map((option) => (
                        option.roles.includes(userRole) && (
                            <NavLink
                                key={option.to}
                                to={option.to}
                                end={option.to === "/dashboard"}
                                className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                            >
                                {option.icon}
                                <span>{option.label}</span>
                            </NavLink>
                        )
                    ))}
                </nav>

                <div className="header-right">
                    <div className="user-info-display">
                        <div className="user-text-details">
                            <span className="user-name">{user?.name || "Usuario"} / </span>
                            <span className="user-role-label">{userRole}</span>
                        </div>
                        {/* Corregido: Agregado el prefijo Lucide. */}
                        <Lucide.User size={18} />
                    </div>
                    <button className="logout-action-btn" onClick={handleLogout}>
                        {/* Corregido: Agregado el prefijo Lucide. */}
                        <Lucide.LogOut size={18} />
                        <span>Salir</span>
                    </button>
                </div>
            </header>

            <main className="admin-container">
                {children}
            </main>

            <Footer />
        </div>
    );
}

export default MainLayout;