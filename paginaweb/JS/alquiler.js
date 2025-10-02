// ====== Igual que login.js: base y endpoints en Hostinger ======
const $ = (s) => document.querySelector(s);

const API_BASE   = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_CHECK  = API_BASE + "PHP/check_session.php";
const URL_LOGOUT = API_BASE + "PHP/logout.php";
const URL_ALQ    = API_BASE + "PHP/alquiler.php"; // backend unificado de alquiler

// ====== UI refs ======
const usuarioBox = $("#usuarioBox");
const tblBody = document.querySelector("#tblAlquiler tbody");
const filtroTexto = $("#filtroTexto");
const filtroEstadoAlq = $("#filtroEstadoAlq");
const filtroEstadoPago = $("#filtroEstadoPago");

// ====== Boot: validar sesión y cargar ======
(async function boot(){
  // 1) Check de sesión (misma lógica que login.js: parseo en 2 pasos)
  try {
    const r = await fetch(URL_CHECK, { credentials: "include" });
    const raw = await r.text();
    let sess;
    try { sess = JSON.parse(raw); }
    catch { throw new Error("Respuesta no-JSON de check_session: " + raw.slice(0,200)); }

    if (!sess.ok) { location.href = "index.html"; return; }
    const nombre = `${sess.nombre ?? ""} ${sess.apellido ?? ""}`.trim();
    if (usuarioBox) usuarioBox.textContent = nombre || sess.usuario || "Usuario";
  } catch (err) {
    console.error(err);
    location.href = "index.html"; 
    return;
  }

  // 2) Cargar tabla y catálogos
  await cargarTabla();
  await cargarCatalogos();
})();

// ====== Logout ======
$("#btnLogout")?.addEventListener("click", async () => {
  try { await fetch(URL_LOGOUT, { credentials: "include" }); } catch {}
  sessionStorage.removeItem("user");
  location.href = "index.html";
});

