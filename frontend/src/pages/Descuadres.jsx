// frontend/src/pages/Descuadres.jsx
import React, { useState, useEffect } from 'react';
import { descuadreService } from '../services/descuadreService';

export default function Descuadres() {
  const [formData, setFormData] = useState({
    vendedor: '',
    producto: '', 
    cantidad: '1', // Nuevo campo requerido
    monto: '',
    fecha: '',
    estado: 'Perdido'
  });

  const [descuadres, setDescuadres] = useState([]);
  const [productosDB, setProductosDB] = useState([]); 
  const [loading, setLoading] = useState(false);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      const historial = await descuadreService.obtenerDescuadres();
      setDescuadres(historial || []);

      const productos = await descuadreService.obtenerProductosLista();
      setProductosDB(productos || []);
      
      if (productos && productos.length > 0) {
        setFormData(prev => ({ ...prev, producto: productos[0].name }));
      }
    } catch (error) {
      alert("Error al cargar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendedor || !formData.producto || !formData.cantidad || !formData.monto || !formData.fecha) {
      return alert('Por favor llena todos los campos obligatorios');
    }

    try {
      await descuadreService.crearDescuadre({
        vendedor: formData.vendedor,
        producto: formData.producto,
        cantidad: parseInt(formData.cantidad), // Enviado como entero
        monto: parseFloat(formData.monto),
        fecha: formData.fecha,
        estado: formData.estado
      });

      alert('Descuadre guardado y stock de producto actualizado correctamente.');
      
      // Reseteo del formulario
      setFormData({ 
        vendedor: '', 
        producto: productosDB.length > 0 ? productosDB[0].name : '', 
        cantidad: '1',
        monto: '', 
        fecha: '', 
        estado: 'Perdido' 
      });
      
      // Refrescar tabla automáticamente
      const historialActualizado = await descuadreService.obtenerDescuadres();
      setDescuadres(historialActualizado || []);

    } catch (error) {
      alert(error.message);
    }
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'Pagado': return '#2ecc71';
      case 'Pendiente por pagar': return '#f1c40f';
      case 'Perdido': return '#e74c3c';
      case 'No se encontro': return '#e67e22';
      default: return '#fff';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Módulo de Descuadres e Inventario</h2>
      <p style={{ color: '#555' }}>Los estados afectarán automáticamente las existencias de stock del producto seleccionado.</p>

      {/* Formulario de Registro */}
      <div style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '8px', marginBottom: '25px', color: '#fff' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Registrar Nuevo Descuadre</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          
          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nombre del Vendedor:</label>
            <input 
              type="text" 
              name="vendedor" 
              value={formData.vendedor} 
              onChange={handleChange} 
              placeholder="Ej. Juan Pérez" 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', color: '#000' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Producto:</label>
            <select 
              name="producto" 
              value={formData.producto} 
              onChange={handleChange} 
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#000' }}
            >
              {productosDB.length === 0 ? (
                <option value="">Cargando productos...</option>
              ) : (
                productosDB.map(p => <option key={p.id} value={p.name}>{p.name}</option>)
              )}
            </select>
          </div>

          {/* NUEVO CAMPO: CANTIDAD */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Cantidad:</label>
            <input 
              type="number" 
              name="cantidad" 
              min="1"
              value={formData.cantidad} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', color: '#000' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Monto Cobro ($):</label>
            <input 
              type="number" 
              name="monto" 
              value={formData.monto} 
              onChange={handleChange} 
              placeholder="Ej. 45000" 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', color: '#000' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Fecha:</label>
            <input 
              type="date" 
              name="fecha" 
              value={formData.fecha} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', color: '#000' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo / Estado:</label>
            <select 
              name="estado" 
              value={formData.estado} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#000' }}
            >
              <option value="Perdido">Perdido</option>
              <option value="No se encontro">No se encontró</option>
              <option value="Pendiente por pagar">Pendiente por pagar</option>
              <option value="Pagado">Pagado</option>
            </select>
          </div>

          <button 
            type="submit" 
            style={{ gridColumn: '1 / -1', padding: '12px', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
          >
            Guardar Descuadre
          </button>
        </form>
      </div>

      {/* Tabla de Historial Actualizada */}
      <h3 style={{ marginBottom: '15px' }}>Historial de Descuadres</h3>
      
      {loading ? (
        <p>Cargando información...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#333', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>ID</th>
              <th style={{ padding: '12px' }}>Fecha</th>
              <th style={{ padding: '12px' }}>Vendedor</th>
              <th style={{ padding: '12px' }}>Producto</th>
              <th style={{ padding: '12px' }}>Cant.</th>
              <th style={{ padding: '12px' }}>Monto</th>
              <th style={{ padding: '12px' }}>Tipo / Estado</th>
            </tr>
          </thead>
          <tbody>
            {descuadres.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No hay descuadres registrados en el sistema.</td>
              </tr>
            ) : (
              descuadres.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', color: '#666' }}>#{d.id}</td>
                  <td style={{ padding: '12px' }}>{d.fecha ? d.fecha.substring(0, 10) : 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{d.vendedor}</td>
                  <td style={{ padding: '12px' }}>{d.producto}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{d.cantidad}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>${parseFloat(d.monto).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      backgroundColor: obtenerColorEstado(d.estado) + '22', 
                      color: obtenerColorEstado(d.estado), 
                      padding: '5px 10px', 
                      borderRadius: '4px', 
                      fontWeight: 'bold',
                      fontSize: '13px'
                    }}>
                      {d.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}