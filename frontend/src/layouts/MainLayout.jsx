import { useNavigate, NavLink } from "react-router-dom";
import * as Lucide from 'lucide-react';
import logo from "../assets/logo.jpeg";
import Footer from "../components/footer";
import "../styles/mainLayout.css";

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
        { to: "/AdminDashboard/users", label: "Usuarios", icon: <Lucide.Users size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/Inventory", label: "Inventario", icon: <Lucide.Package size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/pedidos", label: "Historial pedidos", icon: <Lucide.ClipboardList size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/liquidacion", label: "Liquidación", icon: <Lucide.Calculator size={18} />, roles: ["ADMINISTRADOR"] },
    ];

    return (
        <div className="layout-wrapper"> {/* Clase base para el Sticky Footer */}
            <header className="admin-header">
                <div className="header-brand">
                    <img src={logo} alt="Mayorista Gallego" className="header-logo-img" />
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

                <div className="user-profile-section">
                    <div className="user-info">
                        <span className="user-name">{user?.name || "Usuario"}</span>
                        <span className="user-role">{userRole}</span>
                    </div>
                    
                    <div className="user-avatar">
                         <Lucide.UserCircle size={32} strokeWidth={1.5} />
                    </div>

                    {/* USAMOS LA CLASE GLOBAL .btn y .btn-primary */}
                    <button 
                        className="btn btn-primary" 
                        onClick={handleLogout}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }} // Ajuste pequeño puntual
                    >
                        <Lucide.LogOut size={16} />
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