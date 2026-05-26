// frontend/src/services/descuadreService.js
import api from "./api";

export const descuadreService = {
    // 1. Obtener el historial completo de descuadres desde el backend
    obtenerDescuadres: async () => {
        try {
            // Llama a la ruta raíz vinculada en server.js: /api/descuadres
            const response = await api.get("/descuadres");
            return response.data.data; // Retorna el arreglo de filas que envía el backend
        } catch (error) {
            const message = error.response?.data?.message || "Error al obtener el historial de descuadres";
            console.error("Error en obtenerDescuadres:", message);
            throw new Error(message);
        }
    },

    // 2. Crear un registro de descuadre en la base de datos
    crearDescuadre: async (descuadreData) => {
        try {
            // Apunta a la ruta de inserción: /api/descuadres/create
            const response = await api.post("/descuadres/create", descuadreData);
            return response.data.data;
        } catch (error) {
            // Mismo manejo de errores limpio y descriptivo de customerService
            const message = error.response?.data?.message || "Error al registrar el descuadre en el servidor";
            console.error("Error en crearDescuadre:", message);
            throw new Error(message);
        }
    },
    // Obtener catálogo de productos para el formulario
    obtenerProductosLista: async () => {
        try {
            const response = await api.get("/descuadres/productos-lista");
            return response.data.data;
        } catch (error) {
            const message = error.response?.data?.message || "Error al cargar productos";
            throw new Error(message);
        }
    }
};

