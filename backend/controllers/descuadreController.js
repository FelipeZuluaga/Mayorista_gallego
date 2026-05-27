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

const actualizarDescuadre = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { cantidad, estado } = req.body; 

        if (cantidad === undefined || !estado) {
            return res.status(400).json({
                success: false,
                message: "La cantidad y el estado son requeridos para actualizar."
            });
        }

        await connection.beginTransaction();

        // Paso A: Obtener cómo estaba el descuadre originalmente antes del cambio
        const [original] = await connection.query(
            "SELECT producto, cantidad AS cant_vieja, estado AS estado_viejo FROM descuadres WHERE id = ?",
            [id]
        );

        if (original.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Descuadre no encontrado." });
        }

        const { producto, cant_vieja, estado_viejo } = original[0];

        // Paso B: REVERTIR POR COMPLETO EL EFECTO ANTERIOR (Dejar el stock como si este descuadre nunca hubiera existido)
        if (estado_viejo === "Pagado") {
            // Si antes era Pagado, asumíamos stock limpio, por ende para neutralizarlo NO sumábamos ni restábamos.
            // (Si en tu lógica previa 'Pagado' sumaba stock extra sobre el valor original, se restaría aquí, 
            // pero lo correcto para el inventario real es que 'Pagado' mantenga el stock intacto).
            // Si antes NO restó stock, revertirlo significa no hacer nada:
            // No hacemos operación de stock.
        } else {
            // Si antes era Perdido, No se encontró o Pendiente por pagar, HABÍA RESTADO stock.
            // Para revertirlo y regresarlo a su estado natural, SUMAMOS la cantidad vieja.
            await connection.query("UPDATE products SET stock = stock + ? WHERE name = ?", [cant_vieja, producto]);
        }

        // Paso C: APLICAR EL NUEVO ESTADO SOBRE EL STOCK NEUTRALIZADO
        if (estado === "Pagado") {
            // Si el nuevo estado es 'Pagado', el producto está legalizado/físicamente correcto,
            // por lo tanto NO debe restar nada del stock general de la bodega.
            // No hacemos operación de stock (se queda con el stock recuperado en el Paso B).
        } else {
            // Si el nuevo estado es 'Perdido', 'No se encontro' o 'Pendiente por pagar',
            // el producto sigue faltando en la vida real, por ende RESTAMOS la nueva cantidad ingresada.
            await connection.query("UPDATE products SET stock = stock - ? WHERE name = ?", [parseInt(cantidad), producto]);
        }

        // Paso D: Actualizar definitivamente el registro del descuadre
        const queryUpdate = `
            UPDATE descuadres 
            SET cantidad = ?, estado = ?, fecha = NOW() 
            WHERE id = ?
        `;
        await connection.query(queryUpdate, [parseInt(cantidad), estado, id]);

        // Confirmar la transacción en MySQL sin duplicados
        await connection.commit();

        res.json({
            success: true,
            message: "Descuadre actualizado con éxito y stock recalculado correctamente."
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error al actualizar descuadre:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// REEMPLAZA TU MODULE.EXPORTS AL FINAL DEL ARCHIVO PARA INCLUIRLO:
module.exports = {
    obtenerDescuadres,
    crearDescuadre,
    obtenerListaProductos,
    actualizarDescuadre // <-- Nueva función
};