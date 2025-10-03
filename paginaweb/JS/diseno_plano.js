// ===== CONFIG =====
const API_BASE   = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_CHECK  = API_BASE + "PHP/check_session.php";
const URL_LOGOUT = API_BASE + "PHP/logout.php";

const URL_LIST   = API_BASE + "PHP/plano_listar.php";
const URL_GET    = API_BASE + "PHP/plano_obtener.php?id=";          // +id
const URL_SAVE   = API_BASE + "PHP/plano_guardar.php";
const URL_TOGGLE = API_BASE + "PHP/plano_cambiar_estado.php";
const URL_CAT_TP = API_BASE + "PHP/catalogo_tipos_estructura.php";
const URL_CAT_ING= API_BASE + "PHP/catalogo_ingenieros.php";

// ===== Helper: fetch con parse seguro =====
async function fetchJSON(url, options) {
  const r = await fetch(url, { credentials: "include", ...options });
  const txt = await r.text();
  try { return JSON.parse(txt); }
  catch (e) {
    console.error("[fetchJSON] Respuesta NO-JSON desde", url, "=>\n", txt);
    throw e;
  }
}

// ===== Sesión / UI base =====
const usuarioBox = document.getElementById("usuarioBox");
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  try { await fetch(URL_LOGOUT, { credentials: "include" }); } catch {}
  sessionStorage.removeItem("user"); location.href = "index.html";
});

(async function boot(){
  try{
    const r = await fetch(URL_CHECK, { credentials: "include" });
    const j = await r.json();
    if(!j.ok){ location.href="index.html"; return; }
    usuarioBox.textContent = `${j.nombre??""} ${j.apellido??""}`.trim() || j.usuario || "Usuario";
  }catch{ location.href="index.html"; return; }

  await Promise.all([cargarTipos(), cargarIngenieros()]);
  await cargarTabla();
})();

// ===== Tabla =====
const tblBody = document.querySelector("#tblPlanos tbody");
const filtroTexto = document.getElementById("filtroTexto");
const filtroEstado= document.getElementById("filtroEstado");

filtroTexto.addEventListener("input", debounce(cargarTabla, 400));
filtroEstado.addEventListener("change", cargarTabla);

// NUEVO: almacenamos los códigos actuales para calcular el siguiente
let _codigosActuales = [];

async function cargarTabla(){
  tblBody.innerHTML = `<tr><td colspan="9">Cargando…</td></tr>`;
  const p = new URLSearchParams();
  if (filtroTexto.value.trim()) p.set("q", filtroTexto.value.trim());
  if (filtroEstado.value)       p.set("estado", filtroEstado.value);

  try{
    const j = await fetchJSON(URL_LIST + "?" + p.toString());
    if(!j.ok) throw new Error(j.msg || 'Error al listar planos');

    // Guardamos la lista de códigos para el autogenerador
    _codigosActuales = (j.data || []).map(x => String(x.codigo_plano_tecnico || ""));

    const rows = (j.data||[]).map((x,i)=> `
      <tr>
        <td>${i+1}</td>
        <td><code>${esc(x.codigo_plano_tecnico)}</code></td>
        <td>${esc(x.tipo_estructura)}</td>
        <td>${fmtNum(x.capacidad_peso)}</td>
        <td>${x.capacidad_persona??""}</td>
        <td>${esc(x.dimension??"")}</td>
        <td>${x.fecha_creacion?.slice(0,16)?.replace("T"," ") ?? ""}</td>
        <td>${badgeEstado(x.estado)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary" data-act="edit" data-id="${x.id_plano_tecnico}">Editar</button>
          <button class="btn btn-sm btn-outline-warning" data-act="toggle" data-id="${x.id_plano_tecnico}">Estado</button>
        </td>
      </tr>`).join("");
    tblBody.innerHTML = rows || `<tr><td colspan="9">Sin resultados</td></tr>`;
  }catch(e){
    console.error("plano_listar ERROR:", e);
    tblBody.innerHTML = `<tr><td colspan="9" class="text-danger">Error cargando: ${e?.message||e}</td></tr>`;
  }
}

function badgeEstado(s){
  return s==='ACTIVO'
    ? `<span class="badge bg-success">ACTIVO</span>`
    : `<span class="badge bg-secondary">INACTIVO</span>`;
}

