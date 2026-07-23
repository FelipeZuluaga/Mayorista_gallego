const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');


router.post('/settle/:orderId', returnsController.settleOrder);
router.put('/update-status/:id', returnsController.updateOrderStatus);
router.post('/process-return', returnsController.processReturn);
router.get('/return-history/:orderId', returnsController.getReturnHistory);
router.get('/truck-inventory/:orderId', returnsController.getTruckInventory);

module.exports = router;