const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');

router.post('/process-return', returnsController.processReturn);
router.get('/return-history/:orderId', returnsController.getReturnHistory);
router.get('/truck-inventory/:orderId', returnsController.getTruckInventory);

module.exports = router;