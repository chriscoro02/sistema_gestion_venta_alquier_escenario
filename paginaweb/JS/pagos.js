// JS/pagos.js
const API_BASE = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_PAGOS_LIST = API_BASE + "PHP/pagos_list.php";
const URL_ALQUILER_ACTIONS = API_BASE + "PHP/alquiler.php"; // Reutilizamos el backend unificado

const tbody = document.getElementById('tbodyPagos');
const usuarioBox = document.getElementById('usuarioBox');

// ... (tu función requireSession)

async function loadPagosPendientes() {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Cargando…</td></tr>`;
    try {
        const response = await fetch(URL_PAGOS_LIST, { credentials: 'include' });
        const result = await response.json();

        if (!result.ok) throw new Error(result.msg);
        if (result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-success">¡No hay pagos pendientes! ✨</td></tr>`;
            return;
        }

        const ahora = new Date();
        tbody.innerHTML = result.data.map(pago => {
            const fechaInicio = new Date(pago.fecha_inicio_uso);
            let claseFila = 'table-success'; // Verde por defecto para los que no son urgentes
            let estadoTexto = "Pendiente";

            if (fechaInicio < ahora) {
                claseFila = 'table-danger'; // Rojo para los vencidos
                estadoTexto = "VENCIDO";
            } else if ((fechaInicio - ahora) / (1000 * 3600 * 24) <= 3) {
                claseFila = 'table-warning'; // Amarillo para los próximos a vencer
                estadoTexto = "Próximo a Vencer";
            }

            return `
                <tr class="${claseFila}">
                    <td>${pago.id_alquiler}</td>
                    <td>${pago.razon_social}</td>
                    <td>${fechaInicio.toLocaleString('es-ES')}</td>
                    <td>${parseFloat(pago.total).toFixed(2)}</td>
                    <td><strong>${estadoTexto}</strong></td>
                    <td class="text-nowrap">
                        <button class="btn btn-sm btn-success" data-id="${pago.id_alquiler}" data-act="pagar">Registrar Pago</button>
                        <button class="btn btn-sm btn-danger ms-1" data-id="${pago.id_alquiler}" data-act="anular">Anular</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

// Event listener para los botones de acción
tbody.addEventListener('click', async (e) => {
    const boton = e.target.closest('button[data-act]');
    if (!boton) return;

    const idAlquiler = boton.dataset.id;
    const accion = boton.dataset.act;

    if (accion === 'pagar') {
        // La lógica de pago que ya tenías en alquiler.js
    }
    
    if (accion === 'anular') {
        if (!confirm(`¿Estás seguro de anular el alquiler #${idAlquiler}?\nLa estructura volverá a estar disponible.`)) return;
        
        try {
            const response = await fetch(URL_ALQUILER_ACTIONS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'anular', id_alquiler: idAlquiler })
            });
            const result = await response.json();
            if (!result.ok) throw new Error(result.msg);
            
            // Recargar la lista para que el alquiler anulado desaparezca
            loadPagosPendientes();
        } catch (error) {
            alert(`Error al anular: ${error.message}`);
        }
    }
});

// Inicialización
(async () => {
    // await requireSession();
    await loadPagosPendientes();
})();