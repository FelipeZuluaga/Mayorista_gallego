// backend/controllers/descuadreController.js
const db = require('../config/db');

// 1. Obtener todos los descuadres (incluyendo el nuevo campo cantidad)
const obtenerDescuadres = async (req, res) => {
    try {
        const query = `
            SELECT id, vendedor, producto, cantidad, monto, fecha, estado 
            FROM descuadres 
            ORDER BY id DESC
        `;
        const [rows] = await db.query(query);
        
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("Error al obtener los descuadres:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Registrar un nuevo descuadre alterando el Stock de forma dinámica
const crearDescuadre = async (req, res) => {
    // Obtenemos una conexión del pool para controlar la transacción manualmente
    const connection = await db.getConnection();
    try {
        const { vendedor, producto, cantidad, monto, fecha, estado } = req.body;

        if (!vendedor || !producto || !cantidad || monto === undefined || !fecha || !estado) {
            return res.status(400).json({
                success: false,
                message: "Todos los campos (vendedor, producto, cantidad, monto, fecha, estado) son requeridos."
            });
        }

        // Iniciamos la transacción atómica
        await connection.beginTransaction();

        // Paso A: Insertar el registro en la tabla descuadres
        const queryInsertar = `
            INSERT INTO descuadres (vendedor, producto, cantidad, monto, fecha, estado) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(queryInsertar, [vendedor, producto, cantidad, monto, fecha, estado]);

        // Paso B: Evaluar regla de negocio para modificar el Stock en la tabla products
        let queryStock = "";
        
        if (estado === "Pagado") {
            // Si está pagado, se reincorpora o suma al stock de productos
            queryStock = "UPDATE products SET stock = stock + ? WHERE name = ?";
        } else {
            // Si es 'Perdido', 'No se encontro' o 'Pendiente por pagar', se descuenta del stock
            queryStock = "UPDATE products SET stock = stock - ? WHERE name = ?";
        }

        await connection.query(queryStock, [parseInt(cantidad), producto]);

        // Si todo salió bien, guardamos definitivamente los cambios en MySQL
        await connection.commit();

        res.json({
            success: true,
            message: `Descuadre registrado con éxito y stock actualizado (${estado === 'Pagado' ? 'Sumado' : 'Descontado'}).`,
            data: { id: result.insertId }
        });

    } catch (error) {
        // Si ocurre cualquier error, cancelamos los cambios para no corromper los datos
        await connection.rollback();
        console.error("Error crítico en transacción de descuadre:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error al procesar el descuadre y actualizar el stock: " + error.message 
        });
    } finally {
        // Liberamos la conexión de vuelta al pool de XAMPP
        connection.release();
    }
};

// 3. Obtener el listado de todos los productos para el select del formulario
const obtenerListaProductos = async (req, res) => {
    try {
        const query = "SELECT id, name FROM products ORDER BY name ASC";
        const [rows] = await db.query(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error al obtener lista de productos:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    obtenerDescuadres,
    crearDescuadre,
    obtenerListaProductos
};