// SERVICES: returnsService.js
import api from "./api";

// Función auxiliar para obtener las cabeceras (por si requieres el rol en el backend)
const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return { 
        headers: { 
            role: user?.role?.toUpperCase() 
        } 
    };
};

export const returnsService = {
    /**
     * LIQUIDACIÓN ECONÓMICA: 
     * Procesa ventas, devoluciones, abonos y calcula el 50/50 y faltantes.
     * Envía: { abonosManuales, efectivoEntregado, costoProducto }
     */
    settleOrder: async (orderId, settlementData) => {
        try {
            const response = await api.post(`/returns/settle/${orderId}`, settlementData);
            return response.data;
        } catch (error) {
            console.error("Error en settleOrder:", error.response?.data);
            throw error.response?.data?.message || "Error al procesar la liquidación económica";
        }
    },
    updateOrderStatus: async (orderId, status) => {
        try {
            // Asegúrate de que esta ruta coincida con tu backend
            const response = await api.put(`/returns/update-status/${orderId}`, { status });
            return response.data;
        } catch (error) {
            throw error.response?.data?.message || "Error al actualizar el estado";
        }
    },
    /**
     * Procesar la devolución de productos sobrantes al inventario.
     * Envía: { order_id, items: [{product_id, quantity}, ...] }
     */
    processReturn: async (returnData) => {
        try {
            // CAMBIO: Apunta a /returns en lugar de /orders
            const res = await api.post("/returns/process-return", returnData, getHeaders());
            return res.data;
        } catch (error) {
            console.error("Error en processReturn:", error.response?.data);
            throw error.response?.data?.message || "Error al procesar la devolución de productos";
        }
    },

    /**
     * Obtener el historial de devoluciones realizadas para una orden
     */
    getReturnHistory: async (orderId) => {
        try {
            // CAMBIO: Apunta a /returns en lugar de /orders
            const res = await api.get(`/returns/return-history/${orderId}`, getHeaders());
            // Si tu backend devuelve directamente el array, retornamos res.data.
            // Si decides envolverlo luego en { success: true, data: [...] }, usarías res.data.data
            return res.data.data || res.data;
        } catch (error) {
            console.error("Error al obtener historial:", error.response?.data);
            throw error.response?.data?.message || "Error al obtener historial";
        }
    },

    /**
     * Obtener el inventario actual a bordo del camión
     * Calcula: (Cantidad Despachada) - (Cantidad Vendida)
     */
    getTruckInventory: async (orderId) => {
        try {
            // CAMBIO: Apunta a /returns en lugar de /orders
            const res = await api.get(`/returns/truck-inventory/${orderId}`, getHeaders());
            // Retorna el listado procesado del stock disponible en camión
            return res.data.data || res.data;
        } catch (error) {
            console.error("Error al calcular inventario del camión:", error.response?.data);
            throw error.response?.data?.message || "Error al calcular inventario del camión";
        }
    }


};