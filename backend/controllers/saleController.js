const db = require('../config/db');

const createSale = async (req, res) => {
    const { order_id, sales } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        for (const venta of sales) {
            const {
                customer_id,
                total_amount,   // Valor mercancía de hoy
                amount_paid,    // Dinero para mercancía hoy
                credit_amount,  // Dinero para deuda vieja
                visit_status,   // Estado que viene del frontend (ej: 'LLESO', 'VISITADO')
                items
            } = venta;

            const m_totalVentaHoy = Number(total_amount) || 0;
            const pagoVentaHoy = Number(amount_paid) || 0;
            const n_abonoDeudaVieja = Number(credit_amount) || 0;
            const efectivoTotalRecibido = pagoVentaHoy + n_abonoDeudaVieja;

            // 1. ACTUALIZAR DEUDA Y ESTADO EN TABLA CUSTOMERS (visit_status_c)
            // Actualizamos la deuda primero
            await connection.query(
                `UPDATE customers 
                 SET total_debt = total_debt + ? - ? 
                 WHERE id = ?`,
                [m_totalVentaHoy, efectivoTotalRecibido, customer_id]
            );

            // Consultamos la nueva deuda para aplicar la lógica de 'LLESO'
            const [clienteActualizado] = await connection.query(
                `SELECT total_debt FROM customers WHERE id = ?`,
                [customer_id]
            );

            const nuevaDeuda = Number(clienteActualizado[0].total_debt) || 0;
            let estadoParaCliente = visit_status;

            // Lógica empresarial: Si es LLESO pero ya no debe, se limpia el estado
            if (visit_status === "LLESO" && nuevaDeuda <= 0) {
                estadoParaCliente = null;
            }

            // Actualizamos el estado específico en la tabla customers
            await connection.query(
                `UPDATE customers SET visit_status_c = ? WHERE id = ?`,
                [estadoParaCliente, customer_id]
            );

            // 2. REGISTRAR EN LA TABLA SALES (visit_status)
            const [saleRes] = await connection.query(
                `INSERT INTO sales (
                    order_id, 
                    customer_id, 
                    total_amount, 
                    amount_paid, 
                    visit_status, 
                    created_at
                ) VALUES (?, ?, ?, ?, ?, NOW())`,
                [order_id, customer_id, m_totalVentaHoy, efectivoTotalRecibido, visit_status]
            );

            const saleId = saleRes.insertId;

            // 3. REGISTRAR ITEMS
            if (items && items.length > 0) {
                for (const item of items) {
                    await connection.query(
                        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [
                            saleId,
                            item.product_id, // <--- CORRECCIÓN: Agregar "item." antes
                            item.quantity,
                            item.unit_price,
                            item.total_price
                        ]
                    );
                }
            }
        }

        // 4. FINALIZAR ORDEN
        await connection.query("UPDATE orders SET status = 'EN RUTA' WHERE id = ?", [order_id]);

        await connection.commit();
        res.status(201).json({ success: true, message: "Liquidación completada exitosamente" });

    } catch (error) {
        await connection.rollback();
        console.error("Error en createSale:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};


// RUTA
const getSales = async (req, res) => {
    try {
        // Obtenemos un resumen de las rutas liquidadas
        const [rows] = await db.query(`
            SELECT 
                s.order_id, 
                o.seller_name, 
                SUM(s.total_amount) as total_ruta,
                o.created_at 
            FROM sales s
            JOIN orders o ON s.order_id = o.id
            GROUP BY s.order_id
            ORDER BY o.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getRutaCompleta = async (req, res) => {
    const { orderId } = req.params;
    try {
        // 1. Obtenemos los datos base de la ruta
        const [sales] = await db.query(`
            SELECT 
                o.seller_name AS vendedor_nombre,
                o.created_at AS fecha_venta,
                c.name AS nombre_cliente,
                c.address AS direccion,
                s.id AS sale_id,
                s.visit_status AS estado,
                s.total_amount AS venta,
                c.total_debt AS debe,
                s.amount_paid AS abono,
                c.phone AS telefono
            FROM sales s
            JOIN orders o ON s.order_id = o.id
            JOIN customers c ON s.customer_id = c.id
            WHERE s.order_id = ?
            ORDER BY s.id ASC
        `, [orderId]);

        if (sales.length === 0) {
            return res.json([]);
        }

        // 2. Para cada venta, buscamos sus productos de forma manual
        const rutaConDetalles = await Promise.all(sales.map(async (sale) => {
            const [items] = await db.query(`
                SELECT 
                    p.name AS nombre, 
                    si.quantity AS cantidad, 
                    si.total_price AS total_precio
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = ?
            `, [sale.sale_id]);

            return {
                ...sale,
                productos_detalle: items // Aquí inyectamos el array de productos
            };
        }));

        res.json(rutaConDetalles);
    } catch (error) {
        console.error("Error en servidor:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// LIQUIDACIÓN

const getSettlementByOrder = async (req, res) => {
    const { orderId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                id, 
                order_id, 
                user_id, 
                total_recaudado, 
                ventas_totales, 
                cartera_anterior, 
                valor_almuerzo, 
                valor_gasolina, 
                ganancia_vendedor, 
                efectivo_fisico, 
                diferencia, 
                created_at 
            FROM m_g_settlements 
            WHERE order_id = ?
        `, [orderId]);

        // Retornamos el primer resultado (debería ser único por orden)
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ success: false, message: "No se encontró liquidación para esta orden" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};




// LIQUIDACIÓN SEMANAL

const getWeeklySettlements = async (req, res) => {
    // Cambiamos userId por sellerName en la desestructuración de la Query
    const { sellerName, startDate, endDate } = req.query;

    try {
        const [rows] = await db.query(`
            SELECT 
                o.seller_name AS vendedor_nombre,
                SUM(s.ganancia_vendedor) AS total_ganancia,
                DATE(s.created_at) AS fecha,
                ELT(
                    WEEKDAY(s.created_at) + 1,
                    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
                ) AS dia_semana
            FROM m_g_settlements s
            INNER JOIN orders o ON s.order_id = o.id
            WHERE o.seller_name = ? 
              AND DATE(s.created_at) BETWEEN ? AND ?
            GROUP BY o.seller_name, DATE(s.created_at), WEEKDAY(s.created_at)
            ORDER BY fecha ASC
        `, [sellerName, startDate, endDate]); // <-- Filtramos por el nombre del vendedor

        res.json(rows);
    } catch (error) {
        console.error("Error en query semanal por vendedor:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// HISTORIAL DE LA LIQUIDACIÓN SEMANAL
const getWeeklyHistory = async (req, res) => {
    try {
        // Aseguramos que los nombres de los meses salgan en español
        await db.query("SET lc_time_names = 'es_ES'");

        // Consulta unificada con cálculo de estado dinámico basado en el status de las órdenes
        const [rows] = await db.query(
            `SELECT 
                -- 1. Generamos el ID único con el Año, la Semana y el Nombre del Vendedor
                CONCAT(YEAR(s.created_at), '_W', WEEK(s.created_at, 1), '_', REPLACE(o.seller_name, ' ', '')) AS id,
                
                -- 2. Nombre del vendedor directo desde la orden
                UPPER(o.seller_name) AS vendedor_nombre,
                
                -- 3. Rango de fechas parametrizado estrictamente de Martes a Sábado
                CONCAT(
                    DATE_FORMAT(DATE_SUB(s.created_at, INTERVAL IF(WEEKDAY(s.created_at) >= 1, WEEKDAY(s.created_at) - 1, WEEKDAY(s.created_at) + 6) DAY), '%e de %M de %Y'),
                    ' - ',
                    DATE_FORMAT(DATE_ADD(DATE_SUB(s.created_at, INTERVAL IF(WEEKDAY(s.created_at) >= 1, WEEKDAY(s.created_at) - 1, WEEKDAY(s.created_at) + 6) DAY), INTERVAL 4 DAY), '%e de %M de %Y')
                ) AS rango_fechas,
                
                -- 4. Suma de las ganancias acumuladas en esa semana
                SUM(s.ganancia_vendedor) AS total_ganancia,
                
                -- 5. Neto pagado referencial directo de las ganancias acumuladas
                SUM(s.ganancia_vendedor) AS neto_pagado,
                
                -- 6. ESTADO DINÁMICO: Si la suma de órdenes NO liquidadas es 0, toda la semana está liquidada
                'LIQUIDAR SEMANA' AS estado,
                
                -- 7. IMPORTANTE PARA EL FRONTEND: Enviamos el timestamp máximo para que sirva como 'created_at' de referencia
                MAX(s.created_at) AS created_at,
                
                -- Fecha base (Martes de esa semana) para ordenar de la más nueva a la más vieja
                DATE_SUB(s.created_at, INTERVAL IF(WEEKDAY(s.created_at) >= 1, WEEKDAY(s.created_at) - 1, WEEKDAY(s.created_at) + 6) DAY) AS fecha_orden
                
             FROM m_g_settlements s
             INNER JOIN orders o ON s.order_id = o.id
             
             GROUP BY 
                YEAR(s.created_at), 
                WEEK(s.created_at, 1), 
                o.seller_name
                
             ORDER BY 
                fecha_orden DESC, 
                vendedor_nombre ASC`
        );

        res.json(rows);
    } catch (error) {
        console.error("Error en getWeeklyHistory Backend:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
module.exports = { createSale, getSales, getRutaCompleta, getSettlementByOrder, getWeeklySettlements, getWeeklyHistory};