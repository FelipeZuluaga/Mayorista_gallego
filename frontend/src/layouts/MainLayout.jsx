import { useNavigate, NavLink } from "react-router-dom";
import { LogOut, User, Package, Users, ClipboardList, LayoutDashboard, Truck } from "lucide-react";
import logo from "../assets/logo.jpeg";
import "../styles/dashboard.css";
import Footer from "../components/footer";

function MainLayout({ children }) {
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();
    const userRole = user?.role?.toUpperCase();

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    // Definimos todas las opciones posibles
    const menuOptions = [
        { to: "/dashboard", label: "Inicio", icon: <LayoutDashboard size={18} />, roles: ["ADMINISTRADOR", "DESPACHADOR", "SOCIO","NO_SOCIO"] },
        { to: "/Inventory", label: "Inventario", icon: <Package size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/despacho", label: "Crear pedido", icon: <Truck size={18} />, roles: ["ADMINISTRADOR", "DESPACHADOR"] },
        { to: "/pedidos", label: "Pedidos", icon: <ClipboardList size={18} />, roles: ["ADMINISTRADOR", "SOCIO", "DESPACHADOR"] },
        { to: "/AdminDashboard/users", label: "Usuarios", icon: <Users size={18} />, roles: ["ADMINISTRADOR"] },
    ];

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div className="header-left" onClick={() => navigate("/AdminDashboard")} style={{ cursor: 'pointer' }}>
                    <img src={logo} alt="Logo" className="header-logo-img" />
                    <div className="header-brand-info">
                        <h2>Mayorista <span>Gallego</span></h2>
                        <p>Panel de Control</p>
                    </div>
                </div>

                <nav className="header-nav-menu">
                    {menuOptions.map((option) => (
                        // Solo renderiza si el rol del usuario está en la lista de roles permitidos de la opción
                        option.roles.includes(userRole) && (
                            <NavLink 
                                key={option.to} 
                                to={option.to} 
                                end={option.to === "/AdminDashboard"}
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
                        <User size={18} />
                    </div>
                    <button className="logout-action-btn" onClick={handleLogout}>
                        <LogOut size={18} />
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