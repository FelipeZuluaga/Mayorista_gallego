const db = require('../config/db');

const createSale = async (req, res) => {
    const { 
        order_id, 
        seller_name, 
        customer_name, 
        items, 
        total_amount, 
        amount_paid 
    } = req.body;

    // El balance_due es la deuda restante
    const balance_due = total_amount - amount_paid;
    
    // Si el saldo es 0 o menor, la orden está PAGADA, de lo contrario queda PENDIENTE
    const finalStatus = balance_due <= 0 ? 'PAGADO' : 'PENDIENTE';

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Insertar en la tabla 'sales' incluyendo abonos y deuda
        const [saleRes] = await connection.query(
            `INSERT INTO sales (order_id, seller_name, customer_name, total_amount, amount_paid, balance_due) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [order_id, seller_name, customer_name, total_amount, amount_paid, balance_due]
        );
        const saleId = saleRes.insertId;

        // 2. Insertar los productos liquidados en 'sale_items'
        // Usamos los nombres de columna exactos: product_id, product_name, unit_price, total_price
        for (const item of items) {
            await connection.query(
                `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [saleId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price]
            );
        }

        // 3. Actualizar el estado de la orden original según el pago
        await connection.query(
            "UPDATE orders SET status = ? WHERE id = ?",
            [finalStatus, order_id]
        );

        await connection.commit();
        res.status(201).json({ 
            success: true, 
            message: finalStatus === 'PAGADO' ? "Venta liquidada y pagada" : "Liquidación registrada con saldo pendiente",
            saleId: saleId
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error en liquidación:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error al procesar la liquidación: " + error.message 
        });
    } finally {
        connection.release();
    }
};

const getSales = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM sales ORDER BY created_at DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = { createSale, getSales };