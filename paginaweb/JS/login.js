// JS/login.js
const $ = (sel) => document.querySelector(sel);

const form = $("#formLogin");
const msg  = $("#msg");
const pwd  = $("#password");
const btnT = $("#btnTogglePwd");

// ====== CONFIG ======
// Backend (PHP) en Hostinger:
const API_BASE      = "https://sienna-curlew-728554.hostingersite.com/Sistema_Eventos/";
// Endpoints:
const URL_LOGIN     = API_BASE + "PHP/login.php";
const URL_CHECK     = API_BASE + "PHP/check_session.php";
// Dashboard local:
const URL_DASHBOARD = location.origin + location.pathname.replace(/\/HTML\/.*$/, "/") + "/HTML/dashboard.html";
// =====================

btnT?.addEventListener("click", () => {
  if (pwd.type === "password") { pwd.type = "text"; btnT.textContent = "🙈"; }
  else { pwd.type = "password"; btnT.textContent = "👁️"; }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.style.display = "none";
  msg.textContent = "";

  const data = new FormData(form);

  try {
    const res = await fetch(URL_LOGIN, {
      method: "POST",
      body: data,
      headers: { "Accept": "application/json" },
      credentials: "include" // ← cookie de sesión cross-site
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt ? "- " + txt.slice(0,200) : ""}`);
    }

    const raw = await res.text();
    let json;
    try { json = JSON.parse(raw); }
    catch { throw new Error("Respuesta no-JSON del servidor: " + raw.slice(0,200)); }

    if (!json.ok) {
      msg.textContent = json.msg || "No se pudo iniciar sesión.";
      msg.style.display = "block";
      return;
    }

    // Redirige al dashboard local
    window.location.href = URL_DASHBOARD;

  } catch (err) {
    msg.textContent = "Error de red: " + (err?.message || err);
    msg.style.display = "block";
  }
});

// Utilidad exportable si quieres usarla en otras páginas:
async function checkSession() {
  const r = await fetch(URL_CHECK, { credentials: "include" });
  return r.json();
}
window.checkSession = checkSession;
