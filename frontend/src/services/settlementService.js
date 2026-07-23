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