function esc(t){ return (t??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])) }
function fmtNum(n){ const x=Number(n||0); return x? x.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}) : "" }
function debounce(fn,ms=300){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

// ===== Catálogos =====
const selTipo = document.getElementById("id_tipo_estructura");
const selIng  = document.getElementById("id_ingeniero");

async function cargarTipos(){
  selTipo.innerHTML = `<option value="">Cargando…</option>`;
  try {
    const j = await fetchJSON(URL_CAT_TP);
    if (!j.ok) throw new Error(j.msg || 'Error catálogo tipos');
    selTipo.innerHTML = `<option value="">Seleccione…</option>` + (j.data||[])
      .map(t=>`<option value="${t.id_tipo_estructura}">${esc(t.nombre)}</option>`).join("");
  } catch (e) {
    console.error("catalogo_tipos_estructura ERROR:", e);
    selTipo.innerHTML = `<option value="">(error cargando tipos)</option>`;
  }
}

async function cargarIngenieros(){
  selIng.innerHTML = `<option value="">Cargando…</option>`;
  try {
    const j = await fetchJSON(URL_CAT_ING);
    if (!j.ok) throw new Error(j.msg || 'Error catálogo ingenieros');
    selIng.innerHTML = `<option value="">(opcional) Seleccione…</option>` + (j.data||[])
      .map(i=>`<option value="${i.id_ingeniero}">${esc(i.mostrar)}</option>`).join("");
  } catch (e) {
    console.error("catalogo_ingenieros ERROR:", e);
    selIng.innerHTML = `<option value="">(error cargando ingenieros)</option>`;
  }
}

// ===== UTILIDAD: generar siguiente código global PL-### (sin servidor) =====
function siguienteCodigoGlobal() {
  // Buscamos el mayor número al final del código (sea "PL-ESC-007" o "PL-007")
  let max = 0;
  for (const c of _codigosActuales) {
    const m = String(c).match(/(\d{3,})$/); // últimos dígitos
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  const next = (max + 1).toString().padStart(3, "0");
  return `PL-${next}`;
}

// ===== Modal / CRUD =====
const modal = new bootstrap.Modal(document.getElementById("modalPlano"));
document.getElementById("btnNuevo").addEventListener("click", ()=>{
  document.getElementById("formPlano").reset();
  document.getElementById("id_plano_tecnico").value = "";
  document.getElementById("estado").value = "ACTIVO";
  document.querySelector("#modalPlano .modal-title").textContent = "Nuevo plano";

  // Asegurar que el campo sea editable
  const inputCodigo = document.getElementById("codigo_plano_tecnico");
  inputCodigo.removeAttribute('readonly');
  inputCodigo.removeAttribute('disabled');

  // Proponer código automático (global PL-###)
  inputCodigo.value = siguienteCodigoGlobal();

  modal.show();
});

tblBody.addEventListener("click", async ev=>{
  const btn = ev.target.closest("button[data-act]");
  if(!btn) return;
  const id = btn.getAttribute("data-id");
  const act= btn.getAttribute("data-act");

  if(act==="edit"){
    try{
      const j = await fetchJSON(URL_GET + id);
      if(!j.ok) throw new Error(j.msg||"No encontrado");
      fillForm(j.data);
      document.querySelector("#modalPlano .modal-title").textContent = "Editar plano";
      modal.show();
    }catch(e){ alert("Error: " + (e?.message||e)); }
  }

  if(act==="toggle"){
    if(!confirm("¿Cambiar estado (ACTIVO/INACTIVO)?")) return;
    try{
      const j = await fetchJSON(URL_TOGGLE, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ id_plano_tecnico: Number(id) })
      });
      if(!j.ok) throw new Error(j.msg||"No se pudo cambiar el estado");
      await cargarTabla();
    }catch(e){ alert("Error: " + (e?.message||e)); }
  }
});

function fillForm(d){
  (["id_plano_tecnico","codigo_plano_tecnico","descripcion","capacidad_peso","capacidad_persona","dimension","materiales","estado"]).forEach(k=>{
    const el = document.getElementById(k); if(el) el.value = d[k] ?? "";
  });
  document.getElementById("id_tipo_estructura").value = d.id_tipo_estructura ?? "";
  document.getElementById("id_ingeniero").value       = d.id_ingeniero ?? "";
}

// Guardar
document.getElementById("btnGuardar").addEventListener("click", async ()=>{
  const payload = {
    id_plano_tecnico: Number(document.getElementById("id_plano_tecnico").value || 0),
    id_tipo_estructura: Number(selTipo.value || 0),
    id_ingeniero: Number(selIng.value || 0) || null, // opcional
    codigo_plano_tecnico: document.getElementById("codigo_plano_tecnico").value.trim(),
    descripcion: document.getElementById("descripcion").value.trim(),
    capacidad_peso: document.getElementById("capacidad_peso").value || null,
    capacidad_persona: document.getElementById("capacidad_persona").value || null,
    dimension: document.getElementById("dimension").value.trim(),
    materiales: document.getElementById("materiales").value.trim(),
    estado: document.getElementById("estado").value
  };
  if(!payload.id_tipo_estructura || !payload.codigo_plano_tecnico){
    alert("Tipo de estructura y Código son obligatorios."); return;
  }

  try{
    const j = await fetchJSON(URL_SAVE, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if(!j.ok) throw new Error(j.msg||"No se pudo guardar");
    modal.hide();
    await cargarTabla();
  }catch(e){ alert("Error: " + (e?.message||e)); }
});
