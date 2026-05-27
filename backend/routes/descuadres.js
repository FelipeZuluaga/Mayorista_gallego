// backend/routes/descuadres.js
const express = require('express');
const router = express.Router();
const descuadreController = require('../controllers/descuadreController');

// Ruta para obtener el historial de descuadres con sus relaciones (JOINs)
router.get('/', descuadreController.obtenerDescuadres);

// Ruta para registrar un nuevo descuadre en la base de datos
router.post('/create', descuadreController.crearDescuadre);


// Ruta para listar los productos en el select
router.get('/productos-lista', descuadreController.obtenerListaProductos);

router.put('/:id', descuadreController.actualizarDescuadre);

module.exports = router;