// JS/clientes.js

const API_BASE = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_LIST = API_BASE + "PHP/cliente_list.php";
const URL_CHECK = API_BASE + "PHP/check_session.php";

const usuarioBox = document.getElementById('usuarioBox');
const tbody = document.getElementById('tbodyClientes');

async function requireSession() {
    try {
        const response = await fetch(URL_CHECK, { credentials: 'include' });
        const result = await response.json();
        
        if (!result.ok) {
            window.location.href = 'index.html';
            throw new Error("No hay sesión activa");
        }
        
        const nombreCompleto = `${result.nombre ?? ""} ${result.apellido ?? ""}`.trim();
        if (usuarioBox) {
            usuarioBox.textContent = nombreCompleto || result.usuario || "Usuario";
        }
    } catch (error) {
        console.error("Error al verificar la sesión, redirigiendo...", error);
        window.location.href = 'index.html';
    }
}

async function loadClientes() {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Cargando…</td></tr>`;
    
    try {
        const response = await fetch(URL_LIST, { credentials: 'include' });
        
        if (!response.ok) {
             throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.ok) {
            throw new Error(result.msg || 'No se pudo cargar la lista de clientes.');
        }

        if (result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay clientes registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = result.data.map(cliente => `
            <tr>
                <td>${cliente.id_cliente}</td>
                <td><strong>${cliente.nombre_completo}</strong></td>
                <td>${cliente.nit}</td>
                <td>${cliente.telefono || '-'}</td>
                <td>${cliente.tipo_cliente || '-'}</td>
                <td>
                    <span class="badge ${cliente.estado === 'ACTIVO' ? 'bg-success' : 'bg-secondary'}">
                        ${cliente.estado}
                    </span>
                </td>
                <td>
                    <a href="cliente_editar.html?id=${cliente.id_cliente}" class="btn btn-sm btn-secondary">Editar</a>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error("Error al cargar clientes:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

// Inicialización de la página
(async () => {
    await requireSession();
    await loadClientes();
})();