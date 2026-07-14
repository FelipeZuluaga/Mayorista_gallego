// INVENTARIO Y DEMAS
const db = require("../config/db");

/* ==========================================================================
   MIDDLEWARE INTERNO (Opcional, si prefieres manejarlo desde aquí)
   ========================================================================== */
const checkRole = (req, res, rolesPermitidos) => {
    const role = req.headers.role;
    if (!rolesPermitidos.includes(role)) {
        res.status(403).json({ success: false, message: "No autorizado" });
        return false;
    }
    return true;
};

/* ==========================================================================
   LISTAR PRODUCTOS + PRECIOS
   ========================================================================== */
const getInventory = async (req, res) => {
    const sql = `
        SELECT 
            p.id, p.barcode, p.name, p.stock, 
            c.name AS category,
            pp.customer_type_id, pp.unit_price
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_prices pp ON pp.product_id = p.id
        ORDER BY p.id DESC
    `;

    try {
        const [rows] = await db.query(sql);

        const products = {};
        rows.forEach(r => {
            if (!products[r.id]) {
                products[r.id] = {
                    id: r.id,
                    barcode: r.barcode,
                    name: r.name,
                    stock: r.stock,
                    category: r.category,
                    prices: []
                };
            }
            if (r.customer_type_id) {
                products[r.id].prices.push({
                    customer_type_id: r.customer_type_id,
                    unit_price: r.unit_price
                });
            }
        });

        res.json({
            success: true,
            data: Object.values(products)
        });
    } catch (err) {
        console.error("Error al obtener inventario:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error al obtener inventario" 
        });
    }
};

/* ==========================================================================
   CREAR PRODUCTO + PRECIOS
   ========================================================================== */
const createProduct = async (req, res) => {
    if (!checkRole(req, res, ["ADMINISTRADOR", "DESPACHADOR"])) return;

    const { barcode, name, stock, category_id, prices } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            "INSERT INTO products (barcode, name, stock, category_id) VALUES (?, ?, ?, ?)",
            [barcode, name, stock, category_id]
        );

        const productId = result.insertId;

        if (prices && prices.length > 0) {
            const priceValues = prices.map(p => [productId, p.customer_type_id, p.unit_price]);
            await connection.query(
                "INSERT INTO product_prices (product_id, customer_type_id, unit_price) VALUES ?",
                [priceValues]
            );
        }

        await connection.commit();
        res.json({ 
            success: true, 
            message: "Producto y precios creados correctamente",
            data: { id: productId }
        });
    } catch (err) {
        await connection.rollback();
        console.error("Error al crear producto:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error al crear producto" 
        });
    } finally {
        connection.release();
    }
};

/* ==========================================================================
   ACTUALIZAR PRODUCTO (PUT) - SUMA STOCK
   ========================================================================== */
const updateProduct = async (req, res) => {
    if (!checkRole(req, res, ["ADMINISTRADOR", "DESPACHADOR"])) return;

    const productId = req.params.id;
    const { name, stock, category_id, prices } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Actualizar datos básicos sumando el stock
        await connection.query(
            "UPDATE products SET name = ?, stock = stock + ?, category_id = ? WHERE id = ?",
            [name, stock, category_id, productId]
        );

        // Actualizar precios (borrar e insertar de nuevo)
        if (prices && prices.length > 0) {
            await connection.query("DELETE FROM product_prices WHERE product_id = ?", [productId]);
            const priceValues = prices.map(p => [productId, p.customer_type_id, p.unit_price]);
            await connection.query(
                "INSERT INTO product_prices (product_id, customer_type_id, unit_price) VALUES ?",
                [priceValues]
            );
        }

        await connection.commit();
        res.json({ 
            success: true, 
            message: "Producto actualizado y stock incrementado con éxito" 
        });
    } catch (err) {
        await connection.rollback();
        console.error("Error al actualizar producto:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error interno al actualizar" 
        });
    } finally {
        connection.release();
    }
};

/* ==========================================================================
   ELIMINAR PRODUCTO
   ========================================================================== */
const deleteProduct = async (req, res) => {
    if (!checkRole(req, res, ["ADMINISTRADOR", "DESPACHADOR"])) return;

    const productId = req.params.id;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Eliminar precios
        await connection.query("DELETE FROM product_prices WHERE product_id = ?", [productId]);

        // 2. Eliminar producto
        const [result] = await connection.query("DELETE FROM products WHERE id = ?", [productId]);

        if (result.affectedRows === 0) {
            throw new Error("Producto no encontrado");
        }

        await connection.commit();
        res.json({ success: true, message: "Producto eliminado correctamente" });
    } catch (err) {
        await connection.rollback();
        console.error("Error al eliminar producto:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message || "Error al eliminar" 
        });
    } finally {
        connection.release();
    }
};

/* ==========================================================================
   LISTAR CATEGORÍAS
   ========================================================================== */
const getCategories = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, name FROM categories ORDER BY name ASC");
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error("Error en categorías:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error al obtener categorías" 
        });
    }
};

/* ==========================================================================
   CREAR CATEGORÍA
   ========================================================================== */
const createCategory = async (req, res) => {
    if (!checkRole(req, res, ["ADMINISTRADOR", "DESPACHADOR"])) return;

    const { name } = req.body;
    try {
        const [result] = await db.query("INSERT INTO categories (name) VALUES (?)", [name]);
        res.status(201).json({ 
            success: true,
            message: "Categoría creada correctamente", 
            data: { id: result.insertId }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                success: false, 
                message: "La categoría ya existe" 
            });
        }
        console.error("Error al crear categoría:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error al crear categoría" 
        });
    }
};

// Exportamos las funciones siguiendo la misma estructura que customers
module.exports = {
    getInventory,
    createProduct,
    updateProduct,
    deleteProduct,
    getCategories,
    createCategory
};