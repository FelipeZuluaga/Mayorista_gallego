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


// --- RUTAS DE LIQUIDACIÓN INDIVIDUAL ---

// Obtiene los datos consolidados de una liquidación (Imagen 2)
router.get('/settlement/:orderId', saleController.getSettlementByOrder);






// --- RUTAS DE PAGOS SEMANALES (TABLA MARTES A SÁBADO) ---

/**
 * Obtiene las liquidaciones de la semana actual para Pagos.jsx
 * Endpoint: GET /api/sales/settlements/weekly
 * Nota: Los filtros (sellerName, startDate, endDate) viajan en la Query String (?sellerName=DERWIN...)
 */

router.get('/settlements/weekly', saleController.getWeeklySettlements);
/**
 * NUEVA: Obtiene el historial de todos los cierres semanales realizados
 * Endpoint: GET /api/sales/weekly-history/:userId
 */
router.get('/weekly-history', saleController.getWeeklyHistory);


module.exports = router;