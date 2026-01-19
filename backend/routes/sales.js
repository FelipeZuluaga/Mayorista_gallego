const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// Ruta para procesar la liquidación de un despacho (con o sin abono)
// Endpoint: POST /api/sales/create
router.post('/create', saleController.createSale);
// Ruta para obtener el historial de ventas liquidadas
router.get('/', saleController.getSales);

module.exports = router;