// ====== Helpers ======
const fmtMoney = (n) => (Number(n||0)).toFixed(2);
function escapeHtml(t){return (t??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]))}
function debounce(fn, ms=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
const addDays=(d,days)=>{const x=new Date(d); x.setDate(x.getDate()+days); return x;};
const toLocalInput=(d)=>{const z=new Date(d); z.setMinutes(z.getMinutes()-z.getTimezoneOffset()); return z.toISOString().slice(0,16); };
function badgeEstado(s){
  switch(String(s||"")){
    case "pendiente": return `<span class="badge bg-secondary">pendiente</span>`;
    case "ocupado":   return `<span class="badge bg-info text-dark">ocupado</span>`;
    case "pagado":    return `<span class="badge bg-success">pagado</span>`;
    case "anulado":   return `<span class="badge bg-danger">anulado</span>`;
    default:          return `<span class="badge bg-light text-dark">${escapeHtml(s??"-")}</span>`;
  }
}

// ====== Tabla: LIST ======
async function cargarTabla(){
  tblBody.innerHTML = `<tr><td colspan="10">Cargando…</td></tr>`;
  try {
    const p = new URLSearchParams({ action: "list" });
    if (filtroTexto?.value.trim()) p.set("q", filtroTexto.value.trim());
    if (filtroEstadoAlq?.value)   p.set("estado_alquiler", filtroEstadoAlq.value);
    if (filtroEstadoPago?.value)  p.set("estado_pago", filtroEstadoPago.value);

    const res = await fetch(`${URL_ALQ}?${p.toString()}`, { credentials: "include" });
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt ? "- "+txt.slice(0,200) : ""}`);
    }
    const raw = await res.text();
    let j; try { j = JSON.parse(raw); } catch { throw new Error("Respuesta no-JSON: " + raw.slice(0,200)); }

    const rows = (j.data || []).map((x, idx) => {
      const est = badgeEstado(x.estado_alquiler);
      const pag = x.estado_pago === "pagado"
        ? `<span class="badge bg-success">pagado</span>`
        : `<span class="badge bg-warning text-dark">pendiente</span>`;
      return `<tr>
        <td>${idx+1}</td>
        <td>${escapeHtml(x.cliente)}</td>
        <td><code>${escapeHtml(x.codigo_estructura_modular)}</code></td>
        <td>${x.fecha_inicio_uso ?? "-"}</td>
        <td>${x.fecha_fin_pactada ?? "-"}</td>
        <td class="text-end">${x.periodos_tridiarios}</td>
        <td class="text-end">${fmtMoney(x.total)}</td>
        <td>${est}</td>
        <td>${pag}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-success" data-id="${x.id_alquiler}" data-act="pagar">Pagar</button>
          <button class="btn btn-sm btn-outline-primary" data-id="${x.id_alquiler}" data-act="devolver">Devolver</button>
        </td>
      </tr>`;
    }).join("");

    tblBody.innerHTML = rows || `<tr><td colspan="10">Sin resultados</td></tr>`;
  } catch (e) {
    tblBody.innerHTML = `<tr><td colspan="10" class="text-danger">Error al cargar: ${e?.message || e}</td></tr>`;
  }
}

// filtros
filtroTexto?.addEventListener("input", debounce(cargarTabla, 400));
filtroEstadoAlq?.addEventListener("change", cargarTabla);
filtroEstadoPago?.addEventListener("change", cargarTabla);

// ====== Catálogos + Modal Nuevo ======
const selCliente  = $("#id_cliente");
const selEstruct  = $("#id_estructura_modular");
const selServicio = $("#selServicio");
const cantServicio = $("#cantServicio");
const precioServicio = $("#precioServicio");
const precioTridiario = $("#precio_tridiario");
const periodos = $("#periodos_tridiarios");
const fechaInicio = $("#fecha_inicio_uso");
const fechaFin = $("#fecha_fin_pactada");
const subtotalServ = $("#subtotal_serv");
const total = $("#total");

const serviciosSel = [];
const modal = new bootstrap.Modal(document.getElementById("modalAlquiler"));

$("#btnNuevo")?.addEventListener("click", ()=>{
  $("#formAlquiler")?.reset();
  serviciosSel.length = 0; renderServiciosSel();
  subtotalServ.value = "0.00";
  total.value = "0.00";
  modal.show();
});

async function cargarCatalogos(){
  await Promise.all([cargarClientes(), cargarEstructuras(), cargarServicios()]);
}
async function cargarClientes(){
  if (!selCliente) return;
  selCliente.innerHTML = `<option value="">Cargando…</option>`;
  const r = await fetch(`${URL_ALQ}?action=catalogo_clientes`, { credentials: "include" });
  const raw = await r.text(); let j; try{ j=JSON.parse(raw); }catch{ j={data:[]}; }
  selCliente.innerHTML = `<option value="">Seleccione…</option>` + (j.data||[])
    .map(c=>`<option value="${c.id_cliente}">${escapeHtml(c.razon_social)}</option>`).join("");
}
async function cargarEstructuras(){
  if (!selEstruct) return;
  selEstruct.innerHTML = `<option value="">Cargando…</option>`;
  const r = await fetch(`${URL_ALQ}?action=catalogo_estructuras_disponibles`, { credentials: "include" });
  const raw = await r.text(); let j; try{ j=JSON.parse(raw); }catch{ j={data:[]}; }
  selEstruct.innerHTML = `<option value="">Seleccione…</option>` + (j.data||[])
    .map(e=>`<option value="${e.id_estructura_modular}" data-plano="${e.id_plano_tecnico}">
      ${escapeHtml(e.codigo_estructura_modular)}
    </option>`).join("");
}
async function cargarServicios(){
  if (!selServicio) return;
  selServicio.innerHTML = `<option value="">Cargando…</option>`;
  const r = await fetch(`${URL_ALQ}?action=catalogo_servicios`, { credentials: "include" });
  const raw = await r.text(); let j; try{ j=JSON.parse(raw); }catch{ j={data:[]}; }
  selServicio.innerHTML = `<option value="">Seleccione…</option>` + (j.data||[])
    .map(s=>`<option value="${s.id_servicio}" data-precio="${s.precio}">${escapeHtml(s.nombre)}</option>`).join("");
  selServicio.addEventListener("change", ()=>{
    const opt = selServicio.selectedOptions[0];
    precioServicio.value = opt ? opt.getAttribute("data-precio") : "";
  });
}

// precio tridiario + totales
selEstruct?.addEventListener("change", async ()=>{
  if (!precioTridiario) return;
  const opt = selEstruct.selectedOptions[0];
  const idPlano = opt ? opt.getAttribute("data-plano") : null;
  precioTridiario.value = "";
  if (idPlano) {
    const r = await fetch(`${URL_ALQ}?action=precio_tridiario&id_plano_tecnico=${encodeURIComponent(idPlano)}`, { credentials:"include" });
    const raw = await r.text(); let j; try{ j=JSON.parse(raw); }catch{ j={}; }
    precioTridiario.value = j?.precio_alquiler_tridiario ? Number(j.precio_alquiler_tridiario).toFixed(2) : "0.00";
  }
  recomputarTotal();
});
periodos?.addEventListener("input", recomputarTotal);
fechaInicio?.addEventListener("change", recomputarTotal);
function recomputarTotal(){
  if (!periodos || !precioTridiario || !fechaInicio || !fechaFin || !subtotalServ || !total) return;
  const p = Math.max(1, parseInt(periodos.value||"1",10));
  const precio = parseFloat(precioTridiario.value||"0")||0;
  total.value = (p*precio + (parseFloat(subtotalServ.value||"0")||0)).toFixed(2);
  if (fechaInicio.value) {
    const fin = addDays(new Date(fechaInicio.value), p*3);
    fechaFin.value = toLocalInput(fin);
  } else { fechaFin.value = ""; }
}

// servicios seleccionados
$("#btnAgregarSrv")?.addEventListener("click", ()=>{
  if (!selServicio) return;
  const opt = selServicio.selectedOptions[0];
  const id = opt?.value;
  const nombre = opt?.textContent?.trim();
  const cant = Math.max(1, parseFloat(cantServicio?.value||"1"));
  const precio = Math.max(0, parseFloat(precioServicio?.value||"0"));
  if (!id) return;
  const subtotal = cant * precio;
  serviciosSel.push({ id_servicio:id, nombre, cantidad:cant, precio, subtotal });
  renderServiciosSel();
  subtotalServ.value = serviciosSel.reduce((a,b)=>a+b.subtotal,0).toFixed(2);
  recomputarTotal();
});
function renderServiciosSel(){
  const tbody = document.querySelector("#tblServiciosSel tbody");
  if (!tbody) return;
  tbody.innerHTML = serviciosSel.map((s,i)=>`
    <tr>
      <td>${escapeHtml(s.nombre)}</td>
      <td class="text-end">${s.cantidad}</td>
      <td class="text-end">${fmtMoney(s.precio)}</td>
      <td class="text-end">${fmtMoney(s.subtotal)}</td>
      <td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger" data-i="${i}" data-act="del">Quitar</button></td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="text-center text-muted">Sin servicios</td></tr>`;
  tbody.querySelectorAll("button[data-act=del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const i = parseInt(b.getAttribute("data-i"),10);
      serviciosSel.splice(i,1); renderServiciosSel();
      subtotalServ.value = serviciosSel.reduce((a,b)=>a+b.subtotal,0).toFixed(2);
      recomputarTotal();
    });
  });
}

