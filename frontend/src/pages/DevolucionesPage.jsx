import { useEffect, useState } from "react";
import { orderService } from "../services/orderService";
import { saleService } from "../services/saleService"; // Necesitarás un método aquí para devoluciones
import { alertSuccess, alertError } from "../services/alertService";
import { ChevronLeft, PackageCheck, RotateCcw, Save } from "lucide-react";

// DevolucionesPage.jsx
export default function DevolucionesPage({ orderId, sobrantes, onBack }) {
    const [itemsDevolver, setItemsDevolver] = useState([]);

    // En DevolucionesPage.jsx
    useEffect(() => {
        if (sobrantes) {
            setItemsDevolver(sobrantes.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                cantidad_a_devolver: item.stock_en_camion,
                stock_en_sistema: item.stock_en_camion
            })));
            setLoading(false);
        } else {
            cargarDatosLiquidacion();
        }
    }, [orderId, sobrantes]);

    const cargarDatosLiquidacion = async () => {
        try {
            setLoading(true);
            // 1. Obtenemos el detalle del despacho (lo que se le entregó al camion)
            const detalleDespacho = await orderService.getOrderDetail(orderId);

            // 2. Aquí deberías consultar qué se vendió realmente de ese despacho
            // Si no tienes un endpoint de "resumen", podrías calcularlo desde las ventas
            // Por ahora, inicializamos la devolución con el stock actual del camión
            setItemsCargados(detalleDespacho);
            setItemsDevolver(detalleDespacho.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                cantidad_a_devolver: item.quantity, // Por defecto, lo que sobra en el sistema
                stock_en_sistema: item.quantity
            })));
        } catch (err) {
            alertError("Error", "No se pudo cargar la información del despacho.");
        } finally {
            setLoading(false);
        }
    };

    const handleCantidadChange = (id, valor) => {
        const nuevaLista = itemsDevolver.map(item => {
            if (item.product_id === id) {
                return { ...item, cantidad_a_devolver: parseInt(valor) || 0 };
            }
            return item;
        });
        setItemsDevolver(nuevaLista);
    };

    const confirmarDevolucion = async () => {
        try {
            // Este payload enviaría al servidor la orden de re-ingreso al almacén
            const payload = {
                order_id: orderId,
                fecha_devolucion: new Date().toISOString(),
                items: itemsDevolver.filter(i => i.cantidad_a_devolver > 0)
            };

            // await saleService.processReturn(payload); // Implementar en el backend
            alertSuccess("Éxito", "El stock ha sido reintegrado al almacén correctamente.");
            onBack();
        } catch (err) {
            alertError("Error", "No se pudo procesar la devolución.");
        }
    };

    if (loading) return <div className="loading-screen">Calculando sobrantes...</div>;

    return (
        <div className="devoluciones-container">
            <header className="header-actions">
                <button onClick={onBack} className="btn-back-list">
                    <ChevronLeft size={20} /> Volver
                </button>
                <h2 className="ruta-title">Liquidación de Inventario - Despacho #{orderId}</h2>
                <button onClick={confirmarDevolucion} className="btn-confirm-all">
                    <Save size={20} /> Procesar Reingreso
                </button>
            </header>

            <div className="planilla-wrapper">
                <table className="excel-table">
                    <thead>
                        <tr>
                            <th>PRODUCTO</th>
                            <th>STOCK EN CAMIÓN</th>
                            <th>CANT. A DEVOLVER</th>
                            <th>ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsDevolver.map((item) => (
                            <tr key={item.product_id}>
                                <td>{item.product_name}</td>
                                <td>{item.stock_en_sistema}</td>
                                <td>
                                    <input
                                        type="number"
                                        className="input-modern"
                                        value={item.cantidad_a_devolver}
                                        onChange={(e) => handleCantidadChange(item.product_id, e.target.value)}
                                    />
                                </td>
                                <td>
                                    {item.cantidad_a_devolver === item.stock_en_sistema ?
                                        <span className="badge-ok">Cuadrado</span> :
                                        <span className="badge-warning">Diferencia</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}