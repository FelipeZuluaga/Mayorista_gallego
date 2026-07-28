import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import * as Lucide from 'lucide-react';
import logo from "../assets/logo.jpeg";
import Footer from "../components/footer";
import "../styles/mainLayout.css";

function MainLayout({ children }) {
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();
    const userRole = user?.role?.toUpperCase();
    
    // Estado para controlar la apertura del menú hamburguesa en móviles
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // Lista unificada y sin íconos repetidos por rol
    const menuOptions = [
        //ADMINISTRADOR
        { to: "/dashboard", label: "Inicio", icon: <Lucide.LayoutDashboard size={18} />, roles: ["ADMINISTRADOR", "DESPACHADOR", "SOCIO", "NO_SOCIO"] },


        { to: "/ventas", label: "Rutas", icon: <Lucide.Map size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/AdminDashboard/users", label: "Creación Usuarios", icon: <Lucide.Users size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/Inventory", label: "Ingreso Productos / Inventario", icon: <Lucide.Package size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/despacho", label: "Despachos", icon: <Lucide.Truck size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/historialDespachos", label: "Historial de Despachos cargados", icon: <Lucide.ClipboardList size={18} />, roles: ["ADMINISTRADOR"] },
        { to: "/historial-devoluciones", label: "Informe y proc. Devolución", icon: <Lucide.RotateCcw size={18} />, roles: ["ADMINISTRADOR"] },
    
        //DESPACHADOR
        { to: "/despacho", label: "Mis Despachos", icon: <Lucide.Truck size={18} />, roles: ["DESPACHADOR"] },
        { to: "/historialDespachos", label: "Historial de Mis Despachos cargadas", icon: <Lucide.ClipboardList size={18} />, roles: ["DESPACHADOR"] },
        { to: "/historial-devoluciones", label: "Informe y proc. de Mis Devolución", icon: <Lucide.RotateCcw size={18} />, roles: ["DESPACHADOR"] },



        //SOCIO Y NO SOCIO
        { to: "/ventas", label: "Mis Rutas Cargadas", icon: <Lucide.Map size={18} />, roles: ["SOCIO", "NO_SOCIO"] },
        { to: "/historial-ventas", label: "Venta y liquidación de Mis Rutas", icon: <Lucide.BarChart3 size={18} />, roles: ["SOCIO", "NO_SOCIO"] },
        { to: "/historial-devoluciones", label: "Informe y proc. de Mis Devolución", icon: <Lucide.RotateCcw size={18} />, roles: ["SOCIO", "NO_SOCIO"] },
        { to: "/clientes", label: "Informe de Mis Clientes", icon: <Lucide.UserCheck size={18} />, roles: ["SOCIO", "NO_SOCIO"] },
        { to: "/historial-pagos", label: "Historial y proceso de Mis pagos", icon: <Lucide.Wallet size={18} />, roles: ["SOCIO", "NO_SOCIO"] },
    ];

    return (
        <div className="layout-wrapper">
            <header className="admin-header">
                <div className="header-brand">
                    <img src={logo} alt="Mayorista Gallego" className="header-logo-img" />
                </div>

                {/* Botón Hamburguesa - Solo visible en pantallas chicas */}
                <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
                    {isMenuOpen ? <Lucide.X size={24} /> : <Lucide.Menu size={24} />}
                </button>

                {/* Menú de Navegación con clase condicional para móvil */}
                <nav className={`header-nav-menu ${isMenuOpen ? "is-open" : ""}`}>
                    {menuOptions.map((option) => (
                        option.roles.includes(userRole) && (
                            <NavLink
                                key={option.to}
                                to={option.to}
                                end={option.to === "/dashboard"}
                                className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                                onClick={() => setIsMenuOpen(false)} // Cierra el menú al hacer click
                            >
                                {option.icon}
                                <span>{option.label}</span>
                            </NavLink>
                        )
                    ))}
                </nav>

                <div className={`user-profile-section ${isMenuOpen ? "is-open" : ""}`}>
                    <div className="user-info">
                        <span className="user-name">{user?.name || "Usuario"}</span>
                        <span className="user-role">{userRole}</span>
                    </div>
                    
                    <div className="user-avatar">
                         <Lucide.UserCircle size={32} strokeWidth={1.5} />
                    </div>

                    <button 
                        className="btn btn-primary btn-logout" 
                        onClick={handleLogout}
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