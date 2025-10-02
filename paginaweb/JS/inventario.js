// JS/inventario.js
const API_BASE = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_LIST = API_BASE + "PHP/inventario_list.php";
const URL_CHECK = API_BASE + "PHP/check_session.php";

const tbody = document.getElementById('tbodyInventario');
const usuarioBox = document.getElementById('usuarioBox');

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

function renderizarAcciones(estructura) {
    switch (estructura.estado) {
        case 'disponible':
            // Este botón ahora apunta correctamente a 'alquiler_nuevo.html'
            return `<a href="alquiler.html" class="btn btn-sm btn-primary">Alquilar</a>`;
        case 'alquilado':
            return `<span class="badge bg-warning text-dark">Alquilado</span>`;
        case 'mantenimiento':
            return `<span class="badge bg-secondary">En Mantenimiento</span>`;
        case 'vendido':
            return `<span class="badge bg-danger">Vendido</span>`;
        default:
            return '';
    }
}

async function loadInventario() {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Cargando…</td></tr>`;
    
    try {
        const response = await fetch(URL_LIST, {credentials: 'include'});
        const result = await response.json();
        if (!result.ok) throw new Error(result.msg);

        if (result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay estructuras en el inventario.</td></tr>`;
            return;
        }

        tbody.innerHTML = result.data.map(item => `
            <tr>
                <td><strong>${item.codigo_estructura_modular}</strong></td>
                <td>${item.tipo_estructura_nombre || '-'}</td>
                <td>${item.plano_descripcion || '-'}</td>
                <td>${item.fecha_fabricacion || '-'}</td>
                <td>
                    <span class="badge bg-primary">${item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}</span>
                </td>
                <td>
                    ${renderizarAcciones(item)}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

(async () => {
    await requireSession();
    await loadInventario();
})();