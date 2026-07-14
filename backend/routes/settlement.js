const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');


router.post('/mark-liquidated/:orderId', settlementController.markAsLiquidated);
// ESTA ES LA NUEVA RUTA PARA LA LIQUIDACIÓN MONETARIA (RUTA 1, 2 Y 3)
router.post('/settle/:orderId', settlementController.settleOrder);

// --- RUTAS DE LIQUIDACIÓN INDIVIDUAL ---

// Obtiene los datos consolidados de una liquidación (Imagen 2)
router.get('/settlement/:orderId', settlementController.getSettlementByOrder);


// --- RUTAS DE PAGOS SEMANALES (TABLA MARTES A SÁBADO) ---

/**
 * Obtiene las liquidaciones de la semana actual para Pagos.jsx
 * Endpoint: GET /api/sales/settlements/weekly
 * Nota: Los filtros (sellerName, startDate, endDate) viajan en la Query String (?sellerName=DERWIN...)
 */
router.get('/settlements/weekly', settlementController.getWeeklySettlements);

/**
 * Obtiene el historial de todos los cierres semanales realizados
 * Endpoint: GET /api/sales/weekly-history
 */
router.get('/weekly-history', settlementController.getWeeklyHistory);

/**
 * NUEVA: Guarda el cierre de la semana (Líquida y finaliza la semana)
 * Endpoint: POST /api/sales/weekly-history
 */
router.post('/weekly-history', settlementController.saveWeeklySettlement);
// ... tus otras rutas
router.get('/ganancias-vendedores', settlementController.getVendedoresGanancias);

module.exports = router;