// GUARDAR (crear)
$("#btnGuardar")?.addEventListener("click", async ()=>{
  const id_cliente = selCliente?.value;
  const id_estructura_modular = selEstruct?.value;
  const fecha_inicio_uso = fechaInicio?.value;
  const fecha_fin_pactada = fechaFin?.value;
  const periodos_tridiarios = Math.max(1, parseInt(periodos?.value||"1",10));
  const totalNum = parseFloat(total?.value||"0")||0;

  if (!id_cliente || !id_estructura_modular || !fecha_inicio_uso || !fecha_fin_pactada) {
    alert("Completa los campos requeridos."); return;
  }

  try{
    const payload = {
      action: "crear",
      data: {
        id_cliente,
        id_estructura_modular,
        fecha_inicio_uso,
        fecha_fin_pactada,
        periodos_tridiarios,
        total: totalNum,
        servicios: serviciosSel.map(s=>({ id_servicio:s.id_servicio, cantidad:s.cantidad, precio:s.precio }))
      }
    };

    const res = await fetch(URL_ALQ, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Accept":"application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt ? "- "+txt.slice(0,200) : ""}`);
    }
    const raw = await res.text();
    let j; try { j = JSON.parse(raw); } catch { throw new Error("Respuesta no-JSON: "+raw.slice(0,200)); }
    if (!j.ok) throw new Error(j.msg || "No se pudo crear el alquiler.");

    bootstrap.Modal.getInstance(document.getElementById("modalAlquiler")).hide();
    await cargarTabla();
  }catch(err){
    alert("Error: " + (err?.message || err));
  }
});

// Acciones: pagar / devolver
tblBody?.addEventListener("click", async (ev)=>{
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const act = btn.getAttribute("data-act");

  if (act === "pagar") {
    const monto = prompt("Monto a pagar (Bs.):","");
    if (!monto) return;
    try{
      const res = await fetch(URL_ALQ, {
        method: "POST",
        headers: { "Content-Type":"application/json", "Accept":"application/json" },
        credentials: "include",
        body: JSON.stringify({ action:"pagar", id_alquiler:id, monto: parseFloat(monto) })
      });
      const raw = await res.text(); let j; try{ j=JSON.parse(raw); }catch{ throw new Error("Respuesta no-JSON: "+raw.slice(0,200)); }
      if (!j.ok) throw new Error(j.msg || "No se pudo pagar.");
      await cargarTabla();
    } catch (e){ alert("Error: " + (e?.message||e)); }
  }

  if (act === "devolver") {
    const fecha = prompt("Fecha/hora de devolución (YYYY-MM-DD HH:mm, vacío=ahora):","");
    try{
      const res = await fetch(URL_ALQ, {
        method: "POST",
        headers: { "Content-Type":"application/json", "Accept":"application/json" },
        credentials: "include",
        body: JSON.stringify({ action:"devolver", id_alquiler:id, fecha_devolucion: fecha || null })
      });
      const raw = await res.text(); let j; try{ j=JSON.parse(raw); }catch{ throw new Error("Respuesta no-JSON: "+raw.slice(0,200)); }
      if (!j.ok) throw new Error(j.msg || "No se pudo devolver.");
      await cargarTabla();
    } catch (e){ alert("Error: " + (e?.message||e)); }
  }
});
