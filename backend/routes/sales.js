const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// --- RUTAS DE VENTAS Y DESPACHOS ---

// Procesar la liquidación de un despacho (POST /api/sales/create)
router.post('/create', saleController.createSale);

// Historial de rutas liquidadas (Resumen administrativo)
router.get('/', saleController.getSales);

// Obtiene la "Hoja de Ruta" completa filtrada por ID de orden
router.get('/ruta-completa/:orderId', saleController.getRutaCompleta);


module.exports = router;