// JS/cliente_nuevo.js
const API_BASE = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_CREATE = API_BASE + "PHP/cliente_create.php";
const URL_CHECK = API_BASE + "PHP/check_session.php";

const form = document.getElementById('frmCliente');
const msg = document.getElementById('msg');
const usuarioBox = document.getElementById('usuarioBox');

async function requireSession() {
    // La misma lógica de tus otros archivos para verificar la sesión
    try {
        const response = await fetch(URL_CHECK, { credentials: 'include' });
        const result = await response.json();
        if (!result.ok) throw new Error("No hay sesión");
        const nombreCompleto = `${result.nombre ?? ""} ${result.apellido ?? ""}`.trim();
        if (usuarioBox) usuarioBox.textContent = nombreCompleto || "Usuario";
    } catch (error) {
        window.location.href = 'index.html';
    }
}

function showMsg(type, text) {
    msg.className = `alert alert-${type}`;
    msg.textContent = text;
    msg.classList.remove("d-none");
}

form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.classList.add("d-none");

    const formData = new FormData(form);

    try {
        const response = await fetch(URL_CREATE, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const result = await response.json();

        if (!result.ok) {
            showMsg('danger', result.msg || 'No se pudo guardar el cliente.');
            return;
        }

        showMsg('success', `Cliente "${formData.get('razon_social')}" creado con éxito. Redirigiendo...`);
        setTimeout(() => {
            window.location.href = 'clientes.html';
        }, 1500);

    } catch (error) {
        showMsg('danger', 'Ocurrió un error de conexión. Intente de nuevo.');
        console.error('Error al enviar el formulario:', error);
    }
});

// Inicialización
(async () => {
    await requireSession();
})();