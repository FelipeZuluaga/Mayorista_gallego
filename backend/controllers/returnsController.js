// ARCHIVO DEVOLUCIÓN Y HISTORIAL DE DEVOLUCIÓN

const db = require('../config/db');


const settleOrder = async (req, res) => {
    const { orderId } = req.params;

    // Capturamos los datos enviados desde el frontend (React)
    const {
        user_id,
        total_recaudado,
        ventas_totales,
        cartera_anterior,
        valor_almuerzo,
        valor_gasolina,
        ganancia_vendedor,
        efectivo_fisico,
        diferencia
    } = req.body || {};

    try {
        // 1. RECAUDO Y VENTAS DE LA TABLA SALES (Para el Cobro)
        const [cashData] = await db.query(`
            SELECT IFNULL(SUM(amount_paid), 0) as total_recaudado,
                   IFNULL(SUM(total_amount), 0) as ventas_totales_hoy
            FROM sales WHERE order_id = ?
        `, [orderId]);

        // 2. CARTERA
        const [carteraData] = await db.query(`
            SELECT IFNULL(SUM(total_debt), 0) as cartera_anterior 
            FROM customers 
            WHERE id IN (SELECT DISTINCT customer_id FROM sales WHERE order_id = ?)
        `, [orderId]);

        // 3. OBTENER USER_ID DE LA ORDEN
        const [orderInfo] = await db.query("SELECT user_id FROM orders WHERE id = ?", [orderId]);

        // 4. NUEVO: CALCULAR EL SURTIDO REAL BASADO EN DEVOLUCIONES
        // Restamos lo devuelto (order_returns) de lo despachado originalmente (order_items)
        const [surtidoData] = await db.query(`
            SELECT IFNULL(
                SUM(
                    (oi.quantity - IFNULL(r.quantity, 0)) * oi.unit_price
                ), 0
            ) AS total_surtido_real
            FROM order_items oi
            LEFT JOIN order_returns r ON oi.order_id = r.order_id AND oi.product_id = r.product_id
            WHERE oi.order_id = ?
        `, [orderId]);

        const totalSurtidoReal = surtidoData[0].total_surtido_real;

        // 5. FLUJO DE CONSULTA (Si no hay efectivo_fisico enviado)
        if (efectivo_fisico === undefined) {
            return res.json({
                user_id: orderInfo[0]?.user_id,
                total_recaudado: cashData[0].total_recaudado,
                // Retornamos el cálculo real basado en las devoluciones registradas
                ventas_totales_hoy: totalSurtidoReal, 
                cartera_anterior: carteraData[0].cartera_anterior
            });
        }

        // 6. FLUJO DE GUARDADO (POST - FINALIZAR)
        await db.query(`
            INSERT INTO m_g_settlements 
            (order_id, user_id, total_recaudado, ventas_totales, cartera_anterior, 
             valor_almuerzo, valor_gasolina, ganancia_vendedor, efectivo_fisico, diferencia)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            orderId,
            user_id || orderInfo[0]?.user_id,
            total_recaudado,
            ventas_totales, // Aquí ya se guardará el total neto enviado por el cliente
            cartera_anterior,
            valor_almuerzo,
            valor_gasolina,
            ganancia_vendedor,
            efectivo_fisico,
            diferencia
        ]);

        // 7. ACTUALIZAR ESTADO DE LA ORDEN
        await db.query("UPDATE orders SET status = 'LIQUIDADO' WHERE id = ?", [orderId]);

        res.json({
            success: true,
            message: "Liquidación guardada en m_g_settlements y ruta cerrada."
        });

    } catch (error) {
        console.error(error);
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
const processReturn = async (req, res) => {
    const { order_id, items } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. OBTENER LAS DEVOLUCIONES QUE YA SE HABÍAN REGISTRADO ANTES PARA ESTA ORDEN
        const [existingReturns] = await connection.query(
            "SELECT product_id, quantity FROM order_returns WHERE order_id = ?",
            [order_id]
        );

        // 2. REVERTIR EL STOCK PREVIO DEL INVENTARIO GENERAL
        // (Restamos lo que habíamos devuelto antes para dejar el stock como si nunca se hubiera hecho)
        for (const prevItem of existingReturns) {
            const prevQty = parseInt(prevItem.quantity) || 0;
            if (prevQty > 0) {
                await connection.query(
                    "UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?",
                    [prevQty, prevItem.product_id]
                );
            }
        }

        // 3. ELIMINAR EL HISTORIAL DE DEVOLUCIONES PREVIAS DE ESTA ORDEN
        await connection.query(
            "DELETE FROM order_returns WHERE order_id = ?",
            [order_id]
        );

        // 4. APLICAR LAS NUEVAS DEVOLUCIONES FÍSICAS ACTUALIZADAS
        for (const item of items) {
            const cantADevolver = parseInt(item.quantity); 
            const productId = item.product_id;

            if (!isNaN(cantADevolver) && cantADevolver >= 0) {
                // SUMAR el nuevo valor al inventario general
                if (cantADevolver > 0) {
                    await connection.query(
                        "UPDATE products SET stock = stock + ? WHERE id = ?",
                        [cantADevolver, productId]
                    );

                    // REGISTRAR en el historial la cantidad definitiva actual
                    await connection.query(
                        "INSERT INTO order_returns (order_id, product_id, quantity) VALUES (?, ?, ?)",
                        [order_id, productId, cantADevolver]
                    );
                }
            }
        }

        // 5. Marcar/mantener la orden en estado 'DEVOLUCION'
        await connection.query(
            "UPDATE orders SET status = 'DEVOLUCION' WHERE id = ?",
            [order_id]
        );

        await connection.commit();
        res.json({ success: true, message: "La devolución fue actualizada correctamente." });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error en SQL:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};
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
    settleOrder,
    updateOrderStatus,
    processReturn,
    getReturnHistory,
    getTruckInventory
};