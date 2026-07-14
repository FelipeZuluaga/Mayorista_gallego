// ROUTES: inventoryRoutes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

/* ==========================================================================
   RUTAS DE INVENTARIO Y PRODUCTOS
   ========================================================================== */

// Obtener todo el inventario (Productos + Precios)
router.get('/', inventoryController.getInventory);

// Crear un nuevo producto con sus precios
router.post('/', inventoryController.createProduct);

// Actualizar un producto por ID (Suma de stock y actualización de precios)
router.put('/:id', inventoryController.updateProduct);

// Eliminar un producto por ID (Elimina precios asociados y producto)
router.delete('/:id', inventoryController.deleteProduct);


/* ==========================================================================
   RUTAS DE CATEGORÍAS
   ========================================================================== */

// Obtener la lista de categorías
router.get('/categories', inventoryController.getCategories);

// Crear una nueva categoría
router.post('/categories', inventoryController.createCategory);

module.exports = router;