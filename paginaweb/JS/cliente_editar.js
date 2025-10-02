// JS/cliente_editar.js
const API_BASE = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_GET = API_BASE + "PHP/cliente_get.php";
const URL_UPDATE = API_BASE + "PHP/cliente_update.php";

const form = document.getElementById('frmCliente');
const msg = document.getElementById('msg');
const titulo = document.getElementById('tituloCliente');

// 1. Obtener el ID del cliente desde la URL (ej: cliente_editar.html?id=101)
const idCliente = new URLSearchParams(window.location.search).get('id');

// Función para rellenar el formulario con los datos recibidos
function poblarFormulario(cliente) {
    for (const key in cliente) {
        const input = form.elements[key];
        if (input) {
            // El formato de fecha para el input 'date' debe ser YYYY-MM-DD
            if (input.type === 'date' && cliente[key]) {
                input.value = cliente[key].split(' ')[0];
            } else {
                input.value = cliente[key];
            }
        }
    }
    titulo.textContent = `Editar Cliente: ${cliente.nombre} ${cliente.apellido}`;
}

// 2. Cargar los datos del cliente al iniciar la página
async function cargarCliente() {
    if (!idCliente) {
        showMsg('danger', 'No se especificó un ID de cliente.');
        form.innerHTML = ''; // Ocultar formulario
        return;
    }

    try {
        const response = await fetch(`${URL_GET}?id=${idCliente}`, { credentials: 'include' });
        const result = await response.json();

        if (!result.ok) {
            throw new Error(result.msg);
        }

        poblarFormulario(result.data);

    } catch (error) {
        showMsg('danger', `Error al cargar datos: ${error.message}`);
    }
}

// 3. Enviar el formulario para actualizar
form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.classList.add("d-none");
    
    const formData = new FormData(form);

    try {
        const response = await fetch(URL_UPDATE, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        const result = await response.json();
        
        if (!result.ok) {
            throw new Error(result.msg);
        }
        
        showMsg('success', 'Cliente actualizado con éxito. Redirigiendo...');
        setTimeout(() => window.location.href = 'clientes.html', 1500);

    } catch (error) {
        showMsg('danger', `Error al guardar: ${error.message}`);
    }
});

function showMsg(type, text) { /* ... (función para mostrar mensajes) ... */ }

// Inicialización
cargarCliente();