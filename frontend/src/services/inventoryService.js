// SERVICES: inventoryService.js
import api from "./api";

// Función auxiliar para obtener el rol del usuario desde el almacenamiento local
const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return { 
        headers: { 
            role: user?.role?.toUpperCase() 
        } 
    };
};

export const inventoryService = {
    // Obtener todos los productos con sus categorías y precios agrupados
    getProducts: async () => {
        const res = await api.get("/inventory", getHeaders());
        // Retornamos directamente el array de productos alojado en .data
        return res.data.data; 
    },

    // Obtener las categorías para llenar el select del formulario
    getCategories: async () => {
        const res = await api.get("/inventory/categories", getHeaders());
        // Retornamos el array de categorías alojado en .data
        return res.data.data;
    },

    // Crear una categoría desde el select
    createCategory: async (categoryData) => {
        const res = await api.post("/inventory/categories", categoryData, getHeaders());
        return res.data; // Devuelve el mensaje de éxito y el nuevo ID
    },
    
    // Crear un nuevo producto junto con su array de precios
    createProduct: async (productData) => {
        const res = await api.post("/inventory", productData, getHeaders());
        return res.data;
    },

    // Actualizar datos básicos y refrescar la tabla de precios
    updateProduct: async (id, productData) => {
        const res = await api.put(`/inventory/${id}`, productData, getHeaders());
        return res.data;
    },

    // Eliminar producto
    deleteProduct: async (id) => {
        const res = await api.delete(`/inventory/${id}`, getHeaders());
        return res.data;
    }
};