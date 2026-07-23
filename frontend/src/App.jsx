import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login.jsx";
import Dashboard from "./pages/Dashboard.jsx"; // Nombre genérico
import RoleRoute from "./routes/RoleRoute";
import MainLayout from "./layouts/MainLayout";
import UsersPage from "./pages/UsersPage.jsx";
import CustomerList from "./components/CustomerList.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";

//DESPACHOS Y HISTORIAL DE DESPACHOS 
import DespachoPage from "./pages/DespachoPage.jsx";
import HistorialDespachos from "./pages/HistorialDespachos.jsx";


//DEVOLUCIÓN Y HISTORIAL DE DEVOLUCIÓN 
import HistDevolucionesPage from "./pages/HistDevolucionesPage.jsx";
import DevolucionesPage from "./pages/DevolucionesPage.jsx";

//RUTA LIQUIDACIÓN DIARIA Y HISROTIAL DE RUTA Y LIQUIDACION DIARIA
import VentasPage from "./pages/VentasPage.jsx";
import VentasHistoryPage from "./pages/VentasHistoryPage.jsx";
import VentasDetalleReadOnly from "./components/VentasDetalleReadOnly.jsx";


// LIQUIDACIÓN DIARIA 
import SettlementModule from "./components/SettlementModule.jsx";

//LIQUIDACIÓN SEMANAL 
import HistorialPayments from "./pages/HistorialPayments.jsx";
import Payments from "./components/Payments.jsx";


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* El Dashboard ahora es para TODOS los roles autorizados */}
        <Route
          path="/dashboard"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "DESPACHADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/AdminDashboard/users"
          element={
            <MainLayout>
              <UsersPage />
            </MainLayout>
          }
        />
        <Route
          path="/clientes"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <CustomerList />
              </MainLayout>
            </RoleRoute>
          }
        />
        {/* --- MÓDULO DE INVENTARIO (ADMINISTRADOR y DESPACHADOR) --- */}
        <Route
          path="/Inventory"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR"]}>
              <MainLayout>
                <InventoryPage />
              </MainLayout>
            </RoleRoute>
          }
        />
        {/* --- MÓDULO DE DESPACHOS (Donde se crea el pedido y resta stock) --- */}
        <Route
          path="/despacho"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "DESPACHADOR"]}>
              <MainLayout>
                <DespachoPage />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/historialDespachos"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "DESPACHADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <HistorialDespachos />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/historial-devoluciones"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "DESPACHADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <HistDevolucionesPage />
              </MainLayout>
            </RoleRoute>
          }
        />
         <Route
          path="/devoluciones"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "DESPACHADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <DevolucionesPage />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/ventas"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <VentasPage />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/liquidacion-ruta/:orderId"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <SettlementModule />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/historial-ventas"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <VentasHistoryPage />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/ventas-detalle/:orderId"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <VentasDetalleReadOnly />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/historial-pagos"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <HistorialPayments />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/pagos-detalle"
          element={
            <RoleRoute allowedRoles={["ADMINISTRADOR", "SOCIO", "NO_SOCIO"]}>
              <MainLayout>
                <Payments />
              </MainLayout>
            </RoleRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
