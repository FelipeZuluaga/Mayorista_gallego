const db = require('../config/db');

// --- CREAR PEDIDO ---
const createOrder = async (req, res) => {
    const { user_id, receptor_name, customer_type_id, items } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        let totalOrderAmount = 0;
        const processedItems = [];

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

        const [orderRes] = await connection.query(
            `INSERT INTO orders (user_id, seller_name, customer_type_id, total_amount, status, created_at) 
             VALUES (?, ?, ?, ?, 'DESPACHADO', NOW())`,
            [user_id, receptor_name, customer_type_id, totalOrderAmount]
        );

        const orderId = orderRes.insertId;

        for (const item of processedItems) {
            await connection.query(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
                [orderId, item.product_id, item.quantity, item.unit_price, item.total_price]
            );

            await connection.query(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                [item.quantity, item.product_id]
            );
        }

        await connection.commit();
        res.status(201).json({ success: true, message: "Despacho realizado con éxito", order_id: orderId });

    } catch (error) {
        await connection.rollback();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

const getOrdersByRole = async (req, res) => {
    const { user_id, role } = req.query;
    try {
        // Seleccionamos campos de orders y nombres de las tablas relacionadas
        let query = `
            SELECT o.*, 
                   u.name as dispatcher_name, 
                   ct.name as customer_type_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN customer_types ct ON o.customer_type_id = ct.id
        `;
        let params = [];

        if (role === 'ADMINISTRADOR') {
            query += " ORDER BY o.created_at DESC";
        } else if (role === 'DESPACHADOR') {
            query += " WHERE o.user_id = ? ORDER BY o.created_at DESC";
            params = [user_id];
        } else {
            query += " WHERE o.seller_name = ? ORDER BY o.created_at DESC";
            params = [user_id];
        }

        const [orders] = await db.query(query, params);
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al cargar pedidos" });
    }
};

const getOrderDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT 
                oi.id, 
                oi.product_id, 
                p.name AS product_name, 
                oi.quantity, 
                oi.unit_price 
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [id]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error en getOrderDetail:", error);
        res.status(500).json({ message: "Error al obtener detalle" });
    }
};
// --- NUEVA: ELIMINAR PEDIDO Y DEVOLVER STOCK ---
const deleteOrder = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obtener los productos y cantidades para devolverlos al stock
        const [items] = await connection.query(
            "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
            [id]
        );

        // 2. Revertir el stock en la tabla productos
        for (const item of items) {
            await connection.query(
                "UPDATE products SET stock = stock + ? WHERE id = ?",
                [item.quantity, item.product_id]
            );
        }

        // 3. Eliminar los items (por integridad referencial)
        await connection.query("DELETE FROM order_items WHERE order_id = ?", [id]);

        // 4. Eliminar el pedido
        await connection.query("DELETE FROM orders WHERE id = ?", [id]);

        await connection.commit();
        res.json({ success: true, message: "Pedido eliminado y stock restaurado correctamente" });

    } catch (error) {
        await connection.rollback();
        console.error("Error al eliminar pedido:", error);
        res.status(500).json({ success: false, message: "No se pudo eliminar el pedido" });
    } finally {
        connection.release();
    }
};
const updateOrderItems = async (req, res) => {
    const { id } = req.params;
    const { seller_name, items, customer_type_id } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Actualizar datos generales de la orden
        await connection.query(
            "UPDATE orders SET seller_name = ? WHERE id = ?",
            [seller_name, id]
        );

        // 2. Devolver stock de los items actuales antes de borrarlos
        const [oldItems] = await connection.query(
            "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
            [id]
        );

        for (const item of oldItems) {
            await connection.query(
                "UPDATE products SET stock = stock + ? WHERE id = ?",
                [item.quantity, item.product_id]
            );
        }

        // 3. Borrar items viejos para reemplazarlos
        await connection.query("DELETE FROM order_items WHERE order_id = ?", [id]);

        // 4. Insertar nuevos items y validar stock/precios
        let newTotalAmount = 0;

        for (const item of items) {
            const pId = Number(item.product_id);
            const qty = Number(item.quantity);

            // Validación crucial para evitar el error de "undefined" o "NaN"
            if (!pId || isNaN(pId)) {
                throw new Error("Se recibió un ID de producto no válido.");
            }

            const [productResult] = await connection.query(
                "SELECT stock, name FROM products WHERE id = ?",
                [pId]
            );

            if (productResult.length === 0) {
                throw new Error(`El producto con ID ${pId} no existe en el inventario.`);
            }

            const product = productResult[0];

            if (product.stock < qty) {
                throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
            }

            // Buscar precio por tipo de cliente
            const [priceData] = await connection.query(
                "SELECT unit_price FROM product_prices WHERE product_id = ? AND customer_type_id = ?",
                [pId, customer_type_id]
            );

            const unitPrice = priceData[0]?.unit_price || 0;
            const subtotal = unitPrice * qty;
            newTotalAmount += subtotal;

            // Insertar detalle y descontar del inventario
            await connection.query(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
                [id, pId, qty, unitPrice, subtotal]
            );

            await connection.query(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                [qty, pId]
            );
        }

        // 5. Actualizar el total de la orden original
        await connection.query("UPDATE orders SET total_amount = ? WHERE id = ?", [newTotalAmount, id]);

        await connection.commit();
        res.json({ success: true, message: "Pedido actualizado y stock sincronizado" });

    } catch (error) {
        if (connection) await connection.rollback();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};
module.exports = {
    createOrder,
    getOrdersByRole,
    getOrderDetail,
    deleteOrder,
    updateOrderItems
};