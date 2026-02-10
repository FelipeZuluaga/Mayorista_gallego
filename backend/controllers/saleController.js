const db = require('../config/db');

const createSale = async (req, res) => {
    const { order_id, sales } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const venta of sales) {
            const { 
                customer_name, customer_address, customer_phone, 
                location_type, visit_status, seller_name,
                total_amount, amount_paid 
            } = venta;
            
            const totalVenta = Number(total_amount) || 0;
            const pagoRecibido = Number(amount_paid) || 0;
            const saldoDeEstaVenta = totalVenta - pagoRecibido;

            // 1. ACTUALIZAR DEUDA SI EXISTE O CREAR SI ES NUEVO
            // Gracias al UNIQUE en 'name', esto no duplicará personas
            await connection.query(
                `INSERT INTO customers (name, address, phone, location_type, total_debt)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    address = VALUES(address),
                    phone = VALUES(phone),
                    total_debt = total_debt + ?`,
                [customer_name, customer_address, customer_phone, location_type, saldoDeEstaVenta, saldoDeEstaVenta]
            );

            // 2. RECUPERAR EL ID DEL CLIENTE (el existente o el recién creado)
            const [custRes] = await connection.query("SELECT id FROM customers WHERE name = ?", [customer_name]);
            const customer_id = custRes[0].id;

            // 3. REGISTRAR LA VENTA VINCULADA A ESE CLIENTE ESPECÍFICO
            const [saleRes] = await connection.query(
                `INSERT INTO sales (
                    order_id, customer_id, seller_name, 
                    visit_status, total_amount, amount_paid, balance_due
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [order_id, customer_id, seller_name, visit_status, totalVenta, pagoRecibido, saldoDeEstaVenta]
            );

            // 4. REGISTRAR LOS PRODUCTOS
            for (const item of venta.items) {
                await connection.query(
                    `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [saleRes.insertId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price]
                );
            }
        }

        await connection.query("UPDATE orders SET status = 'PAGADO' WHERE id = ?", [order_id]);
        await connection.commit();
        res.status(201).json({ success: true, message: "Venta aplicada al cliente correctamente" });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};
const getSales = async (req, res) => {
    try {
        // Ajustamos el SELECT para traer el nombre del cliente haciendo un JOIN
        const [rows] = await db.query(`
            SELECT s.*, c.name AS customer_name 
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            ORDER BY s.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createSale, getSales };