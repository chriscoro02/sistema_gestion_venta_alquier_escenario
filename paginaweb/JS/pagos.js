//pagos.js
const API_BASE = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";

const URL_PAGOS_LIST = API_BASE + "PHP/pagos_list.php";

const URL_VENTA_ACTIONS = API_BASE + "PHP/venta.php";

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
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Cargando…</td></tr>`;
    try {
        const response = await fetch(URL_PAGOS_LIST, { credentials: 'include' });
        const result = await response.json();

        if (!result.ok) throw new Error(result.msg || "No se pudo cargar la lista");
        if (result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-success">¡No hay pagos pendientes! ✨</td></tr>`;
            return;
        }

        const ahora = new Date();
        tbody.innerHTML = result.data.map(pago => {
            const fechaTransaccion = new Date(pago.fecha);
            let claseFila = 'table-success', estadoTexto = 'Pendiente';

            if (fechaTransaccion < ahora) {
                claseFila = 'table-danger'; estadoTexto = "VENCIDO";
            } else if ((fechaTransaccion - ahora) / (1000 * 3600 * 24) <= 3) {
                claseFila = 'table-warning'; estadoTexto = "Próximo a Vencer";
            }
            
            const tipoBadge = `<span class="badge ${pago.tipo_transaccion === 'Venta' ? 'bg-info text-dark' : 'bg-primary'}">${pago.tipo_transaccion}</span>`;
            
            // ===== CORRECCIÓN AQUÍ: Se añade data-tipo al botón de anular =====
            const anularBoton = pago.tipo_transaccion === 'Alquiler' 
                ? `<button class="btn btn-sm btn-danger ms-1" data-id="${pago.id_transaccion}" data-tipo="${pago.tipo_transaccion}" data-act="anular">Anular</button>` 
                : '';
            // ====================================================================
            
            const pagoVencido = fechaTransaccion < ahora;
            const pagarBoton = pagoVencido
                ? `<button class="btn btn-sm btn-success" disabled title="No se puede pagar un alquiler vencido">Registrar Pago</button>`
                : `<button class="btn btn-sm btn-success" 
                            data-id="${pago.id_transaccion}" 
                            data-saldo="${pago.saldo_pendiente}"
                            data-cliente="${pago.razon_social}"
                            data-tipo="${pago.tipo_transaccion}"
                            data-act="pagar">Registrar Pago</button>`;

            return `
                <tr class="${claseFila}">
                    <td>${pago.id_transaccion}</td>
                    <td>${tipoBadge}</td>
                    <td>${pago.razon_social}</td>
                    <td>${fechaTransaccion.toLocaleString('es-ES')}</td>
                    <td>${parseFloat(pago.total).toFixed(2)}</td>
                    <td><strong>${parseFloat(pago.saldo_pendiente).toFixed(2)}</strong></td>
                    <td><strong>${estadoTexto}</strong></td>
                    <td class="text-nowrap">
                        ${pagarBoton}
                        ${anularBoton}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

tbody.addEventListener('click', async (e) => {
    const boton = e.target.closest('button[data-act]');
    if (!boton) return;

    const idTransaccion = boton.dataset.id;
    const tipoTransaccion = boton.dataset.tipo; // Ahora esto funcionará para ambos botones
    const accion = boton.dataset.act;

    if (accion === 'pagar') {
        const saldoDeuda = parseFloat(boton.dataset.saldo).toFixed(2);
        const nombreCliente = boton.dataset.cliente;
        
        pagoForm.dataset.tipo = tipoTransaccion;
        document.getElementById('pagoIdTransaccion').value = idTransaccion;
        document.getElementById('pagoClienteNombre').textContent = nombreCliente;
        document.getElementById('pagoDeudaSaldo').textContent = `Saldo Pendiente: Bs. ${saldoDeuda}`;
        document.getElementById('pagoMonto').value = saldoDeuda;
        
        pagoModal.show();
    }
    
    if (accion === 'anular' && tipoTransaccion === 'Alquiler') {
        if (!confirm(`¿Estás seguro de anular el alquiler #${idTransaccion}?\nLa estructura volverá a estar disponible.`)) return;
        
        try {
            const response = await fetch(URL_ALQUILER_ACTIONS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'anular', id_alquiler: idTransaccion })
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
    const idTransaccion = document.getElementById('pagoIdTransaccion').value;
    const tipoTransaccion = pagoForm.dataset.tipo;
    const monto = parseFloat(document.getElementById('pagoMonto').value);

    if (isNaN(monto) || monto <= 0) {
        pagoMsg.textContent = "El monto debe ser un número positivo.";
        pagoMsg.className = 'alert alert-danger';
        return;
    }
    
    btnConfirmarPago.disabled = true;
    pagoMsg.classList.add('d-none');

    let urlEndpoint = '';
    let payload = {
        action: 'pagar',
        monto: monto
    };

    if (tipoTransaccion === 'Alquiler') {
        urlEndpoint = URL_ALQUILER_ACTIONS;
        payload.id_alquiler = idTransaccion;
    } else if (tipoTransaccion === 'Venta') {
        urlEndpoint = URL_VENTA_ACTIONS;
        payload.id_venta = idTransaccion;
    } else {
        pagoMsg.textContent = 'Error: Tipo de transacción desconocido.';
        pagoMsg.className = 'alert alert-danger';
        btnConfirmarPago.disabled = false;
        return;
    }

    try {
        const response = await fetch(urlEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
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