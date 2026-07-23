import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
 
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,           // El puerto que prefieras (ej. 3000, 5000, 8080)
    host: true,           // Permite que el servidor sea accesible desde tu red local (IP)
    strictPort: true,     // Si el puerto 3000 está ocupado, la app no subirá a otro puerto al azar
    open: true            // Abre el navegador automáticamente al iniciar
  }
})