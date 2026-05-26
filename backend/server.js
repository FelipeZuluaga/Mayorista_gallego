require("dotenv").config(); // Siempre en la línea 1
const express = require("express");
const cors = require("cors");
const db = require("./config/db"); 

const app = express();

// --- Middleware Global ---
app.use(cors());
app.use(express.json()); 

// --- Importación y Uso de Rutas ---

// Ruta para Autenticación (Login)
app.use("/api", require("./routes/auth.routes"));

// NUEVA: Ruta para Gestión de Usuarios (CRUD)
// La ruta final será: http://localhost:3001/api/users
app.use("/api/users", require("./routes/users")); 

// NUEVA: Ruta para Gestión de Inventario
// La ruta final será: http://localhost:3001/api/inventory
app.use("/api/inventory", require("./routes/inventory"));

// NUEVA: Ruta para Gestión de Pedidos y Despachos
// La ruta final será: http://localhost:3001/api/orders
app.use("/api/orders", require("./routes/orders"));

// NUEVA: Ruta para Liquidación de Ventas y Abonos
// La ruta final será: http://localhost:3001/api/sales
app.use("/api/sales", require("./routes/sales"));

// NUEVA: Ruta para Gestión de Clientes con Saldo
// La ruta final será: http://localhost:3001/api/customers/balances
app.use("/api/customers", require("./routes/customer"));

// NUEVA: Ruta para Gestión de Descuadres (Faltantes, Perdidos, Pendientes por pagar)
app.use("/api/descuadres", require("./routes/descuadres"));

// --- Puerto ---
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});