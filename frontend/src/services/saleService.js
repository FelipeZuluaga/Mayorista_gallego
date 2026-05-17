import api from "./api";

export const saleService = {
    /**
     * Registra la liquidación final de un despacho.
     * Envía el array de ventas (sales) y el order_id al backend.
     * @param {Object} saleData - { order_id, sales: [...] }
     */
    createSale: async (saleData) => {
        try {
            // Importante: saleData debe contener el order_id y el array de ventas individuales
            const response = await api.post("/sales/create", saleData);
            return response.data; // Retorna { success: true, message: "..." }
        } catch (error) {
            console.error("Error en saleService.createSale:", error);
            // Extraemos el mensaje de error del backend si existe
            const errorMsg = error.response?.data?.message || "Error al procesar la liquidación";
            throw new Error(errorMsg);
        }
    },

    /**
     * Obtiene el historial de rutas liquidadas (Resumen para administración)
     */
    getSalesHistory: async () => {
        try {
            const response = await api.get("/sales");
            return response.data; // Retorna la lista de órdenes liquidadas
        } catch (error) {
            console.error("Error al obtener historial:", error);
            const errorMsg = error.response?.data?.message || "Error al obtener el historial";
            throw new Error(errorMsg);
        }
    },

    /**
     * Obtiene el detalle de lo que se vendió en una ruta específica
     * @param {number|string} orderId 
     */
    // En saleService.js
    getRutaCompleta: async (orderId) => {
        try {
            if (!orderId) throw new Error("ID de orden no proporcionado");

            // Hacemos la petición al endpoint configurado en sales.js
            const response = await api.get(`/sales/ruta-completa/${orderId}`);

            // Retorna el array de clientes y sus resultados (incluyendo los nuevos productos)
            return response.data;
        } catch (error) {
            // Log detallado para ver exactamente qué respondió el servidor antes de fallar
            console.error("Error detallado en getRutaCompleta (Service):", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            const errorMsg = error.response?.data?.message || "Error al obtener la planilla del servidor";
            throw new Error(errorMsg);
        }
    },
    /**
     * NUEVO MÉTODO: Obtiene la liquidación consolidada (Imagen 2)
     * @param {number|string} orderId 
     */
    getSettlementByOrder: async (orderId) => {
        try {
            if (!orderId) throw new Error("ID de orden no proporcionado");
            // Llamamos al nuevo endpoint que creamos en el router
            const response = await api.get(`/sales/settlement/${orderId}`);
            return response.data; // Retorna el objeto con total_recaudado, diferencia, etc.
        } catch (error) {
            console.error("Error en getSettlementByOrder:", error);
            const errorMsg = error.response?.data?.message || "Error al obtener los datos de liquidación";
            throw new Error(errorMsg);
        }
    },




    /** LIQUIDACIÓN SEMANAL*/

    /**
     * NUEVO MÉTODO: Obtiene las liquidaciones de toda la semana para la tabla de Pagos.jsx
     * @param {string} sellerName - Nombre del vendedor (Ej: 'DERWIN', 'OSCAR')
     * @param {string} startDate - Fecha inicial (YYYY-MM-DD)
     * @param {string} endDate - Fecha final (YYYY-MM-DD)
     */
    getWeeklySettlements: async (sellerName, startDate, endDate) => {
        try {
            const response = await api.get("/sales/settlements/weekly", {
                // Modificado: Enviamos sellerName para que coincida con el req.query del Backend
                params: { sellerName, startDate, endDate }
            });
            return response.data; // Retorna el array de liquidaciones por días
        } catch (error) {
            console.error("Error en getWeeklySettlements:", error);
            const errorMsg = error.response?.data?.message || "Error al obtener los pagos semanales";
            throw new Error(errorMsg);
        }
    },
    /**
     * NUEVO: Obtiene todos los cierres de semana calculados e históricos 
     * para la tabla de administración global.
     */
    getWeeklyHistory: async () => {
        try {
            // Eliminamos el ${userId} de la URL porque el backend ahora 
            // nos trae la lista agrupada de todos los vendedores.
            const response = await api.get("/sales/weekly-history");
            return response.data; // Retorna el array para la tabla "Historial de Liquidaciones Semanal"
        } catch (error) {
            console.error("Error en saleService.getWeeklyHistory:", error);
            const errorMsg = error.response?.data?.message || "Error al obtener el historial de pagos";
            throw new Error(errorMsg);
        }
    },
    /**
     * NUEVO: Guarda el cierre definitivo de la semana en el historial
     * @param {Object} weeklyData - { dividido_2, menosTransferencias, status }
     */
    saveWeeklySettlement: async (weeklyData) => {
        try {
            const response = await api.post("/sales/weekly-history", weeklyData);
            return response.data; // Retorna { success: true, message: "..." }
        } catch (error) {
            console.error("Error en saleService.saveWeeklySettlement:", error);
            const errorMsg = error.response?.data?.message || "Error al cerrar y registrar la semana";
            throw new Error(errorMsg);
        }
    },
    /** 🚀 NUEVO MÉTODO: Obtiene el acumulado global de ganancias por vendedor */
    getGananciasVendedores: async () => {
        try {
            // Llama al endpoint que acabamos de mapear en las rutas del backend
            const response = await api.get("/sales/ganancias-vendedores");
            return response.data; // Retorna { success: true, data: [...] }
        } catch (error) {
            console.error("Error en saleService.getGananciasVendedores:", error);
            const errorMsg = error.response?.data?.message || "Error al obtener el consolidado de ganancias";
            throw new Error(errorMsg);
        }
    }
};