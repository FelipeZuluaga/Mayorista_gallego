const db = require('../config/db');

const createSale = async (req, res) => {
    const { order_id, sales } = req.body;

    // Validación inicial de datos recibidos
    if (!sales || !Array.isArray(sales) || sales.length === 0) {
        return res.status(400).json({ success: false, message: "No hay datos de venta válidos" });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const venta of sales) {
            // Desestructuración enfocada en IDs y valores financieros
            const { 
                seller_name, 
                cliente, // Ahora recibimos el objeto cliente que contiene el ID
                visit_status,
                items, 
                total_amount, 
                amount_paid 
            } = venta;

            // PREVENCIÓN DE NaN: Aseguramos valores numéricos
            const totalFinal = Number(total_amount) || 0;
            const abonoFinal = Number(amount_paid) || 0;
            const balance_due = totalFinal - abonoFinal;

            // 1. Registro de la Venta vinculada por customer_id
            // Eliminamos customer_address, customer_phone y location_type
            const [saleRes] = await connection.query(
                `INSERT INTO sales (
                    order_id, 
                    customer_id, 
                    seller_name, 
                    customer_name, 
                    visit_status, 
                    total_amount, 
                    amount_paid, 
                    balance_due
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    order_id, 
                    cliente.id, // ID proveniente de la tabla maestra de clientes
                    seller_name, 
                    cliente.name, // Respaldo del nombre al momento de la venta
                    visit_status, 
                    totalFinal, 
                    abonoFinal, 
                    balance_due
                ]
            );
            const saleId = saleRes.insertId;

            // 2. Registro de Items (Productos) con precio de venta acordado
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    const itemQty = Number(item.quantity) || 0;
                    const itemPrice = Number(item.unit_price) || 0; // Precio base de venta
                    const itemTotal = itemQty * itemPrice;

                    await connection.query(
                        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [saleId, item.product_id, item.product_name, itemQty, itemPrice, itemTotal]
                    );
                }
            }
        }

        // 3. ACTUALIZACIÓN DE LA RUTA: Se marca como PAGADO al finalizar el lote
        await connection.query("UPDATE orders SET status = 'PAGADO' WHERE id = ?", [order_id]);

        await connection.commit();
        res.status(201).json({ 
            success: true, 
            message: "La ruta y todas las ventas han sido liquidadas correctamente." 
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error crítico en liquidación:", error);
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