import axios from 'axios';

// Configuramos la URL base de nuestro backend de Node
const api = axios.create({
  baseURL: 'https://408rxjnj-3001.use.devtunnels.ms/api' 
});

export default api;