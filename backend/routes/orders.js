const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Definimos la ruta para crear despachos
router.post('/create', orderController.createOrder);

// NUEVA: Ruta para obtener pedidos filtrados
router.get('/history', orderController.getOrdersByRole);
// backend/routes/inventory.js (o el archivo de rutas que estés usando)
router.get('/detail/:id', orderController.getOrderDetail);
module.exports = router;