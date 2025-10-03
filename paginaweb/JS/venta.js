const $ = (s) => document.querySelector(s);

const API_BASE   = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
const URL_CHECK  = API_BASE + "PHP/check_session.php";
const URL_LOGOUT = API_BASE + "PHP/logout.php";
const URL_VTA    = API_BASE + "PHP/venta.php";

const usuarioBox = $("#usuarioBox");
const tblBody = document.querySelector("#tblVenta tbody");
const filtroTexto = $("#filtroTexto");
const filtroEstado = $("#filtroEstado");

(async function boot(){
  try {
    const r = await fetch(URL_CHECK, { credentials: "include" });
    const raw = await r.text(); let s;
    try { s = JSON.parse(raw); } catch { throw new Error("Respuesta no-JSON de check_session: " + raw.slice(0,200)); }
    if (!s.ok) { location.href = "index.html"; return; }
    const nombre = `${s.nombre ?? ""} ${s.apellido ?? ""}`.trim();
    if (usuarioBox) usuarioBox.textContent = nombre || s.usuario || "Usuario";
  } catch { location.href = "index.html"; return; }

  await cargarTabla();
  await cargarCatalogos();
})();

$("#btnLogout")?.addEventListener("click", async ()=>{
  try { await fetch(URL_LOGOUT, { credentials:"include" }); } catch {}
  sessionStorage.removeItem("user");
  location.href = "index.html";
});

const fmtMoney = (n) => (Number(n||0)).toFixed(2);
function escapeHtml(t){return (t??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]))}
function debounce(fn,ms=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }

