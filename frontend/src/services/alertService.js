import Swal from 'sweetalert2';
const BRAND_COLOR = '#9b111e'; // El rojo borgoña de tu logo
export const alertSuccess = (title, text) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: BRAND_COLOR
  });
};

export const alertError = (title, text) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: BRAND_COLOR
  });
};

export const alertWarning = (title, text) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: BRAND_COLOR
  });
};
// alertService.js
export const alertConfirm = (title, text) => {
  return Swal.fire({
    title,
    text,
    icon: 'question', // Cambiado a 'question' para que se vea más amigable
    showCancelButton: true,
    confirmButtonColor: BRAND_COLOR,
    cancelButtonColor: '#636e72',
    confirmButtonText: 'Sí, finalizar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  });
};
export const alertConfirmUsers = async (title, text) => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: BRAND_COLOR,
    cancelButtonColor: '#636e72',
    confirmButtonText: 'Sí, finalizar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  });

  // Retornamos estrictamente el booleano isConfirmed
  return result.isConfirmed; 
};
const handleFinalizar = async () => {
    if (isClosed) return;

    // 1. Pedir confirmación al usuario
    const confirmed = await alertConfirmUsers(
        "¿Finalizar Liquidación?",
        "Una vez guardada, no podrás modificar los valores de esta ruta."
    );

    if (!confirmed) return; // Si el usuario cancela, no hacemos nada

    try {
        setIsSaving(true);
        const settlementData = {
            user_id: data?.user_id,
            total_recaudado: recaude_abono,
            ventas_totales: venta_hoy,
            cartera_anterior: debe_ruta,
            valor_almuerzo: gastoAlmuerzo * 1000,
            valor_gasolina: gastoGasolina * 1000,
            ganancia_vendedor: ganancia_vendedor,
            efectivo_fisico: efectivoEntregadoReal * 1000,
            diferencia: falta,
            status: 'LIQUIDADO'
        };

        await orderService.settleOrder(orderId, settlementData);
        
        // 2. Alerta de éxito elegante
        await alertSuccess("¡Logrado!", "La liquidación se ha guardado correctamente.");
        
        navigate(`/ventas-detalle/${orderId}`);
    } catch (error) {
        // 3. Alerta de error
        alertError("Error al finalizar", error.message || "No se pudo procesar la solicitud.");
    } finally {
        setIsSaving(false);
    }
};
export const alertInput = (title, placeholder) => {
  return Swal.fire({
    title,
    input: 'text',
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonColor: BRAND_COLOR,
    cancelButtonColor: '#636e72',
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    inputValidator: (value) => {
      if (!value) {
        return '¡Debes escribir un nombre para la categoría!';
      }
    }
  });
};