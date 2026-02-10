const db = require('../config/db');

// En backend/controllers/customerController.js

const getCustomersWithBalance = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                id,
                name AS customer_name, 
                address AS customer_address, 
                phone, 
                location_type,
                total_debt
            FROM customers 
            ORDER BY id ASC
        `);
        // Cambia esto para que coincida con lo que espera tu service
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("Error al obtener clientes:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

module.exports = {
    getCustomersWithBalance
};