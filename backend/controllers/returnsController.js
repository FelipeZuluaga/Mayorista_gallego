// ARCHIVO DEVOLUCIÓN Y HISTORIAL DE DEVOLUCIÓN

const db = require('../config/db');

// DEVOLUCIÓNES
const processReturn = async (req, res) => {
    const { order_id, items } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        for (const item of items) {
            // CAMBIO: Ahora leemos 'quantity' en lugar de 'cantidad_a_devolver'
            const cantADevolver = parseInt(item.quantity); 
            const productId = item.product_id;

            if (!isNaN(cantADevolver) && cantADevolver > 0) {
                // 1. SUMAR AL INVENTARIO
                await connection.query(
                    "UPDATE products SET stock = stock + ? WHERE id = ?",
                    [cantADevolver, productId]
                );

                // 2. REGISTRAR EN HISTORIAL
                await connection.query(
                    "INSERT INTO order_returns (order_id, product_id, quantity) VALUES (?, ?, ?)",
                    [order_id, productId, cantADevolver]
                );
            }
        }

        // 3. Marcar la orden como DEVOLUCION (o lo que corresponda)
        await connection.query(
            "UPDATE orders SET status = 'DEVOLUCION' WHERE id = ?",
            [order_id]
        );

        await connection.commit();
        res.json({ success: true, message: "La devolución fue procesada correctamente." });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error en SQL:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};
// 2. NUEVA FUNCIÓN: Obtener lo que se devolvió de una orden
const getReturnHistory = async (req, res) => {
    const { orderId } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT 
                r.product_id, -- <--- TE FALTABA ESTO
                r.quantity as cantidad_devuelta, 
                p.name as product_name, 
                r.return_date 
            FROM order_returns r 
            JOIN products p ON r.product_id = p.id 
            WHERE r.order_id = ?`,
            [orderId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        // Actualiza el campo status en la tabla orders (m_g_orders)[cite: 6]
        await db.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
        res.json({ success: true, message: "Estado de orden actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//-----------------------------------------------------------------------------------------------
const getTruckInventory = async (req, res) => {
    const { orderId } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT
                p.barcode AS codg_barras,
                oi.product_id, 
                p.name as product_name, 
                oi.quantity as despachado,
                oi.unit_price AS precio_base,
                IFNULL((SELECT SUM(si.quantity) 
                        FROM sale_items si 
                        JOIN sales s ON si.sale_id = s.id 
                        WHERE s.order_id = oi.order_id 
                        AND si.product_id = oi.product_id), 0) as vendido
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [orderId]
        );

        // MAPEO CORREGIDO: Agregamos "vendido" al objeto de respuesta
        const stockEnCamion = rows.map(item => ({
            codg_barras: item.codg_barras,
            product_id: item.product_id,
            product_name: item.product_name,
            despachado: item.despachado,
            vendido: item.vendido, // <--- ¡FALTABA ESTA LÍNEA!
            cantidad_sobrante: item.despachado - item.vendido,
            precio_base: item.precio_base,
        }));

        res.json(stockEnCamion);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    processReturn,
    getReturnHistory,
    getTruckInventory,
    updateOrderStatus
};