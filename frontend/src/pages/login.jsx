import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import logo from "../assets/logo.jpeg";
import { Truck } from 'lucide-react'; // Importamos el ícono
import Footer from "../components/footer";
// Importamos el servicio que creamos anteriormente
import { loginUser } from "../services/authService";
// Si usas SweetAlert2 o similar para estos servicios:
import { alertSuccess, alertError, alertWarning } from "../services/alertService";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); // Evita recarga de página

    if (!email || !password || !roleId) {
      alertWarning("Campos incompletos", "Por favor completa todos los campos.");
      return;
    }

    try {
      setLoading(true);

      // Llamada al servicio de Axios
      const data = await loginUser(email, password, roleId);

      if (data.success) {
        // Guardamos en localStorage
        localStorage.setItem("user", JSON.stringify(data.user));

        await alertSuccess(
          `¡Bienvenido, ${data.user.name}!`,
          `Has ingresado como ${data.user.role}`
        );

        redirectByRole(data.user.role);
      }
    } catch (error) {
      // Usamos el mensaje que viene del backend ("Credenciales incorrectas", etc.)
      alertError("Error de acceso", error.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role) => {
    // Normalizamos a mayúsculas por si el backend varía
    const userRole = role.toUpperCase();

    switch (userRole) {
      case "ADMINISTRADOR":
      case "SOCIO":
      case "NO_SOCIO":
       case "DESPACHADOR":
        navigate("/dashboard");
        break;
      default:
        navigate("/login");
        break;
    }
  };

  return (
    <div className="login-page">
      <div className="main-container">
        <div className="left-section">
          <div className="overlay"></div>
          <div className="left-content">
            {/* Ícono animado */}
            <div className="floating-icon">
              <Truck size={80} strokeWidth={1.5} />
            </div>
            <h1>Mayorista <span>Gallego</span></h1>
            <div className="divider"></div>
            <p>
              Calidad y confianza en la distribución de alimentos al por mayor y detal.
              Impulsamos el crecimiento de tu negocio.
            </p>
          </div>
        </div>

        <div className="login-section">
          <div className="login-container">
            <div className="brand-header">
              <img src={logo} alt="Logo" className="login-logo" />
              <h2>Bienvenido de nuevo</h2>
              <p className="subtitle">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Rol de Usuario</label>
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">Seleccionar Rol</option>
                  <option value="1">ADMINISTRADOR</option>
                  <option value="2">SOCIO</option>
                  <option value="3">NO SOCIO</option>
                  <option value="4">DESPACHADOR</option>
                </select>
              </div>

              <div className="form-group">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? "Ingresando..." : "Iniciar Sesión"}
              </button>
            </form>

            <div className="login-footer-links">
              <a href="#">¿Olvidaste tu contraseña?</a>
            </div>
          </div>
        </div>
      </div>

      <Footer /> {/* Usamos el componente centralizado */}
    </div>
  );
}

export default Login;