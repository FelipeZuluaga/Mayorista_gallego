// SERVICES: settlementService.js
import api from "./api";

// Función auxiliar para obtener las cabeceras de autorización
const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return { 
        headers: { 
            role: user?.role?.toUpperCase() 
        } 
    };
};

export const settlementService = {
    /**
     * Obtener vendedores filtrados por Rol.
     * Si esta ruta se maneja en el router de orders u otro, asegúrate de dejar el prefijo correcto.
     */
    getVendedoresPorRol: async (roleId) => {
        try {
            // Se asume que este endpoint se encuentra en la sección de orders o users
            const response = await api.get("/orders/vendedores-filtrados", {
                params: { role_id: roleId },
                ...getHeaders()
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error("Error al obtener vendedores filtrados:", error);
            throw error.response?.data?.message || "Error al filtrar usuarios";
        }
    },

    /**
     * Actualiza el estado de una orden.
     */
    updateOrderStatus: async (orderId, status) => {
        try {
            const response = await api.put(`/orders/update-status/${orderId}`, { status }, getHeaders());
            return response.data;
        } catch (error) {
            console.error("Error al actualizar el estado de la orden:", error);
            throw error.response?.data?.message || "Error al actualizar el estado";
        }
    },

    /**
     * Marcar una orden físicamente como LIQUIDADO.
     */
    markAsLiquidated: async (orderId) => {
        try {
            // CORREGIDO: Apunta a /settlement según tu server.js
            const response = await api.post(`/settlement/mark-liquidated/${orderId}`, {}, getHeaders());
            return response.data;
        } catch (error) {
            console.error("Error al marcar liquidado:", error);
            throw error.response?.data?.message || "Error al marcar la orden como liquidada";
        }
    },

    /**
     * LIQUIDACIÓN ECONÓMICA DIARIA: 
     * Procesa ventas, devoluciones, abonos y calcula el 50/50 y faltantes.
     * Envía: { user_id, total_recaudado, ventas_totales, cartera_anterior, valor_almuerzo, valor_gasolina, ganancia_vendedor, efectivo_fisico, diferencia }
     */
    settleOrder: async (orderId, settlementData) => {
        try {
            // CORREGIDO: Apunta a /settlement según tu server.js
            const response = await api.post(`/settlement/settle/${orderId}`, settlementData, getHeaders());
            return response.data;
        } catch (error) {
            console.error("Error en settleOrder:", error.response?.data);
            throw error.response?.data?.message || "Error al procesar la liquidación económica";
        }
    },

    /**
     * Obtiene la liquidación diaria consolidada ya guardada de una orden.
     */
    getSettlementByOrder: async (orderId) => {
        try {
            if (!orderId) throw new Error("ID de orden no proporcionado");
            // CORREGIDO: Apunta a /settlement según tu server.js
            const response = await api.get(`/settlement/settlement/${orderId}`, getHeaders());
            return response.data.data || response.data; 
        } catch (error) {
            console.error("Error en getSettlementByOrder:", error);
            throw error.response?.data?.message || "Error al obtener los datos de liquidación";
        }
    },

    /**
     * Obtiene las liquidaciones de toda la semana para la tabla de pagos de un vendedor.
     */
    getWeeklySettlements: async (sellerName, startDate, endDate) => {
        try {
            // CORREGIDO: Apunta a /settlement según tu server.js
            const response = await api.get("/settlement/settlements/weekly", {
                params: { sellerName, startDate, endDate },
                ...getHeaders()
            });
            return response.data.data || response.data; 
        } catch (error) {
            console.error("Error en getWeeklySettlements:", error);
            throw error.response?.data?.message || "Error al obtener los pagos semanales";
        }
    },

    /**
     * Obtiene todos los cierres de semana calculados e históricos para la administración.
     */
    getWeeklyHistory: async () => {
        try {
            // CORREGIDO: Apunta a /settlement según tu server.js
            const response = await api.get("/settlement/weekly-history", getHeaders());
            return response.data.data || response.data; 
        } catch (error) {
            console.error("Error en getWeeklyHistory:", error);
            throw error.response?.data?.message || "Error al obtener el historial de pagos";
        }
    },

    /**
     * Guarda el cierre definitivo de una semana completa en frío.
     */
    saveWeeklySettlement: async (weeklyData) => {
        try {
            // CORREGIDO: Apunta a /settlement según tu server.js
            const response = await api.post("/settlement/weekly-history", weeklyData, getHeaders());
            return response.data; 
        } catch (error) {
            console.error("Error en saveWeeklySettlement:", error);
            throw error.response?.data?.message || "Error al cerrar y registrar la semana";
        }
    },

    /** 
     * Obtiene el acumulado global de ganancias e historial por vendedor.
     */
    getGananciasVendedores: async () => {
        try {
            // CORREGIDO: Apunta a /settlement según tu server.js
            const response = await api.get("/settlement/ganancias-vendedores", getHeaders());
            return response.data.data || response.data; 
        } catch (error) {
            console.error("Error en getGananciasVendedores:", error);
            throw error.response?.data?.message || "Error al obtener el consolidado de ganancias";
        }
    }
};