// JS/pagos.js
const API_BASE = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_PAGOS_LIST = API_BASE + "PHP/pagos_list.php";
const URL_ALQUILER_ACTIONS = API_BASE + "PHP/alquiler.php";
const URL_CHECK = API_BASE + "PHP/check_session.php";

const tbody = document.getElementById('tbodyPagos');
const usuarioBox = document.getElementById('usuarioBox');

const pagoModalEl = document.getElementById('pagoModal');
const pagoModal = new bootstrap.Modal(pagoModalEl);
const pagoForm = document.getElementById('formPago');
const pagoMsg = document.getElementById('pagoMsg');
const btnConfirmarPago = document.getElementById('btnConfirmarPago');

async function requireSession() {
    try {
        const response = await fetch(URL_CHECK, { credentials: 'include' });
        const result = await response.json();
        if (!result.ok) throw new Error("No hay sesión activa");
        const nombreCompleto = `${result.nombre ?? ""} ${result.apellido ?? ""}`.trim();
        if (usuarioBox) usuarioBox.textContent = nombreCompleto || result.usuario || "Usuario";
    } catch (error) {
        window.location.href = 'index.html';
    }
}

async function loadPagosPendientes() {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Cargando…</td></tr>`;
    try {
        const response = await fetch(URL_PAGOS_LIST, { credentials: 'include' });
        const result = await response.json();

        if (!result.ok) throw new Error(result.msg || "No se pudo cargar la lista");
        if (result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-success">¡No hay pagos pendientes! ✨</td></tr>`;
            return;
        }

        const ahora = new Date();
        tbody.innerHTML = result.data.map(pago => {
            const fechaInicio = new Date(pago.fecha_inicio_uso);
            let claseFila = 'table-success';
            let estadoTexto = "Pendiente";

            if (fechaInicio < ahora) {
                claseFila = 'table-danger';
                estadoTexto = "VENCIDO";
            } else if ((fechaInicio - ahora) / (1000 * 3600 * 24) <= 3) {
                claseFila = 'table-warning';
                estadoTexto = "Próximo a Vencer";
            }

            return `
                <tr class="${claseFila}">
                    <td>${pago.id_alquiler}</td>
                    <td>${pago.razon_social}</td>
                    <td>${fechaInicio.toLocaleString('es-ES')}</td>
                    <td>${parseFloat(pago.total).toFixed(2)}</td>
                    <td><strong>${parseFloat(pago.saldo_pendiente).toFixed(2)}</strong></td>
                    <td><strong>${estadoTexto}</strong></td>
                    <td class="text-nowrap">
                        <button class="btn btn-sm btn-success" 
                                data-id="${pago.id_alquiler}" 
                                data-saldo="${pago.saldo_pendiente}"
                                data-cliente="${pago.razon_social}"
                                data-act="pagar">Registrar Pago</button>
                        <button class="btn btn-sm btn-danger ms-1" data-id="${pago.id_alquiler}" data-act="anular">Anular</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

tbody.addEventListener('click', async (e) => {
    const boton = e.target.closest('button[data-act]');
    if (!boton) return;

    const idAlquiler = boton.dataset.id;
    const accion = boton.dataset.act;

    if (accion === 'pagar') {
        const saldoDeuda = parseFloat(boton.dataset.saldo).toFixed(2);
        const nombreCliente = boton.dataset.cliente;

        pagoMsg.classList.add('d-none');
        pagoForm.reset();
        document.getElementById('pagoIdAlquiler').value = idAlquiler;
        document.getElementById('pagoClienteNombre').textContent = nombreCliente;
        document.getElementById('pagoDeudaTotal').textContent = `Saldo Pendiente: Bs. ${saldoDeuda}`;
        document.getElementById('pagoMonto').value = saldoDeuda;
        
        pagoModal.show();
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
            
            loadPagosPendientes();
        } catch (error) {
            alert(`Error al anular: ${error.message}`);
        }
    }
});

btnConfirmarPago.addEventListener('click', async () => {
    const idAlquiler = document.getElementById('pagoIdAlquiler').value;
    const montoInput = document.getElementById('pagoMonto');
    const monto = parseFloat(montoInput.value);

    if (isNaN(monto) || monto <= 0) {
        pagoMsg.textContent = "El monto debe ser un número positivo.";
        pagoMsg.className = 'alert alert-danger';
        return;
    }
    
    btnConfirmarPago.disabled = true;
    pagoMsg.classList.add('d-none');

    try {
        const response = await fetch(URL_ALQUILER_ACTIONS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'pagar',
                id_alquiler: idAlquiler,
                monto: monto
            })
        });
        const result = await response.json();
        if (!result.ok) throw new Error(result.msg);
        
        pagoModal.hide();
        alert("Pago registrado con éxito.");
        loadPagosPendientes();

    } catch (error) {
        pagoMsg.textContent = `Error: ${error.message}`;
        pagoMsg.className = 'alert alert-danger';
    } finally {
        btnConfirmarPago.disabled = false;
    }
});

(async () => {
    await requireSession();
    await loadPagosPendientes();
})();