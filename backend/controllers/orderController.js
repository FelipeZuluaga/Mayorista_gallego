const db = require('../config/db');

const createOrder = async (req, res) => {
    const { user_id, seller_name, customer_type_id, customer_name, items } = req.body;
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        let totalOrderAmount = 0;
        const processedItems = [];

        // 1. Validar precios y calcular totales
        for (const item of items) {
            const [priceData] = await connection.query(
                "SELECT unit_price FROM product_prices WHERE product_id = ? AND customer_type_id = ?",
                [item.product_id, customer_type_id]
            );

            if (priceData.length === 0) throw new Error(`Producto ID ${item.product_id} no tiene precio.`);

            const unitPrice = priceData[0].unit_price;
            const subtotal = unitPrice * item.quantity;
            totalOrderAmount += subtotal;

            processedItems.push({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: unitPrice,
                total_price: subtotal
            });
        }

        // 2. Insertar en 'orders' con estado DESPACHADO
        const [orderRes] = await connection.query(
            `INSERT INTO orders (user_id, seller_name, customer_type_id, customer_name, total_amount, status, visitation_status) 
             VALUES (?, ?, ?, ?, ?, 'DESPACHADO', 'Pendiente de visitar')`,
            [user_id, seller_name, customer_type_id, customer_name, totalOrderAmount]
        );
        
        const orderId = orderRes.insertId;

        // 3. Insertar en 'order_items' usando tus columnas: unit_price y total_price
        for (const item of processedItems) {
            await connection.query(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
                [orderId, item.product_id, item.quantity, item.unit_price, item.total_price]
            );

            // 4. Descontar stock de la tabla products
            await connection.query(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                [item.quantity, item.product_id]
            );
        }

        await connection.commit();
        res.status(201).json({ success: true, message: "Despacho realizado con éxito", order_id: orderId });

    } catch (error) {
        await connection.rollback();
        console.error("Error en despacho:", error);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};
const getOrdersByRole = async (req, res) => {
    // Estos datos deben venir de tu middleware de auth o del body si aún no usas JWT
    const { user_id, role, name } = req.query; 

    try {
        let query = "SELECT * FROM orders";
        let params = [];

        if (role === 'ADMINISTRADOR') {
            // 1. Administrador: Ve el histórico de TODOS los pedidos
            query += " ORDER BY created_at DESC";
        } 
        else if (role === 'DESPACHADOR') {
            // 2. Despachador: Ve solo los que él mismo creó usando su user_id
            query += " WHERE user_id = ? ORDER BY created_at DESC";
            params = [user_id];
        } 
        else if (role === 'SOCIO' || role === 'NO_SOCIO') {
            // 3. Socio/No Socio: Ve los pedidos donde su nombre es el 'seller_name'
            query += " WHERE seller_name = ? ORDER BY created_at DESC";
            params = [name];
        }

        const [orders] = await db.query(query, params);
        res.json(orders);
    } catch (error) {
        console.error("Error al obtener historial:", error);
        res.status(500).json({ success: false, message: "Error al cargar pedidos" });
    }
};
// backend/controllers/orderController.js
const getOrderDetail = async (req, res) => {
    const { id } = req.params;
    try {
        // Seleccionamos unit_price y total_price que son los nombres reales en tu DB
        const [items] = await db.query(
            `SELECT oi.id, oi.quantity, oi.unit_price, oi.total_price, p.name as product_name 
             FROM order_items oi 
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = ?`,
            [id]
        );
        res.json(items);
    } catch (error) {
        console.error("Error detallado:", error);
        res.status(500).json({ message: "Error al obtener el detalle" });
    }
};

// Exporta la nueva función
module.exports = { createOrder, getOrdersByRole, getOrderDetail };