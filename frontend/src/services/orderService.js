import api from "./api";

export const orderService = {
    // Crear un nuevo pedido/despacho
    createOrder: async (orderData) => {
        const response = await api.post("/orders/create", orderData);
        return response.data;
    },

    // Obtener pedidos filtrados por el rol del usuario (Admin, Despachador, Socio)
    getOrdersHistory: async (userData) => {
        try {
            const response = await api.get("/orders/history", {
                params: {
                    user_id: userData.id,
                    role: userData.role,
                    name: userData.name
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data?.message || "Error al obtener historial";
        }
    },

    // NUEVA: Obtener los productos detallados de un pedido específico
    getOrderDetail: async (orderId) => {
        try {
            // Esta ruta debe estar registrada en tu backend como /orders/detail/:id
            const response = await api.get(`/orders/detail/${orderId}`);
            return response.data;
        } catch (error) {
            // Esto captura el error que viste en el modal
            throw error.response?.data?.message || "Error al obtener el detalle del pedido";
        }
    }
};