import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { inventoryService } from "../services/inventoryService";
import { orderService } from "../services/orderService";
import { alertSuccess, alertError, alertConfirm } from "../services/alertService";
import { User, Truck, ChevronLeft, Search, Warehouse } from "lucide-react";

export default function DespachoPage() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    // Datos del inventario
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    // Formulario de despacho
    const [customerTypeId, setCustomerTypeId] = useState("2"); // 1: CLIENTE, 2: SOCIO, 3: NO_SOCIO, 4: MAYORISTA
    const [sellerName, setSellerName] = useState("");
    const [warehouseCode, setWarehouseCode] = useState(""); // NUEVO: Código de bodega
    const [quantities, setQuantities] = useState({});
    const [scannerInput, setScannerInput] = useState("");

    // Determina si el tipo seleccionado requiere liquidación/bodega directa (Ej: ID 1 = CLIENTE, ID 4 = MAYORISTA)
    const esVentaDirecta = customerTypeId === "1" || customerTypeId === "4";

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await inventoryService.getProducts();
            setProducts(data || []);
        } catch (err) {
            alertError("Error", "No se pudo cargar el inventario.");
        }
    };

    const getUnitPrice = (product) => {
        if (!product || !product.prices) return 0;
        const priceObj = product.prices.find(p =>
            Number(p.customer_type_id) === Number(customerTypeId)
        );
        return priceObj ? Math.trunc(priceObj.unit_price) : 0;
    };

    const handleQtyChange = (id, val, stock) => {
        const value = val === "" ? "" : Math.max(0, Math.min(Number(val), stock));
        setQuantities(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const totalDespacho = products.reduce((acc, p) => {
        const qty = Number(quantities[p.id]) || 0;
        return acc + (qty * getUnitPrice(p));
    }, 0);

    const handleConfirmar = async () => {
        if (!sellerName.trim()) {
            return alertError("Campo vacío", "Ingresa el código/nombre del receptor.");
        }

        // Si es Venta Directa, validamos obligatoriamente la bodega
        if (esVentaDirecta && !warehouseCode.trim()) {
            return alertError("Campo requerido", "Ingresa el código de la bodega para liquidar de inmediato.");
        }

        const items = Object.keys(quantities)
            .filter(id => Number(quantities[id]) > 0)
            .map(id => ({
                product_id: Number(id),
                quantity: Number(quantities[id])
            }));

        if (items.length === 0) return alertError("Pedido vacío", "No has seleccionado productos.");

        const titulo = esVentaDirecta ? "¿Liquidar Venta Directa?" : "¿Confirmar Despacho?";
        const mensaje = esVentaDirecta
            ? `Se liquidará la venta inmediatamente en la bodega ${warehouseCode} por un total de $${totalDespacho.toLocaleString()}.`
            : `Se restará el stock y se registrará un total de $${totalDespacho.toLocaleString()} a nombre de ${sellerName}.`;

        const confirm = await alertConfirm(titulo, mensaje);

        if (confirm.isConfirmed) {
            try {
                setLoading(true);
                await orderService.createOrder({
                    user_id: user?.id,
                    receptor_name: sellerName,
                    customer_type_id: Number(customerTypeId),
                    warehouse_code: esVentaDirecta ? warehouseCode : null, // Se envía la bodega si aplica
                    auto_liquidate: esVentaDirecta, // Flag opcional para que el backend liquide de una vez
                    items
                });

                await alertSuccess(
                    esVentaDirecta ? "Venta Liquidada" : "Despacho Exitoso",
                    "El stock y la transacción se procesaron correctamente."
                );
                navigate("/historialDespachos");
            } catch (err) {
                alertError("Error de Proceso", err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBarcodeScan = (e) => {
        if (e.key === 'Enter') {
            const barcode = scannerInput.trim();
            const product = products.find(p => p.barcode === barcode);

            if (product) {
                const currentQty = Number(quantities[product.id] || 0);
                if (currentQty < product.stock) {
                    setQuantities(prev => ({
                        ...prev,
                        [product.id]: currentQty + 1
                    }));
                } else {
                    alertError("Stock limitado", "No hay más stock disponible para este producto.");
                }
            } else {
                alertError("No encontrado", "Producto no registrado con ese código.");
            }
            setScannerInput("");
        }
    };

    return (
        <div className="inv-page full-layout">
            <div className="module-intro">
                <button className="btn-primary-main" onClick={() => navigate(-1)} style={{ marginBottom: '15px' }}>
                    <ChevronLeft size={16} /> Volver al Panel
                </button>
                <h1>Salida de Mercancía (Despacho)</h1>
                <p>Configura el tipo de lista y el receptor para actualizar el inventario.</p>
            </div>

            <div className="inv-card full-width-card">
                <div className="form-grid">
                    <div className="input-group">
                        <label><Truck size={14} /> Tipo de cliente</label>
                        <select value={customerTypeId} onChange={(e) => setCustomerTypeId(e.target.value)}>
                            <option value="1">CLIENTE</option>
                            <option value="2">SOCIO</option>
                            <option value="3">NO SOCIO</option>
                            <option value="4">MAYORISTA</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label><User size={14} /> Código vendedor / Receptor</label>
                        <input
                            value={sellerName}
                            onChange={e => setSellerName(e.target.value)}
                            placeholder="Ej: VENDEDOR01"
                        />
                    </div>

                    {/* CAMPO DINÁMICO: Solo se muestra si se requiere bodega / liquidación directa */}
                    {esVentaDirecta && (
                        <div className="input-group">
                            <label><Warehouse size={14} /> Código de Bodega *</label>
                            <input
                                value={warehouseCode}
                                onChange={e => setWarehouseCode(e.target.value)}
                                placeholder="Ej: BOD-001"
                                className="input-highlight"
                            />
                        </div>
                    )}
                </div>

                <div className="search-controls-wrapper" style={{ display: 'flex', gap: '15px', margin: '25px 0', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '2' }}>
                        <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            className="input-group-field"
                            style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                            placeholder="Filtrar productos por nombre..."
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ position: 'relative', flex: '1' }}>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Pistolea el código aquí..."
                            value={scannerInput}
                            onChange={(e) => setScannerInput(e.target.value)}
                            onKeyDown={handleBarcodeScan}
                            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #0d2a4d', backgroundColor: '#fffcfc', fontSize: '14px', fontWeight: '500', outline: 'none' }}
                        />
                    </div>
                </div>

                <div className="table-container-fixed">
                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Producto</th>
                                <th>Stock Actual</th>
                                <th>Precio Unit.</th>
                                <th width="120">LLEVA</th>
                                <th className="col-total">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products
                                .filter(p =>
                                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (p.barcode && p.barcode.includes(searchTerm))
                                )
                                .sort((a, b) => {
                                    const qtyA = Number(quantities[a.id]) || 0;
                                    const qtyB = Number(quantities[b.id]) || 0;

                                    if (qtyA > 0 && qtyB === 0) return -1;
                                    if (qtyA === 0 && qtyB > 0) return 1;
                                    return 0;
                                })
                                .map(p => (
                                    <tr key={p.id} className={Number(quantities[p.id]) > 0 ? "row-selected" : ""}>
                                        <td className="font-mono text-gray-500">{p.barcode || "-"}</td>
                                        <td className="font-bold">{p.name}</td>
                                        <td>
                                            <span className={`badge-stock ${p.stock < 10 ? 'stock-low' : ''}`}>
                                                {p.stock}
                                            </span>
                                        </td>
                                        <td>${getUnitPrice(p).toLocaleString()}</td>
                                        <td>
                                            <input
                                                type="number"
                                                className="qty-input"
                                                style={{ width: '100%', textAlign: 'center' }}
                                                value={quantities[p.id] ?? ""}
                                                onChange={e => handleQtyChange(p.id, e.target.value, p.stock)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="col-total">
                                            ${((Number(quantities[p.id]) || 0) * getUnitPrice(p)).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                <div className="form-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: '0', backgroundColor: 'white', padding: '20px 0', borderTop: '2px solid #eee', zIndex: 10 }}>
                    <div style={{ fontSize: '22px', fontWeight: '800' }}>
                        TOTAL: <span style={{ color: 'var(--primary)' }}>${totalDespacho.toLocaleString()}</span>
                    </div>
                    <button className="btn-primary-main" onClick={handleConfirmar} disabled={loading || totalDespacho === 0}>
                        {loading ? "Procesando..." : esVentaDirecta ? "Liquidar Venta Directa" : "Confirmar y Descontar Stock"}
                    </button>
                </div>
            </div>
        </div>
    );
}