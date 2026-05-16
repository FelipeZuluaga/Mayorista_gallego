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

const getWeeklySettlements = async (req, res) => {
    const { userId, startDate, endDate } = req.query;

    try {
        const [rows] = await db.query(`
            SELECT 
                user_id,
                SUM(ganancia_vendedor) AS total_ganancia,
                DATE(created_at) AS fecha,
                ELT(
                    WEEKDAY(created_at) + 1,
                    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
                ) AS dia_semana
            FROM m_g_settlements
            WHERE user_id = ? 
              AND DATE(created_at) BETWEEN ? AND ?
            GROUP BY user_id, DATE(created_at), WEEKDAY(created_at)
            ORDER BY fecha ASC
        `, [userId, startDate, endDate]);

        res.json(rows);
    } catch (error) {
        console.error("Error en query semanal:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


const getWeeklyHistory = async (req, res) => {
    try {
        // Obtenemos TODO el historial y el nombre real desde la tabla 'users'
        const [rows] = await db.query(
            `SELECT 
                wh.id, 
                wh.user_id,
                wh.rango_fechas, 
                wh.total_ganancia, 
                wh.neto_pagado, 
                wh.fecha_registro,
                u.name AS vendedor_nombre 
             FROM weekly_history wh
             INNER JOIN users u ON wh.user_id = u.id 
             ORDER BY wh.fecha_registro DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



// Función auxiliar para calcular el rango de la semana actual (Martes a Sábado)
const calcularRangoSemanal = () => {
    const hoy = new Date();
    const diaDeLaSemana = hoy.getDay(); // 0: Domingo, 1: Lunes, 2: Martes...
    
    // Ajustamos para encontrar el martes de la semana actual
    // Si hoy es domingo (0) o lunes (1), retrocedemos a la semana anterior o ajustamos
    const diffAlMartes = diaDeLaSemana >= 2 ? diaDeLaSemana - 2 : diaDeLaSemana + 5;
    
    const martes = new Date(hoy);
    martes.setDate(hoy.getDate() - diffAlMartes);
    
    const sabado = new Date(martes);
    sabado.setDate(martes.getDate() + 4);

    const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${martes.toLocaleDateString('es-CO', opciones)} - ${sabado.toLocaleDateString('es-CO', opciones)}`;
};
const saveWeeklyHistory = async (req, res) => {
    const { userId, total_ganancia, neto_pagado } = req.body;
    
    // Generamos el rango dinámicamente en lugar de recibirlo del body
    const rango_dinamico = calcularRangoSemanal();

    try {
        await db.query(
            `INSERT INTO weekly_history 
            (user_id, rango_fechas, total_ganancia, neto_pagado, fecha_registro) 
            VALUES (?, ?, ?, ?, NOW())`,
            [userId, rango_dinamico, total_ganancia, neto_pagado]
        );

        res.status(201).json({ 
            success: true, 
            message: `Cierre guardado para el periodo: ${rango_dinamico}` 
        });
    } catch (error) {
        console.error("Error en saveWeeklyHistory:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error al guardar el historial: " + error.message 
        });
    }
};

module.exports = { createSale, getSales, getRutaCompleta, getSettlementByOrder, getWeeklySettlements, getWeeklyHistory ,saveWeeklyHistory};