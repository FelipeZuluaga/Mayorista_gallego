const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// --- RUTAS DE CREACIÓN Y CONSULTA ---

// Crear un nuevo pedido/despacho
router.post('/create', orderController.createOrder);

// Obtener historial de pedidos (filtrado por rol en el controlador)
router.get('/history', orderController.getOrdersByRole);

// Obtener los productos (ítems) específicos de un pedido
router.get('/detail/:id', orderController.getOrderDetail);

// --- RUTAS DE ACTUALIZACIÓN Y BORRADO ---
router.put('/update-full/:id', orderController.updateOrderItems); 

// ELIMINACIÓN: Borra el pedido y restaura el stock al inventario
router.delete('/delete/:id', orderController.deleteOrder);

module.exports = router;