async function cargarTabla(){
  tblBody.innerHTML = `<tr><td colspan="11">Cargando…</td></tr>`;
  try{
    const p = new URLSearchParams({ action:"list" });
    if (filtroTexto?.value.trim()) p.set("q", filtroTexto.value.trim());
    if (filtroEstado?.value) p.set("estado", filtroEstado.value);

    const res = await fetch(`${URL_VTA}?${p}`, { credentials:"include" });
    if (!res.ok) {
      const txt = await res.text().catch(()=> ""); 
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt? "- " + txt.slice(0,200) : ""}`);
    }
    const raw = await res.text(); let j;
    try { j = JSON.parse(raw); } catch { throw new Error("Respuesta no-JSON: " + raw.slice(0,200)); }

    const rows = (j.data||[]).map((x,i)=> {
      const badge = x.estado === "pagado" ? `<span class="badge bg-success">pagado</span>`
                  : x.estado === "anulado" ? `<span class="badge bg-danger">anulado</span>`
                  : `<span class="badge bg-warning text-dark">pendiente</span>`;
      return `<tr>
        <td>${i+1}</td>
        <td>${escapeHtml(x.numero_venta ?? "")}</td>
        <td>${escapeHtml(x.cliente)}</td>
        <td><code>${escapeHtml(x.codigo_estructura_modular)}</code></td>
        <td>${x.fecha ?? "-"}</td>
        <td class="text-end">${fmtMoney(x.subtotal)}</td>
        <td class="text-end">${fmtMoney(x.descuento)}</td>
        <td class="text-end">${fmtMoney(x.total)}</td>
        <td>${escapeHtml(x.metodo_pago ?? "")}</td>
        <td>${badge}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-success" data-id="${x.id_venta}" data-act="pagar">Pagar</button>
          <button class="btn btn-sm btn-outline-danger" data-id="${x.id_venta}" data-act="anular">Anular</button>
        </td>
      </tr>`;
    }).join("");

    tblBody.innerHTML = rows || `<tr><td colspan="11">Sin resultados</td></tr>`;
  }catch(e){
    tblBody.innerHTML = `<tr><td colspan="11" class="text-danger">Error al cargar: ${e?.message||e}</td></tr>`;
  }
}
filtroTexto?.addEventListener("input", debounce(cargarTabla, 400));
filtroEstado?.addEventListener("change", cargarTabla);

// ===== generador local para Nº de venta =====
function generarNumeroVenta(){
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd= String(d.getDate()).padStart(2,"0");
  const rand = Math.floor(Math.random()*1000).toString().padStart(3,"0");
  return `FV-${y}${m}${dd}-${rand}`;
}

// Modal nueva venta
const modal = new bootstrap.Modal(document.getElementById("modalVenta"));
$("#btnNuevo")?.addEventListener("click", ()=>{
  $("#formVenta")?.reset();
  serviciosSel.length = 0; renderServiciosSel();
  $("#subtotal_serv").value = "0.00";
  $("#descuento").value = "0.00";
  $("#precio_venta").value = "";
  $("#total").value = "0.00";

  // >>> añadido: autogenerar número si está vacío
  const campoNum = $("#numero_venta");
  if (campoNum && !campoNum.value.trim()) {
    campoNum.value = generarNumeroVenta();
  }
  // <<<

  modal.show();
});

// Catálogos
const selCliente = $("#id_cliente");
const selEstruct = $("#id_estructura_modular");
const selServicio = $("#selServicio");
const cantServicio = $("#cantServicio");
const precioServicio = $("#precioServicio");
const precioVenta = $("#precio_venta");
const subtotalServ = $("#subtotal_serv");
const descuento = $("#descuento");
const total = $("#total");
const numeroVenta = $("#numero_venta");
const metodoPago = $("#metodo_pago");

async function cargarCatalogos(){
  await Promise.all([cargarClientes(), cargarEstructuras(), cargarServicios()]);
}
async function cargarClientes(){
  selCliente.innerHTML = `<option value="">Cargando…</option>`;
  const r = await fetch(`${URL_VTA}?action=catalogo_clientes`, { credentials:"include" });
  const raw = await r.text(); let j; try{ j=JSON.parse(raw);}catch{ j={data:[]}; }
  selCliente.innerHTML = `<option value="">Seleccione…</option>` + (j.data||[])
    .map(c=>`<option value="${c.id_cliente}">${escapeHtml(c.razon_social)}</option>`).join("");
}
async function cargarEstructuras(){
  selEstruct.innerHTML = `<option value="">Cargando…</option>`;
  const r = await fetch(`${URL_VTA}?action=catalogo_estructuras_disponibles`, { credentials:"include" });
  const raw = await r.text(); let j; try{ j=JSON.parse(raw);}catch{ j={data:[]}; }
  selEstruct.innerHTML = `<option value="">Seleccione…</option>` + (j.data||[])
    .map(e=>`<option value="${e.id_estructura_modular}" data-plano="${e.id_plano_tecnico}">
      ${escapeHtml(e.codigo_estructura_modular)}
    </option>`).join("");
}
async function cargarServicios(){
  selServicio.innerHTML = `<option value="">Cargando…</option>`;
  const r = await fetch(`${URL_VTA}?action=catalogo_servicios`, { credentials:"include" });
  const raw = await r.text(); let j; try{ j=JSON.parse(raw);}catch{ j={data:[]}; }
  selServicio.innerHTML = `<option value="">Seleccione…</option>` + (j.data||[])
    .map(s=>`<option value="${s.id_servicio}" data-precio="${s.precio}">${escapeHtml(s.nombre)}</option>`).join("");
  selServicio.addEventListener("change", ()=>{
    const opt = selServicio.selectedOptions[0];
    precioServicio.value = opt ? opt.getAttribute("data-precio") : "";
  });
}

// precio venta y total
selEstruct?.addEventListener("change", async ()=>{
  const idPlano = selEstruct.selectedOptions[0]?.getAttribute("data-plano");
  precioVenta.value = "";
  if (idPlano) {
    const r = await fetch(`${URL_VTA}?action=precio_venta&id_plano_tecnico=${encodeURIComponent(idPlano)}`, { credentials:"include" });
    const raw = await r.text(); let j; try{ j=JSON.parse(raw);}catch{ j={}; }
    precioVenta.value = j?.precio_venta ? Number(j.precio_venta).toFixed(2) : "0.00";
  }
  recomputarTotal();
});
[precioVenta, subtotalServ, descuento].forEach(el => el?.addEventListener("input", recomputarTotal));
function recomputarTotal(){
  const pv = parseFloat(precioVenta?.value||"0")||0;
  const sv = parseFloat(subtotalServ?.value||"0")||0;
  const desc = parseFloat(descuento?.value||"0")||0;
  total.value = (pv + sv - desc).toFixed(2);
}

// servicios seleccionados
const serviciosSel = [];
$("#btnAgregarSrv")?.addEventListener("click", ()=>{
  const opt = selServicio.selectedOptions[0];
  const id = opt?.value;
  const nombre = opt?.textContent?.trim();
  const cant = Math.max(1, parseFloat(cantServicio?.value||"1"));
  const precio = Math.max(0, parseFloat(precioServicio?.value||"0"));
  if (!id) return;
  const subtotal = cant * precio;
  serviciosSel.push({ id_servicio:id, nombre, cantidad:cant, precio_unitario:precio, subtotal });
  renderServiciosSel();
  subtotalServ.value = serviciosSel.reduce((a,b)=>a+b.subtotal,0).toFixed(2);
  recomputarTotal();
});
function renderServiciosSel(){
  const tbody = document.querySelector("#tblServiciosSel tbody");
  tbody.innerHTML = serviciosSel.map((s,i)=>`
    <tr>
      <td>${escapeHtml(s.nombre)}</td>
      <td class="text-end">${s.cantidad}</td>
      <td class="text-end">${fmtMoney(s.precio_unitario)}</td>
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

// Guardar venta
$("#btnGuardar")?.addEventListener("click", async ()=>{
  const payload = {
    action: "crear",
    data: {
      id_cliente: selCliente.value,
      id_estructura_modular: selEstruct.value,
      numero_venta: (numeroVenta?.value || "").trim(),
      metodo_pago: (metodoPago?.value || "").trim(),
      precio_venta: parseFloat(precioVenta.value||"0")||0,
      subtotal_servicios: parseFloat(subtotalServ.value||"0")||0,
      descuento: parseFloat(descuento.value||"0")||0,
      total: parseFloat(total.value||"0")||0,
      servicios: serviciosSel.map(s=>({
        id_servicio: s.id_servicio,
        cantidad: s.cantidad,
        precio_unitario: s.precio_unitario,
        subtotal: s.subtotal
      }))
    }
  };
  if (!payload.data.id_cliente || !payload.data.id_estructura_modular) {
    alert("Completa los campos requeridos."); return;
  }
  try{
    const res = await fetch(URL_VTA, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Accept":"application/json" },
      credentials:"include",
      body: JSON.stringify(payload)
    });
    const raw = await res.text(); let j; try{ j=JSON.parse(raw);}catch{ throw new Error("Respuesta no-JSON: "+raw.slice(0,200)); }
    if (!j.ok) throw new Error(j.msg||"No se pudo crear la venta.");
    alert('¡Venta registrada con éxito!');
    bootstrap.Modal.getInstance(document.getElementById("modalVenta")).hide();
    await cargarTabla();
  }catch(e){ alert("Error: " + (e?.message||e)); }
});

// Acciones fila: pagar / anular
tblBody?.addEventListener("click", async (ev)=>{
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const act = btn.getAttribute("data-act");

  if (act === "pagar") {
    const monto = prompt("Monto a registrar (Bs.):","");
    if (!monto) return;
    const metodo = prompt("Método de pago (efectivo/transferencia/tarjeta/otro, opcional):","") || "";
    try{
      const r = await fetch(URL_VTA, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Accept":"application/json" },
        credentials:"include",
        body: JSON.stringify({ action:"pagar", id_venta:id, monto: parseFloat(monto), metodo_pago: metodo.trim() })
      });
      const raw = await r.text(); let j; try{ j=JSON.parse(raw);}catch{ throw new Error("Respuesta no-JSON: "+raw.slice(0,200)); }
      if (!j.ok) throw new Error(j.msg||"No se pudo pagar.");
      await cargarTabla();
    }catch(e){ alert("Error: " + (e?.message||e)); }
  }

  if (act === "anular") {
    if (!confirm("¿Anular la venta?")) return;
    try{
      const r = await fetch(URL_VTA, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Accept":"application/json" },
        credentials:"include",
        body: JSON.stringify({ action:"anular", id_venta:id })
      });
      const raw = await r.text(); let j; try{ j=JSON.parse(raw);}catch{ throw new Error("Respuesta no-JSON: "+raw.slice(0,200)); }
      if (!j.ok) throw new Error(j.msg||"No se pudo anular.");
      await cargarTabla();
    }catch(e){ alert("Error: " + (e?.message||e)); }
  }
});
