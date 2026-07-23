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
app.use("/api/users", require("./routes/users")); 
app.use("/api/customers", require("./routes/customer"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/returns", require("./routes/returns"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/settlement", require("./routes/settlement"));
// --- Puerto ---
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});