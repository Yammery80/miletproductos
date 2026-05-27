// ================================================================
// 🔥 CONFIGURA FIREBASE AQUÍ — reemplaza con tus datos
// ================================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC7gJYm6p_u4HKmY0i7v-q0pUPtSJAIgwE",
  authDomain: "milet-161ad.firebaseapp.com",
  projectId: "milet-161ad",
  storageBucket: "milet-161ad.firebasestorage.app",
  messagingSenderId: "223993149915",
  appId: "1:223993149915:web:87d0c64e5e42c230f34ffe",
  measurementId: "G-7G7LBQMZHN"
};
// ================================================================

// USUARIOS Y PINES — cambia los pines aquí
const USERS = [
  { id: 'admin',   nombre: 'Administrador', rol: 'admin',   localIdx: null, pin: '8520', avatarClass: 'av-admin', initials: 'AD' },
  { id: 'local1',  nombre: 'Local 1',       rol: 'local',   localIdx: 0,    pin: '1111', avatarClass: 'av-l1',    initials: 'L1' },
  { id: 'local2',  nombre: 'Local 2',       rol: 'local',   localIdx: 1,    pin: '2222', avatarClass: 'av-l2',    initials: 'L2' },
  { id: 'local3',  nombre: 'Local 3',       rol: 'local',   localIdx: 2,    pin: '3333', avatarClass: 'av-l3',    initials: 'L3' },
];

const LOCAL_NAMES = ['Local 1', 'Local 2', 'Local 3'];
const LOCAL_COLORS = ['#10b981','#f59e0b','#ef4444'];

// ---- STATE ----
let db = null;
let currentUser = null;
let selectedLoginUser = null;
let viewingLocalIdx = 0; // for admin tabs
let currentTab = 'dashboard';
let dashLocalIdx = 0;
let vtaLocalIdx = 0;
let tspLocalIdx = 0;

// ---- FIREBASE INIT ----
let firebaseOk = false;
async function initFirebase() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, collection, doc, addDoc, getDocs, getDoc, updateDoc, setDoc, deleteDoc, onSnapshot, query, orderBy, where, increment }
      = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    if (FIREBASE_CONFIG.apiKey === 'TU_API_KEY') {
      console.warn('Firebase no configurado — modo local');
      const banner = document.getElementById('firebase-banner');
      if (banner) banner.style.display = 'block';
      usarModoLocal();
      return;
    }

    const app = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
    firebaseOk = true;

    // Expose Firestore helpers globally
    window._fs = { collection, doc, addDoc, getDocs, getDoc, updateDoc, setDoc, deleteDoc, onSnapshot, query, orderBy, where, increment };
    console.log('Firebase OK');
  } catch(e) {
    console.error('Firebase error:', e);
    const banner = document.getElementById('firebase-banner');
    if (banner) banner.style.display = 'block';
    usarModoLocal();
  }
}

// ---- MODO LOCAL (sin Firebase) ----
// Usa localStorage como fallback para demostración
function usarModoLocal() {
  window._localData = JSON.parse(localStorage.getItem('mlc_data') || 'null') || {
    inventario: { 0:[], 1:[], 2:[] },
    ventas: [],
    traspasos: [],
    historial: [],
    metricas: {},
    categorias: [],
    lotes: {}
  };
  if (!window._localData.metricas) window._localData.metricas = {};
  if (!window._localData.categorias) window._localData.categorias = [];
  if (!window._localData.lotes) window._localData.lotes = {};
  window._saveLocal = () => localStorage.setItem('mlc_data', JSON.stringify(window._localData));
}

// ================================================================
// LOGIN
// ================================================================
function renderLoginUsers() {
  document.getElementById('login-users-list').innerHTML = USERS.map(u => `
    <button class="login-user-btn" onclick="selectLoginUser('${u.id}')">
      <div class="avatar ${u.avatarClass}">${u.initials}</div>
      <div class="login-user-info">
        <h4>${u.nombre}</h4>
        <p>${u.rol === 'admin' ? 'Acceso completo' : 'Solo su local'}</p>
      </div>
    </button>`).join('');
}

window.selectLoginUser = function(uid) {
  selectedLoginUser = USERS.find(u => u.id === uid);
  document.getElementById('pin-area').style.display = 'block';
  document.getElementById('pin-err').style.display = 'none';
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-input').focus();
};

window.verificarPin = function() {
  const pin = document.getElementById('pin-input').value;
  if (!selectedLoginUser) return;
  if (pin === selectedLoginUser.pin) {
    currentUser = selectedLoginUser;
    entrarApp();
  } else {
    document.getElementById('pin-err').style.display = 'block';
    document.getElementById('pin-input').value = '';
  }
};

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('pin-input') === document.activeElement) {
    window.verificarPin();
  }
});

function entrarApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  const av = document.getElementById('nav-avatar');
  av.className = 'avatar ' + currentUser.avatarClass;
  av.textContent = currentUser.initials;
  document.getElementById('nav-username').textContent = currentUser.nombre;

  viewingLocalIdx = currentUser.localIdx ?? 0;
  dashLocalIdx = currentUser.localIdx ?? 0;
  vtaLocalIdx = currentUser.localIdx ?? 0;
  tspLocalIdx = currentUser.localIdx ?? 0;

  // Reset tab visibility
  document.querySelectorAll('.tab').forEach(t => t.style.display = '');
  if (currentUser.rol !== 'admin') document.querySelector('.tab-compare').style.display = 'none';
  if (currentUser.rol === 'admin') { const tc = document.querySelector('.tab-corte'); if(tc) tc.style.display='none'; }

  // Go to dashboard
  currentTab = 'dashboard';
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.querySelector('.tab[onclick*="dashboard"]').classList.add('active');
  document.getElementById('s-dashboard').classList.add('active');

  // Show alert bell for everyone
  const bell = document.getElementById('alert-bell');
  if (bell) bell.style.display = 'block';
  window._alertas = JSON.parse(localStorage.getItem('mlc_alertas') || '[]');
  renderAlertas();

  poblarSelectCats();
  renderAll();
  setTimeout(() => checkCaducidadAlert(), 1200);
  if (firebaseOk) setupListeners();
}

window.cerrarSesion = function() {
  currentUser = null;
  selectedLoginUser = null;
  dashLocalIdx = 0; vtaLocalIdx = 0; tspLocalIdx = 0; histLocalIdx = null;
  const bellEl = document.getElementById('alert-bell');
  if (bellEl) bellEl.style.display = 'none';
  window._alertas = [];
  if (_dashChart) { _dashChart.destroy(); _dashChart = null; }
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('pin-area').style.display = 'none';
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-err').style.display = 'none';
};

// ================================================================
// TABS
// ================================================================
window.setTab = function(name, el) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById('s-' + name).classList.add('active');
  renderSection(name);
};

function renderAll() { renderSection(currentTab); }

function renderSection(name) {
  if (name === 'dashboard') renderDashboard();
  if (name === 'inventario') renderInventario(true);
  if (name === 'ventas') renderVentas();
  if (name === 'traspasos') renderTraspasos();
  if (name === 'historial') renderHistorial();
  if (name === 'comparar') renderComparar();
  if (name === 'corte') renderCorte();
  if (name === 'categorias') renderCategorias();
  if (name === 'inventario') poblarSelectCats();
  if (name === 'caducidad') renderCaducidad();
}

// ================================================================
// DATA HELPERS
// ================================================================
async function getInventario(localIdx) {
  if (firebaseOk) {
    const { collection, getDocs, query, where } = window._fs;
    const snap = await getDocs(query(collection(db, 'inventario'), where('localIdx', '==', localIdx)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else {
    return window._localData.inventario[localIdx] || [];
  }
}

async function getVentas(localIdx) {
  if (firebaseOk) {
    try {
      const { collection, getDocs, query, where, orderBy } = window._fs;
      const snap = await getDocs(query(collection(db, 'ventas'), where('localIdx', '==', localIdx), orderBy('fecha', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      // Fallback if composite index not created yet
      const { collection, getDocs, query, where } = window._fs;
      const snap = await getDocs(query(collection(db, 'ventas'), where('localIdx', '==', localIdx)));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return docs.sort((a,b) => b.fecha.localeCompare(a.fecha));
    }
  } else {
    return (window._localData.ventas || []).filter(v => v.localIdx === localIdx)
      .sort((a,b) => b.fecha.localeCompare(a.fecha));
  }
}

async function getTraspasos(localIdx) {
  if (firebaseOk) {
    try {
      const { collection, getDocs, query, where, orderBy } = window._fs;
      const snap = await getDocs(query(collection(db, 'traspasos'), where('origenIdx', '==', localIdx), orderBy('fecha', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      const { collection, getDocs, query, where } = window._fs;
      const snap = await getDocs(query(collection(db, 'traspasos'), where('origenIdx', '==', localIdx)));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return docs.sort((a,b) => b.fecha.localeCompare(a.fecha));
    }
  } else {
    return (window._localData.traspasos || []).filter(t => t.origenIdx === localIdx)
      .sort((a,b) => b.fecha.localeCompare(a.fecha));
  }
}

async function getHistorial(localIdx) {
  const cutoff15 = new Date(Date.now() - 15*24*60*60*1000).toISOString();
  if (firebaseOk) {
    try {
      const { collection, getDocs, query, orderBy, where, doc, deleteDoc } = window._fs;
      const snap = await getDocs(query(collection(db, 'historial'), orderBy('fecha', 'desc')));
      const allDocs = snap.docs;
      // Delete old entries silently
      allDocs.filter(d => (d.data().fecha || '') < cutoff15)
             .forEach(d => deleteDoc(doc(db, 'historial', d.id)).catch(()=>{}));
      const all = allDocs
        .filter(d => (d.data().fecha || '') >= cutoff15)
        .map(d => ({ id: d.id, ...d.data() }));
      return localIdx === null ? all : all.filter(h => h.localIdx === localIdx || h.destinoIdx === localIdx);
    } catch(e) {
      const { collection, getDocs } = window._fs;
      const snap = await getDocs(collection(db, 'historial'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(d => (d.fecha||'') >= cutoff15)
        .sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''));
      return localIdx === null ? all : all.filter(h => h.localIdx === localIdx || h.destinoIdx === localIdx);
    }
  } else {
    const cutoff = new Date(Date.now() - 15*24*60*60*1000).toISOString();
    const all = (window._localData.historial || [])
      .filter(h => (h.fecha || '') >= cutoff)
      .slice().reverse();
    window._localData.historial = (window._localData.historial || []).filter(h => (h.fecha||'') >= cutoff);
    window._saveLocal();
    return localIdx === null ? all : all.filter(h => h.localIdx === localIdx || h.destinoIdx === localIdx);
  }
}

// ================================================================
// DASHBOARD
// ================================================================
window.switchDashLocal = function(idx) { dashLocalIdx = idx; renderDashboard(); };

async function renderDashboard() {
  const isAdmin = currentUser.rol === 'admin';
  if (!isAdmin) dashLocalIdx = currentUser.localIdx ?? 0;

  const tabsEl = document.getElementById('dash-local-tabs');
  if (isAdmin) {
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = LOCAL_NAMES.map((n,i) =>
      `<button class="local-tab ${i===dashLocalIdx?'active':''}" onclick="switchDashLocal(${i})">${n}</button>`).join('');
  } else {
    tabsEl.style.display = 'none';
  }

  document.getElementById('dash-local-label').textContent = LOCAL_NAMES[dashLocalIdx];

  const inv = await getInventario(dashLocalIdx);
  const vtas = await getVentas(dashLocalIdx);
  const totalVentas = vtas.reduce((a, v) => a + (v.total || 0), 0);
  const hoy = new Date().toDateString();
  const vtasHoyList = vtas.filter(v => { try { return (v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha)).toDateString() === hoy; } catch(e){return false;} });
  const ventasHoy = vtasHoyList.reduce((a, v) => a + v.total, 0);
  const txHoy = vtasHoyList.length;
  const stockBajo = inv.filter(p => p.qty <= p.min).length;

  // Cost map for ganancia calculation
  const costMap = {};
  inv.forEach(p => { costMap[p.nombre.toLowerCase()] = p.costo || 0; });

  // Ganancia total and this month
  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}`;
  const vtasMes = vtas.filter(v => { try { const f = v.fecha?.toDate ? v.fecha.toDate().toISOString() : String(v.fecha); return f.slice(0,7) === mesActual; } catch(e){return false;} });
  const gananciaTotal = vtas.reduce((a,v) => a + ((v.precio - (costMap[v.producto?.toLowerCase()]||0)) * v.qty), 0);
  const gananciaMes   = vtasMes.reduce((a,v) => a + ((v.precio - (costMap[v.producto?.toLowerCase()]||0)) * v.qty), 0);
  const ventasMes     = vtasMes.reduce((a,v) => a + v.total, 0);
  const inversionTotal = inv.reduce((a,p) => a + ((p.costo||0) * p.qty), 0);

  // Save monthly snapshot to metricas
  await guardarMetricaMes(dashLocalIdx, mesActual, { ventas: ventasMes, ganancia: gananciaMes, inversion: inversionTotal });

  document.getElementById('dash-stats').innerHTML = isAdmin ? `
    <div class="stat-card"><div class="slabel">Ventas totales</div><div class="sval c-green">$${totalVentas.toFixed(2)}</div></div>
    <div class="stat-card"><div class="slabel">Ganancia total</div><div class="sval" style="color:#10b981">$${gananciaTotal.toFixed(2)}</div></div>
    <div class="stat-card"><div class="slabel">Inversión actual</div><div class="sval c-amber">$${inversionTotal.toFixed(2)}</div></div>
    <div class="stat-card"><div class="slabel">Ventas hoy</div><div class="sval c-blue">$${ventasHoy.toFixed(2)}</div></div>
    <div class="stat-card"><div class="slabel">Stock bajo</div><div class="sval ${stockBajo > 0 ? 'c-red' : 'c-green'}">${stockBajo}</div></div>
  ` : `
    <div class="stat-card"><div class="slabel">Ventas hoy</div><div class="sval c-green">$${ventasHoy.toFixed(2)}</div></div>
    <div class="stat-card"><div class="slabel">Transacciones hoy</div><div class="sval c-blue">${txHoy}</div></div>
    <div class="stat-card"><div class="slabel">Productos</div><div class="sval">${inv.length}</div></div>
    <div class="stat-card"><div class="slabel">Stock bajo</div><div class="sval ${stockBajo > 0 ? 'c-red' : 'c-green'}">${stockBajo}</div></div>
  `;

  // Acumulado del mes
  document.getElementById('dash-mes-stats').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;">
      <div style="background:var(--bg3);border-radius:8px;padding:12px;">
        <p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;">Ventas ${mesActual}</p>
        <p style="font-size:20px;font-family:'Syne',sans-serif;color:var(--accent);">$${ventasMes.toFixed(2)}</p>
      </div>
      ${isAdmin ? `<div style="background:var(--bg3);border-radius:8px;padding:12px;">
        <p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;">Ganancia ${mesActual}</p>
        <p style="font-size:20px;font-family:'Syne',sans-serif;color:var(--green);">$${gananciaMes.toFixed(2)}</p>
      </div>` : ''}
      <div style="background:var(--bg3);border-radius:8px;padding:12px;">
        <p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;">Transacciones</p>
        <p style="font-size:20px;font-family:'Syne',sans-serif;">${vtasMes.length}</p>
      </div>
      ${isAdmin ? `<div style="background:var(--bg3);border-radius:8px;padding:12px;">
        <p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;">Ticket promedio</p>
        <p style="font-size:20px;font-family:'Syne',sans-serif;">${vtasMes.length ? '$'+(ventasMes/vtasMes.length).toFixed(2) : '—'}</p>
      </div>` : ''}
    </div>`;

    // Top productos por categoría (all-time for this local)
  const prodCount = {};
  vtas.forEach(v => {
    const cat = costMap[v.producto?.toLowerCase()] !== undefined
      ? (inv.find(p => p.nombre.toLowerCase() === v.producto?.toLowerCase())?.cat || 'Sin cat.')
      : 'Sin cat.';
    const key = v.producto + '||' + cat;
    if (!prodCount[key]) prodCount[key] = { nombre: v.producto, cat, qty: 0, total: 0 };
    prodCount[key].qty += v.qty;
    prodCount[key].total += v.total;
  });
  const topProds = Object.values(prodCount).sort((a,b) => b.qty - a.qty).slice(0, 8);
  const maxQty = Math.max(...topProds.map(p => p.qty), 1);
  document.getElementById('dash-top-productos').innerHTML = topProds.length ? topProds.map(p => `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
        <span>${p.nombre} <span style="color:var(--muted);font-size:10px;">${p.cat}</span></span>
        <span style="color:var(--muted);">${p.qty} uds</span>
      </div>
      <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:5px;">
        <div style="width:${(p.qty/maxQty*100).toFixed(1)}%;height:5px;border-radius:4px;background:var(--accent);"></div>
      </div>
    </div>`).join('')
    : '<p style="color:var(--muted);font-size:12px;padding:16px;text-align:center;">Sin ventas aún</p>';

  const bajos = inv.filter(p => p.qty <= p.min);
  document.getElementById('dash-stock-list').innerHTML = bajos.length
    ? bajos.map(p => `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${p.nombre}</span><span class="badge badge-low">${p.qty} uds</span></div>`).join('')
    : '<p style="color:var(--muted);padding:16px;text-align:center;font-size:13px;">Todo en orden ✓</p>';

  // Productos próximos a caducar en dashboard
  const lotes8 = await getLotesACaducar(dashLocalIdx, 8);
  const cadEl = document.getElementById('dash-caduca-list');
  if (cadEl) cadEl.innerHTML = lotes8.length
    ? lotes8.slice(0,5).map(l => {
        const d = diasParaCaducar(l.caduca);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%;">${l.prodNombre} <span style="color:var(--muted);font-size:10px;">(${l.cantidad}u)</span></span>
          ${badgeCaduca(d)}
        </div>`;
      }).join('')
    : '<p style="color:var(--muted);font-size:12px;text-align:center;padding:8px;">Sin caducidades próximas</p>';

  // Show/hide sections by role
  const mensualRow = document.getElementById('dash-mensual-row');
  if (mensualRow) mensualRow.style.display = isAdmin ? 'grid' : 'none';
  if (isAdmin) {
    document.getElementById('dash-historico-card').style.display = 'block';
    await renderDashHistorico();
  } else {
    document.getElementById('dash-historico-card').style.display = 'none';
  }

  await renderDashChart(isAdmin, dashLocalIdx);
}

// ── CHART
let _dashChart = null;
async function renderDashChart(isAdmin, currentDashLocal) {
  if (!window.Chart) {
    await new Promise((res,rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  // Build last 30 days labels
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0,10));
  }
  const labels = days.map(d => {
    const [,m,day] = d.split('-');
    return `${parseInt(day)}/${parseInt(m)}`;
  });

  // Which locals to show
  const localsToShow = isAdmin ? [0,1,2] : [currentDashLocal ?? dashLocalIdx];
  const palette = ['#10b981','#f59e0b','#ef4444'];

  const datasets = await Promise.all(localsToShow.map(async (li) => {
    const vtas = await getVentas(li);
    const byDay = {};
    vtas.forEach(v => { const d = v.fecha.slice(0,10); byDay[d] = (byDay[d]||0) + v.total; });
    return {
      label: LOCAL_NAMES[li],
      data: days.map(d => parseFloat((byDay[d]||0).toFixed(2))),
      borderColor: palette[li],
      backgroundColor: palette[li] + '18',
      fill: true,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 2
    };
  }));

  const canvas = document.getElementById('dash-chart');
  if (!canvas) return;

  if (_dashChart) { _dashChart.destroy(); _dashChart = null; }

  _dashChart = new window.Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}` }
        }
      },
      scales: {
        x: { ticks: { color:'#6b7280', font:{size:10}, maxTicksLimit:10, autoSkip:true }, grid:{display:false} },
        y: { ticks: { color:'#6b7280', font:{size:10}, callback: v => '$'+v }, grid:{color:'rgba(255,255,255,0.05)'} }
      }
    }
  });

  // Custom legend
  document.getElementById('dash-chart-legend').innerHTML = datasets.map(ds =>
    `<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#9ca3af;">
      <span style="width:10px;height:10px;border-radius:2px;background:${ds.borderColor};display:inline-block;"></span>${ds.label}
    </span>`).join('');
}

// ================================================================
// INVENTARIO
// ================================================================
function renderLocalTabs(containerId, activeIdx, onClickFn, showAll = false) {
  const isAdmin = currentUser.rol === 'admin';
  const tabs = LOCAL_NAMES.map((n, i) => `
    <button class="local-tab ${i === activeIdx ? 'active' : ''}" onclick="${onClickFn}(${i})">${n}</button>`).join('');
  document.getElementById(containerId).innerHTML = tabs;
}

window.switchInvLocal = function(idx) {
  viewingLocalIdx = idx;
  renderInventario(true); // force re-fetch on local switch
};

async function renderInventario(force = false) {
  const isAdmin = currentUser.rol === 'admin';
  const canEdit = isAdmin || currentUser.localIdx === viewingLocalIdx;
  // Ensure categories are cached before rendering rows
  if (!window._catsCache || window._catsCache.length === 0) {
    await poblarSelectCats();
  }

  if (isAdmin) renderLocalTabs('inv-local-tabs', viewingLocalIdx, 'switchInvLocal');
  else document.getElementById('inv-local-tabs').innerHTML = '';

  document.getElementById('inv-table-title').textContent = `Inventario — ${LOCAL_NAMES[viewingLocalIdx]}`;
  document.getElementById('inv-actions-th').textContent = canEdit ? 'Acciones' : '';

  if (!canEdit) {
    document.getElementById('inv-form-card').classList.add('disabled-overlay');
  } else {
    document.getElementById('inv-form-card').classList.remove('disabled-overlay');
  }

  // Use cached inv if available and not forced
  let inv;
  if (!force && window._currentInv && window._currentInvLocalIdx === viewingLocalIdx) {
    inv = window._currentInv;
  } else {
    inv = await getInventario(viewingLocalIdx);
    window._currentInv = inv;
    window._currentInvLocalIdx = viewingLocalIdx;
  }
  window._currentInvMeta = { isAdmin, canEdit };

  // Only clear search on forced reload (e.g. tab switch), not on minor updates
  if (force) {
    const searchEl = document.getElementById('inv-search');
    if (searchEl) searchEl.value = '';
  }

  // Show count immediately, then render
  const container = document.getElementById('inv-content');
  const searchEl2 = document.getElementById('inv-search');
  if (searchEl2 && searchEl2.value.trim()) {
    window.filtrarInventario(searchEl2.value);
    return;
  }
  if (container && inv.length > 0 && force) {
    container.innerHTML = `<p style="color:var(--muted);font-size:12px;padding:8px 0;">Cargando ${inv.length} productos...</p>`;
  }
  // Use setTimeout to let UI update before heavy render
  setTimeout(() => renderInventarioFiltrado(inv, isAdmin, canEdit), 10);
}

function renderInventarioFiltrado(inv, isAdmin, canEdit) {
  const container = document.getElementById('inv-content');
  if (!container) return;
  // Preserve scroll position
  const savedScrollY = window.scrollY;

  if (!inv.length) {
    container.innerHTML = '<p style="padding:32px;text-align:center;color:var(--muted);font-size:13px;">Sin productos en este local</p>';
    return;
  }

  // Helper: editable input cell
  const inp = (val, field, pid, type='text', w='100%') =>
    `<input type="${type}" value="${String(val).replace(/"/g,'&quot;')}"
      style="width:${w};background:var(--bg3);border:1px solid var(--border2);border-radius:6px;
             padding:5px 8px;color:var(--text);font-size:12px;outline:none;"
      onchange="editarCampo('${pid}','${field}',this.value,this)"
      onclick="this.select()">`;

  // Group by category
  const groups = {};
  inv.forEach(p => {
    const cat = (p.cat||'').trim() || 'Sin categoría';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });
  const cats = Object.keys(groups).sort((a,b) =>
    a==='Sin categoría' ? 1 : b==='Sin categoría' ? -1 : a.localeCompare(b));

  // Column definitions — always same count, hide costo for non-admin via style
  const thStyle = 'text-align:left;padding:8px 10px;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid var(--border);white-space:nowrap;font-weight:400;';

  let html = '';
  cats.forEach(cat => {
    const items = groups[cat];
    const lowCount = items.filter(p => p.qty <= p.min).length;

    const rows = items.map(p => {
      const qtyCell = canEdit
        ? `<div style="display:flex;align-items:center;gap:5px;">
            <button class="btn btn-ghost btn-sm" style="padding:3px 9px;" onclick="cambiarQty('${p.id}',-1)">−</button>
            <span style="min-width:24px;text-align:center;font-size:13px;">${p.qty}</span>
            <button class="btn btn-ghost btn-sm" style="padding:3px 9px;" onclick="cambiarQty('${p.id}',1)">+</button>
           </div>`
        : `<span style="font-size:13px;">${p.qty}</span>`;

      return `<tr>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;color:var(--muted);">
          ${canEdit ? inp(p.sku||'','sku',p.id,'text','80px') : (p.sku ? `<span style="background:rgba(59,130,246,.1);color:var(--accent);padding:2px 6px;border-radius:4px;">${p.sku}</span>` : '—')}
        </td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);">
          ${isAdmin ? inp(p.nombre,'nombre',p.id,'text','100%') : `<span style="font-size:13px;">${p.nombre}</span>`}
        </td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);color:var(--muted);font-size:12px;">
          <select
              style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:5px 6px;color:var(--text);font-size:12px;"
              onchange="editarCampo('${p.id}','cat',this.value,this)">
              <option value="">Sin categoría</option>
              ${(window._catsCache||[]).map(c => `<option value="${c.nombre}" ${p.cat===c.nombre?'selected':''}>${c.nombre}</option>`).join('')}
            </select>
        </td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);">${qtyCell}</td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);color:var(--muted);text-align:center;">
          ${isAdmin ? inp(p.min,'min',p.id,'number','60px') : p.min}
        </td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);${isAdmin?'':'display:none;'}">
          ${isAdmin ? inp((p.costo||0).toFixed(2),'costo',p.id,'number','90px') : ''}
        </td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);">
          ${canEdit ? inp((p.precio||0).toFixed(2),'precio',p.id,'number','90px') : `<span style="font-weight:500;">$${(p.precio||0).toFixed(2)}</span>`}
        </td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);">
          <button onclick="abrirModalLotes('${p.id}','${p.nombre.replace(/'/g,"\'")}')"
            class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px;white-space:nowrap;">
            🗓 Lotes
          </button>
        </td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);text-align:center;">
          <span class="badge ${p.qty<=p.min?'badge-low':'badge-ok'}">${p.qty<=p.min?'Bajo':'OK'}</span>
        </td>
        <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.04);">
          ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="eliminarProducto('${p.id}')">Eliminar</button>` : ''}
        </td>
      </tr>`;
    }).join('');

    html += `
      <details open style="margin-bottom:12px;">
        <summary style="display:flex;align-items:center;justify-content:space-between;
          padding:9px 14px;background:var(--bg3);border-radius:8px 8px 0 0;
          cursor:pointer;font-size:13px;font-weight:500;border:1px solid var(--border);
          list-style:none;user-select:none;outline:none;">
          <span style="display:flex;align-items:center;gap:10px;">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;"></span>
            ${cat}
            <span style="font-size:11px;color:var(--muted);font-weight:400;">${items.length} prod.</span>
          </span>
          <span style="display:flex;gap:6px;align-items:center;">
            ${lowCount ? `<span class="badge badge-low">${lowCount} bajo stock</span>` : ''}
            <span style="color:var(--muted);font-size:12px;">▾</span>
          </span>
        </summary>
        <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 8px 8px;overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:rgba(255,255,255,0.02);">
                <th style="${thStyle}width:85px;">SKU</th>
                <th style="${thStyle}">Nombre</th>
                <th style="${thStyle}">Categoría</th>
                <th style="${thStyle}width:130px;">Cantidad</th>
                <th style="${thStyle}width:60px;text-align:center;">Mín</th>
                <th style="${thStyle}width:100px;${isAdmin?'':'display:none;'}">Costo</th>
                <th style="${thStyle}width:110px;">Precio</th>
                <th style="${thStyle}width:80px;text-align:center;">Lotes</th>
                <th style="${thStyle}width:75px;text-align:center;">Estado</th>
                <th style="${thStyle}width:85px;">${isAdmin?'Acciones':''}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>`;
  });

  container.innerHTML = html;
  // Restore scroll position
  requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
}

window.filtrarInventario = async function(query) {
  if (!window._catsCache || window._catsCache.length === 0) await poblarSelectCats();
  const { isAdmin, canEdit } = window._currentInvMeta || {};
  const inv = window._currentInv || [];
  if (!query.trim()) {
    renderInventarioFiltrado(inv, isAdmin, canEdit);
    return;
  }
  const q = query.toLowerCase();
  const filtered = inv.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.cat || '').toLowerCase().includes(q)
  );
  // In search mode: show editable result cards instead of grouped table
  renderResultadosBusqueda(filtered, isAdmin, canEdit, query);
}

function renderResultadosBusqueda(filtered, isAdmin, canEdit, query) {
  const container = document.getElementById('inv-content');
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted);font-size:13px;">
      Sin resultados para "<strong style="color:var(--text);">${query}</strong>"</div>`;
    return;
  }

  const inlineInput = (val, field, pid, type='text', extra='', label='') =>
    `<div style="display:flex;flex-direction:column;gap:4px;">
      ${label ? `<span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;">${label}</span>` : ''}
      <input type="${type}" value="${String(val).replace(/"/g,'&quot;')}" ${extra}
        style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px 10px;color:var(--text);font-size:13px;"
        onchange="editarCampo('${pid}','${field}',this.value,this)"
        onclick="this.select()">
    </div>`;

  const readField = (label, val) =>
    `<div style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;">${label}</span>
      <span style="padding:6px 10px;font-size:13px;">${val}</span>
    </div>`;

  container.innerHTML = `
    <p style="font-size:11px;color:var(--muted);margin-bottom:12px;">${filtered.length} resultado${filtered.length!==1?'s':''} para "<strong style="color:var(--text);">${query}</strong>"</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
    ${filtered.map(p => {
      const lowStock = p.qty <= p.min;
      return `<div style="background:var(--bg2);border:1px solid ${lowStock?'rgba(239,68,68,0.3)':'var(--border)'};border-radius:10px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <div>
            <p style="font-weight:600;font-size:14px;">${p.nombre}</p>
            <p style="font-size:11px;color:var(--muted);margin-top:2px;">${p.cat||'Sin categoría'}</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="badge ${lowStock?'badge-low':'badge-ok'}">${lowStock?'⚠ Stock bajo':'OK'}</span>
            ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="eliminarProducto('${p.id}')">Eliminar</button>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
          ${inlineInput(p.sku||'','sku',p.id,'text','','SKU / Código')}
          ${isAdmin ? inlineInput(p.nombre,'nombre',p.id,'text','','Nombre') : readField('Nombre', p.nombre)}
          <div style="display:flex;flex-direction:column;gap:4px;">
            <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;">Departamento</span>
            ${(isAdmin || canEdit) ? `<select style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px 10px;color:var(--text);font-size:13px;" onchange="editarCampo('${p.id}','cat',this.value,this)">
              <option value="">Sin categoría</option>
              ${(window._catsCache||[]).map(c => `<option value="${c.nombre}" ${p.cat===c.nombre?'selected':''}>${c.nombre}</option>`).join('')}
            </select>` : readField('Departamento', p.cat||'—')}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;">Cantidad</span>
            ${canEdit
              ? `<div style="display:flex;align-items:center;gap:6px;padding-top:2px;">
                  <button class="btn btn-ghost btn-sm" onclick="cambiarQty('${p.id}',-1)" style="padding:5px 10px;">−</button>
                  <span style="min-width:28px;text-align:center;font-size:14px;font-weight:500;">${p.qty}</span>
                  <button class="btn btn-ghost btn-sm" onclick="cambiarQty('${p.id}',1)" style="padding:5px 10px;">+</button>
                </div>`
              : `<span style="padding:6px 10px;font-size:13px;">${p.qty}</span>`
            }
          </div>
          ${isAdmin ? inlineInput(p.min,'min',p.id,'number','min="0"','Stock mínimo') : readField('Stock mínimo', p.min)}
          ${inlineInput((p.costo||0).toFixed(2),'costo',p.id,'number','min="0" step="0.01"','Costo ($)')}
          ${canEdit ? inlineInput((p.precio||0).toFixed(2),'precio',p.id,'number','min="0" step="0.01"','Precio venta ($)') : readField('Precio ($)', '$'+(p.precio||0).toFixed(2))}
        </div>
      </div>`;
    }).join('')}
    </div>`;
}

window.agregarProducto = async function() {
  const nombre = document.getElementById('i-nombre').value.trim();
  if (!nombre) { showModalError('Campo obligatorio', 'El nombre del producto es requerido.', '¿Qué hacer? Escribe el nombre del producto antes de agregar.'); return; }

  // Check duplicate in THIS local
  const existingInv = await getInventario(viewingLocalIdx);
  const dup = existingInv.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
  if (dup) { showModalError('Producto duplicado', `"${nombre}" ya existe en este local con ${dup.qty} unidades disponibles.`, '¿Qué hacer? Si quieres agregar más stock, búscalo en el inventario y ajusta la cantidad con los botones + / −.'); return; }

  const data = {
    nombre,
    sku: document.getElementById('i-sku').value.trim(),
    cat: document.getElementById('i-cat').value.trim(),
    qty: parseInt(document.getElementById('i-qty').value) || 0,
    min: parseInt(document.getElementById('i-min').value) || 0,
    costo: parseFloat(document.getElementById('i-costo').value) || 0,
    precio: parseFloat(document.getElementById('i-precio').value) || 0,
    localIdx: viewingLocalIdx,
    creadoEn: new Date().toISOString()
  };

  if (firebaseOk) {
    const { collection, addDoc } = window._fs;
    await addDoc(collection(db, 'inventario'), data);
  } else {
    data.id = Date.now().toString();
    window._localData.inventario[viewingLocalIdx].push(data);
    window._saveLocal();
  }

  await logHistorial({ tipo: 'producto_agregado', localIdx: viewingLocalIdx, descripcion: `Producto "${nombre}" agregado al inventario` });
  ['i-nombre','i-sku','i-cat','i-qty','i-min','i-costo','i-precio'].forEach(id => document.getElementById(id).value = '');
  invalidarCacheProductos();
  window._currentInv = null; // force re-fetch
  renderInventario(true);
  pushAlerta(`${currentUser.nombre} agregó "${nombre}" a ${LOCAL_NAMES[viewingLocalIdx]}`, 'ok');
  showModalOk('Producto agregado', `"${nombre}" fue agregado al inventario de ${LOCAL_NAMES[viewingLocalIdx]}.`, '📦');
};

window.editarCampo = async function(pid, field, rawVal, inputEl) {
  // Role-based field permissions
  const isAdmin = currentUser.rol === 'admin';
  const adminOnly = ['nombre','costo','min']; // 'cat' removed — locals can edit category
  if (adminOnly.includes(field) && !isAdmin) { showModalError('Sin permiso', 'No tienes permiso para modificar este campo.', '¿Qué hacer? Contacta al administrador para que realice este cambio.'); return; }

  let val = rawVal;
  if (['qty','min','costo','precio'].includes(field)) {
    val = parseFloat(rawVal);
    if (isNaN(val) || val < 0) { showModalError('Valor inválido', 'El valor ingresado no es válido. Solo se aceptan números mayores o iguales a 0.', '¿Qué hacer? Verifica el dato e intenta de nuevo.'); return; }
  }

  // Get old value for history
  let oldVal = null;
  const syncFields = ['nombre','precio','costo']; // these sync across all locals if same product name
  let productoNombre = null;

  if (firebaseOk) {
    const { doc, getDoc, updateDoc, collection, getDocs, query, where } = window._fs;
    const snap = await getDoc(doc(db, 'inventario', pid));
    if (snap.exists()) { oldVal = snap.data()[field]; productoNombre = snap.data().nombre; }
    await updateDoc(doc(db, 'inventario', pid), { [field]: val });

    // Admin syncing nombre/precio/costo across all locals with same product name
    if (isAdmin && syncFields.includes(field) && productoNombre) {
      const allSnap = await getDocs(query(collection(db, 'inventario'), where('nombre', '==', productoNombre)));
      for (const d of allSnap.docs) {
        if (d.id !== pid) await updateDoc(doc(db, 'inventario', d.id), { [field]: val });
      }
      // If renaming, search by old name
      if (field === 'nombre') {
        const oldSnap = await getDocs(query(collection(db, 'inventario'), where('nombre', '==', oldVal)));
        for (const d of oldSnap.docs) {
          if (d.id !== pid) await updateDoc(doc(db, 'inventario', d.id), { nombre: val });
        }
      }
    }
  } else {
    const inv = window._localData.inventario[viewingLocalIdx];
    const p = inv.find(x => x.id === pid);
    if (p) { oldVal = p[field]; productoNombre = p.nombre; p[field] = val; }

    // Sync across all locals in localStorage
    if (isAdmin && syncFields.includes(field) && productoNombre) {
      const searchName = field === 'nombre' ? productoNombre : productoNombre;
      for (let li = 0; li < 3; li++) {
        const lInv = window._localData.inventario[li] || [];
        lInv.forEach(item => {
          if (item.id !== pid && item.nombre.toLowerCase() === searchName.toLowerCase()) {
            item[field] = val;
          }
        });
      }
    }
    window._saveLocal();
  }

  const fieldLabels = {nombre:'Nombre',cat:'Departamento',qty:'Cantidad',min:'Stock mínimo',costo:'Costo',precio:'Precio'};
  await logHistorial({
    tipo: 'edicion',
    localIdx: viewingLocalIdx,
    usuario: currentUser.nombre,
    descripcion: `Editó "${fieldLabels[field]||field}" de "${oldVal}" → "${val}" (producto ID ${pid})`
  });
  // Alert on low stock after editing qty or min
  if (field === 'qty' || field === 'min') {
    const invCheck = await getInventario(viewingLocalIdx);
    const pCheck = invCheck.find(x => x.id === pid);
    if (pCheck) verificarStockBajo(pCheck.nombre, field==='qty'?val:(pCheck.qty||0), field==='min'?val:(pCheck.min||0), viewingLocalIdx);
  }

  if (inputEl) inputEl.style.borderColor = 'var(--green)';
  // Fire inventory alert for qty/min changes
  if (field === 'qty' || field === 'min') {
    try {
      let newQty = val, newMin = 0;
      if (firebaseOk) {
        const snap2 = await window._fs.getDoc(window._fs.doc(db, 'inventario', pid));
        if (snap2.exists()) { newQty = snap2.data().qty; newMin = snap2.data().min; }
      } else {
        const p2 = (window._localData.inventario[viewingLocalIdx]||[]).find(x=>x.id===pid);
        if (p2) { newQty = p2.qty; newMin = p2.min; }
      }
      if (newQty <= newMin) alertaInventario(`Stock bajo: "${productoNombre}" — ${newQty} uds (mín ${newMin})`, 'warn');
    } catch(e) {}
  }
  if (field === 'nombre' && val && val !== oldVal) alertaInventario(`Producto renombrado: "${oldVal}" → "${val}"`, 'info');
  if (field === 'precio' && val !== oldVal) alertaInventario(`Precio actualizado: "${productoNombre}" → $${parseFloat(val).toFixed(2)}`, 'info');
  if (field === 'costo' && val !== oldVal) alertaInventario(`Costo actualizado: "${productoNombre}" → $${parseFloat(val).toFixed(2)}`, 'info');

  // Update in-memory cache immediately so re-render is instant
  if (window._currentInv) {
    const cached = window._currentInv.find(p => p.id === pid);
    if (cached) cached[field] = val;
  }
  // Alert
  const _fl = { nombre:'Nombre', cat:'Categoría', qty:'Cantidad', min:'Stock mínimo', costo:'Costo', precio:'Precio', sku:'SKU' };
  pushAlerta(`${currentUser.nombre} modificó ${_fl[field]||field} → "${val}" en ${LOCAL_NAMES[viewingLocalIdx]}`,
    field==='qty'||field==='min' ? 'warn' : 'info');

  // Re-render from cache (no re-fetch)
  if (inputEl) inputEl.style.borderColor = 'var(--green)';
  setTimeout(() => { if (inputEl) inputEl.style.borderColor = ''; }, 1000);

  const searchEl = document.getElementById('inv-search');
  if (searchEl && searchEl.value.trim()) {
    window.filtrarInventario(searchEl.value);
  } else {
    renderInventario(); // uses cache
  }

  // Show modal only for important field changes (not qty, not sku)
  const importantFields = { nombre:'Nombre', cat:'Categoría', costo:'Costo', precio:'Precio', min:'Stock mínimo' };
  if (importantFields[field]) {
    showModalOk('Campo actualizado', `${importantFields[field]} → "${val}" en ${LOCAL_NAMES[viewingLocalIdx]}`, '✏️');
  }
};

window.cambiarQty = async function(pid, delta) {
  // Optimistic update in cache immediately for instant UI response
  if (window._currentInv) {
    const cached = window._currentInv.find(p => p.id === pid);
    if (cached) cached.qty = Math.max(0, (cached.qty || 0) + delta);
  }
  // Re-render from cache immediately
  const { isAdmin, canEdit } = window._currentInvMeta || {};
  const searchElQ = document.getElementById('inv-search');
  if (searchElQ && searchElQ.value.trim()) {
    window.filtrarInventario(searchElQ.value);
  } else {
    renderInventario();
  }

  if (firebaseOk) {
    const { doc, getDoc, updateDoc, increment } = window._fs;
    const snap = await getDoc(doc(db, 'inventario', pid));
    const oldQty = snap.exists() ? snap.data().qty : 0;
    const prodName = snap.exists() ? snap.data().nombre : pid;
    await updateDoc(doc(db, 'inventario', pid), { qty: increment(delta) });
    await logHistorial({ tipo: 'edicion', localIdx: viewingLocalIdx, usuario: currentUser.nombre,
      descripcion: `Ajuste de cantidad: ${oldQty} → ${Math.max(0,oldQty+delta)} (${prodName})` });
    pushAlerta(`${currentUser.nombre} ${delta>0?'sumó':'restó'} ${Math.abs(delta)} uds en ${LOCAL_NAMES[viewingLocalIdx]}`, 'info');
    // Check stock alert without re-fetching full inventory
    const realQty = Math.max(0, oldQty + delta);
    const minVal = snap.exists() ? (snap.data().min || 0) : 0;
    if (realQty <= minVal) {
      pushAlerta(`Stock bajo: "${prodName}" — ${realQty} uds (mín ${minVal})`, 'warn');
      showModalOk('⚠ Stock bajo', `"${prodName}" bajó a ${realQty} unidades (mínimo: ${minVal}).`, '⚠️');
    }
  } else {
    const inv = window._localData.inventario[viewingLocalIdx] || [];
    const p = inv.find(x => x.id === pid);
    if (p) {
      const oldQty = p.qty;
      p.qty = Math.max(0, p.qty + delta);
      window._saveLocal();
      await logHistorial({ tipo: 'edicion', localIdx: viewingLocalIdx, usuario: currentUser.nombre,
        descripcion: `Ajuste de cantidad: ${oldQty} → ${p.qty} (${p.nombre})` });
      pushAlerta(`${currentUser.nombre} ${delta>0?'sumó':'restó'} ${Math.abs(delta)} uds en ${LOCAL_NAMES[viewingLocalIdx]}`, 'info');
      if (p.qty <= p.min) pushAlerta(`Stock bajo: "${p.nombre}" — ${p.qty} uds (mín ${p.min})`, 'warn');
      if (p.qty <= p.min) showModalOk('⚠ Stock bajo', `"${p.nombre}" bajó a ${p.qty} unidades (mínimo: ${p.min}).`, '⚠️');
    }
  }
};

// ================================================================
// UTILS
// ================================================================
function fmtDate(iso) {
  try {
    const d = iso?.toDate ? iso.toDate() : new Date(iso);
    return d.toLocaleString('es-MX', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' });
  } catch(e) { return '—'; }
}

// ================================================================
// VENTAS
// ================================================================
// vtaLocalIdx declared at module scope
window.switchVtaLocal = function(idx) { vtaLocalIdx = idx; renderVentas(); };

async function renderVentas() {
  const isAdmin = currentUser.rol === 'admin';
  if (!isAdmin) vtaLocalIdx = currentUser.localIdx ?? 0;
  const tabsEl = document.getElementById('vta-local-tabs');
  if (isAdmin) {
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = LOCAL_NAMES.map((n,i) => `<button class="local-tab ${i===vtaLocalIdx?'active':''}" onclick="switchVtaLocal(${i})">${n}</button>`).join('');
  } else { tabsEl.style.display = 'none'; }
  document.getElementById('vta-local-label').textContent = LOCAL_NAMES[vtaLocalIdx];
  document.getElementById('vta-form-card').style.display = isAdmin ? 'none' : 'block';
  const inv = await getInventario(vtaLocalIdx);
  if (!isAdmin) {
    window._vtaInv = inv;
    const buscar = document.getElementById('v-buscar');
    const hidden = document.getElementById('v-producto');
    if (buscar) buscar.value = '';
    if (hidden) hidden.value = '';
    document.getElementById('v-precio').value = '';
    // Set default fecha to now
    const fechaEl = document.getElementById('v-fecha');
    if (fechaEl && !fechaEl.value) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset()*60000);
      fechaEl.value = local.toISOString().slice(0,16);
    }
  }
  const vtas = await getVentas(vtaLocalIdx);
  const thTotal = document.getElementById('vta-th-total');
  if (thTotal) thTotal.style.display = isAdmin ? '' : 'none';
  const tbody = document.getElementById('vta-tbody');
  if (!vtas.length) { tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Sin ventas registradas</td></tr>`; return; }
  tbody.innerHTML = vtas.map(v => `
    <tr>
      <td style="color:var(--muted);font-size:12px;">${fmtDate(v.fecha)}</td>
      <td>${v.producto}</td>
      <td>${v.qty}</td>
      <td>$${(v.precio||0).toFixed(2)}</td>
      <td style="display:${isAdmin?'':'none'};color:var(--green);font-weight:500;">$${(v.total||0).toFixed(2)}</td>
      <td>${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="eliminarVenta('${v.id}')">✕</button>` : ''}</td>
    </tr>`).join('');
}

window.registrarVenta = async function() {
  const localIdx = currentUser.rol === 'admin' ? vtaLocalIdx : (currentUser.localIdx ?? 0);
  const pid = document.getElementById('v-producto').value;
  const qty = parseInt(document.getElementById('v-qty').value) || 1;
  const precio = parseFloat(document.getElementById('v-precio').value) || 0;
  if (!pid) { showModalError('Producto no seleccionado', 'Debes buscar y seleccionar un producto antes de registrar la venta.', '¿Qué hacer? Escribe el nombre o SKU del producto en el buscador y selecciónalo de la lista.'); return; }
  const inv = await getInventario(localIdx);
  const prod = inv.find(p => p.id === pid);
  if (!prod) { showModalError('Producto no encontrado', 'El producto seleccionado no existe en el inventario de este local.', '¿Qué hacer? Verifica que el producto esté dado de alta en el inventario o agrégalo desde el buscador de ventas.'); return; }
  if (prod.qty < qty) { showModalError('Stock insuficiente', `Solo hay ${prod.qty} unidades disponibles de "${prod.nombre}".`, '¿Qué hacer? Reduce la cantidad a vender, o ve a Inventario y agrega un nuevo lote con más unidades.'); return; }
  const fechaInput = document.getElementById('v-fecha').value;
  const fechaFinal = fechaInput ? new Date(fechaInput).toISOString() : new Date().toISOString();
  const venta = { localIdx, producto: prod.nombre, productoId: pid, qty, precio, total: qty * precio, fecha: fechaFinal };
  if (firebaseOk) {
    const { collection, addDoc, doc, updateDoc, increment } = window._fs;
    await addDoc(collection(db, 'ventas'), venta);
    await updateDoc(doc(db, 'inventario', pid), { qty: increment(-qty) });
  } else {
    venta.id = Date.now().toString();
    window._localData.ventas.push(venta);
    prod.qty -= qty;
    window._saveLocal();
  }
  await logHistorial({ tipo: 'venta', localIdx, usuario: currentUser.nombre, descripcion: `Venta: ${qty}x ${prod.nombre} — $${venta.total.toFixed(2)}` });
  document.getElementById('v-buscar').value = '';
  document.getElementById('v-producto').value = '';
  document.getElementById('v-qty').value = '';
  document.getElementById('v-precio').value = '';
  document.getElementById('v-fecha').value = '';
  document.getElementById('v-dropdown').style.display = 'none';
  renderVentas();
  showModalOk(
    '¡Venta registrada!',
    `${qty}x ${prod.nombre} — Total: $${venta.total.toFixed(2)}`,
    '🛒'
  );
};

window.eliminarVenta = async function(vid) {
  if (currentUser.rol !== 'admin') { showModalError('Sin permiso', 'Solo el administrador puede eliminar ventas registradas.', '¿Qué hacer? Contacta al administrador si necesitas corregir un error en las ventas.'); return; }
  if (firebaseOk) {
    const { doc, deleteDoc } = window._fs;
    await deleteDoc(doc(db, 'ventas', vid));
  } else {
    window._localData.ventas = window._localData.ventas.filter(v => v.id !== vid);
    window._saveLocal();
  }
  renderVentas();
  showModalOk('Venta eliminada', 'La venta fue eliminada del historial correctamente.', '🗑');
};

window.eliminarProducto = async function(pid) {
  if (!confirm('¿Eliminar este producto del inventario?')) return;
  if (firebaseOk) {
    const { doc, deleteDoc } = window._fs;
    await deleteDoc(doc(db, 'inventario', pid));
  } else {
    window._localData.inventario[viewingLocalIdx] = (window._localData.inventario[viewingLocalIdx]||[]).filter(p => p.id !== pid);
    window._saveLocal();
  }
  await logHistorial({ tipo:'edicion', localIdx:viewingLocalIdx, usuario:currentUser.nombre, descripcion:`Producto eliminado del inventario de ${LOCAL_NAMES[viewingLocalIdx]}` });
  pushAlerta(`${currentUser.nombre} eliminó un producto en ${LOCAL_NAMES[viewingLocalIdx]}`, 'error');
  invalidarCacheProductos();
  window._currentInv = null; // force re-fetch
  const searchEl2 = document.getElementById('inv-search');
  if (searchEl2 && searchEl2.value.trim()) window.filtrarInventario(searchEl2.value);
  else renderInventario(true);
  showModalOk('Producto eliminado', 'El producto fue eliminado del inventario correctamente.', '🗑');
};

// ================================================================
// BÚSQUEDA DE PRODUCTOS EN VENTAS
// ================================================================
window._vtaInv = [];

window.buscarProductoVenta = function(query) {
  const dd = document.getElementById('v-dropdown');
  if (!query.trim()) { dd.style.display = 'none'; return; }
  // Search ALL products — including out-of-stock — by name OR sku
  const allMatches = (window._vtaInv || []).filter(p =>
    p.nombre.toLowerCase().includes(query.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10);
  if (!allMatches.length) {
    dd.innerHTML = `<div style="padding:12px 14px;cursor:pointer;"
        onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''"
        onclick="mostrarModalProductoNuevo('${query.replace(/'/g,"\'")}')">
        <p style="font-size:13px;font-weight:500;color:var(--amber);">⚠ Producto no encontrado</p>
        <p style="font-size:11px;color:var(--muted);margin-top:3px;">¿Deseas agregar "<strong style="color:var(--text);">${query}</strong>" al inventario?</p>
      </div>`;
    dd.style.display = 'block'; return;
  }
  dd.innerHTML = allMatches.map(p => {
    const sinStock = p.qty <= 0;
    return `<div onclick="${sinStock ? `mostrarModalSinStock('${p.id}','${p.nombre.replace(/'/g,"\'")}')` : `seleccionarProductoVenta('${p.id}','${p.nombre.replace(/'/g,"\'")}',${p.precio},${p.qty})`}"
      style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);opacity:${sinStock?'0.7':'1'};"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:500;">${p.nombre}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          ${sinStock ? '<span style="font-size:10px;background:rgba(239,68,68,.15);color:#ef4444;padding:2px 7px;border-radius:4px;font-weight:500;">Sin stock</span>' : ''}
          <span style="font-size:11px;color:var(--muted);">$${(p.precio||0).toFixed(2)}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:3px;">
        ${p.sku ? `<span style="font-size:10px;color:var(--accent);background:rgba(59,130,246,.1);padding:1px 6px;border-radius:4px;">${p.sku}</span>` : ''}
        <span style="font-size:10px;color:${sinStock?'#ef4444':'var(--muted)'};">stock: ${p.qty}</span>
      </div>
    </div>`;
  }).join('');
  dd.style.display = 'block';
};

window.seleccionarProductoVenta = function(id, nombre, precio, qty) {
  document.getElementById('v-buscar').value = nombre;
  document.getElementById('v-producto').value = id;
  document.getElementById('v-precio').value = precio.toFixed(2);
  document.getElementById('v-dropdown').style.display = 'none';
  document.getElementById('v-qty').focus();
};

document.addEventListener('click', e => {
  const dd = document.getElementById('v-dropdown');
  if (dd && !e.target.closest('#v-buscar') && !e.target.closest('#v-dropdown')) dd.style.display = 'none';
});

let _modalProdId = null;
window.mostrarModalSinStock = function(pid, nombre) {
  _modalProdId = pid;
  document.getElementById('modal-prod-nombre').textContent = nombre;
  document.getElementById('modal-qty').value = 1;
  const modal = document.getElementById('modal-sin-stock');
  modal.style.display = 'flex';
};

window.cerrarModalSinStock = function() {
  const m = document.getElementById('modal-sin-stock');
  m.style.display = 'none';
  m.style.removeProperty('display'); // clear any lingering flex
  m.style.display = 'none';
  _modalProdId = null;
};

window.confirmarAgregarStock = async function() {
  if (!_modalProdId) return;
  const qty = parseInt(document.getElementById('modal-qty').value) || 1;
  if (firebaseOk) {
    const { doc, updateDoc, increment } = window._fs;
    await updateDoc(doc(db, 'inventario', _modalProdId), { qty: increment(qty) });
  } else {
    const inv = window._localData.inventario[viewingLocalIdx] || [];
    const p = inv.find(x => x.id === _modalProdId);
    if (p) { p.qty += qty; window._saveLocal(); }
  }
  // Also update _vtaInv in memory
  const p = (window._vtaInv||[]).find(x => x.id === _modalProdId);
  if (p) p.qty += qty;
  const nombre = document.getElementById('modal-prod-nombre').textContent;
  await logHistorial({ tipo:'edicion', localIdx: currentUser.localIdx ?? viewingLocalIdx,
    usuario: currentUser.nombre, descripcion: `Stock actualizado: +${qty} unidades a "${nombre}" desde ventas` });
  pushAlerta(`Stock actualizado: +${qty} uds a "${nombre}"`, 'ok');
  cerrarModalSinStock();
  showModalOk('Stock actualizado', `Se agregaron ${qty} unidades a "${nombre}" desde el módulo de ventas.`, '📦');
  renderVentas();
};

// Close modal on backdrop click
document.getElementById('modal-sin-stock')?.addEventListener('click', function(e) {
  if (e.target === this) cerrarModalSinStock();
});

window.mostrarModalProductoNuevo = async function(queryStr) {
  // Close search dropdown
  const dd = document.getElementById('v-dropdown');
  if (dd) dd.style.display = 'none';
  // Populate cat select
  const cats = await getCategorias();
  const mnCat = document.getElementById('mn-cat');
  mnCat.innerHTML = '<option value="">Sin categoría</option>' +
    cats.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
  // Pre-fill nombre from search query
  document.getElementById('mn-nombre').value = queryStr || '';
  document.getElementById('mn-sku').value = '';
  document.getElementById('mn-precio').value = '';
  document.getElementById('mn-qty').value = '0';
  document.getElementById('mn-min').value = '0';
  document.getElementById('mn-costo').value = '';
  const modal = document.getElementById('modal-prod-nuevo');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('mn-sku').focus(), 100);
};

window.cerrarModalProdNuevo = function() {
  document.getElementById('modal-prod-nuevo').style.display = 'none';
};

window.confirmarProdNuevo = async function() {
  const sku    = document.getElementById('mn-sku').value.trim();
  const nombre = document.getElementById('mn-nombre').value.trim();
  const cat    = document.getElementById('mn-cat').value;
  const precio = parseFloat(document.getElementById('mn-precio').value) || 0;
  // Validate required
  if (!sku)    { document.getElementById('mn-sku').style.borderColor='var(--red)'; showModalError('SKU obligatorio', 'El código o SKU del producto es requerido.', '¿Qué hacer? Asigna un código único al producto, por ejemplo: BIM-001, GAM-600, etc.'); return; }
  if (!nombre) { document.getElementById('mn-nombre').style.borderColor='var(--red)'; showModalError('Nombre obligatorio', 'El nombre del producto es requerido.', '¿Qué hacer? Escribe el nombre del producto en el campo correspondiente.'); return; }
  if (!precio) { document.getElementById('mn-precio').style.borderColor='var(--red)'; showModalError('Precio obligatorio', 'El precio de venta es requerido para registrar el producto.', '¿Qué hacer? Ingresa el precio de venta en pesos. Puedes actualizar el costo después desde el inventario.'); return; }
  if (!cat)    { document.getElementById('mn-cat').style.borderColor='var(--red)'; showModalError('Categoría obligatoria', 'Debes asignar una categoría al producto.', '¿Qué hacer? Selecciona una categoría de la lista, o créala primero en la pestaña Categorías.'); return; }

  const localIdx = currentUser.localIdx ?? viewingLocalIdx;
  const data = {
    sku, nombre, cat,
    precio,
    qty:   parseInt(document.getElementById('mn-qty').value)   || 0,
    min:   parseInt(document.getElementById('mn-min').value)   || 0,
    costo: parseFloat(document.getElementById('mn-costo').value) || 0,
    localIdx,
    creadoEn: new Date().toISOString()
  };

  if (firebaseOk) {
    const { collection, addDoc } = window._fs;
    await addDoc(collection(db, 'inventario'), data);
  } else {
    data.id = Date.now().toString();
    if (!window._localData.inventario[localIdx]) window._localData.inventario[localIdx] = [];
    window._localData.inventario[localIdx].push(data);
    window._saveLocal();
  }

  await logHistorial({ tipo:'producto_agregado', localIdx, usuario: currentUser.nombre,
    descripcion: `Producto "${nombre}" (${sku}) agregado desde búsqueda de ventas` });
  invalidarCacheProductos();
  cerrarModalProdNuevo();
  showModalOk('Producto agregado al inventario', `"${nombre}" (${sku}) fue registrado correctamente.`, '✅');
  // Refresh _vtaInv and show in search
  const inv = await getInventario(localIdx);
  window._vtaInv = inv;
  const buscarEl = document.getElementById('v-buscar');
  if (buscarEl && buscarEl.value) window.buscarProductoVenta(buscarEl.value);
};

document.getElementById('modal-prod-nuevo')?.addEventListener('click', function(e) {
  if (e.target === this) cerrarModalProdNuevo();
});

// ================================================================
// SUGERENCIA ANTI-DUPLICADOS AL DAR DE ALTA
// ================================================================
window._allProductNames = [];

window.sugerirProducto = async function(query) {
  const sug = document.getElementById('i-suggest');
  if (!query.trim() || query.length < 2) { sug.style.display = 'none'; return; }
  if (!window._allProductNames.length) {
    const allInv = await Promise.all([0,1,2].map(li => getInventario(li)));
    const names = new Map();
    allInv.forEach((inv, li) => {
      inv.forEach(p => {
        const key = p.nombre.toLowerCase();
        if (!names.has(key)) names.set(key, { nombre: p.nombre, cat: p.cat||'', costo: p.costo||0, precio: p.precio||0, locales: [] });
        names.get(key).locales.push(LOCAL_NAMES[li]);
      });
    });
    window._allProductNames = [...names.values()];
  }
  const matches = window._allProductNames.filter(p => p.nombre.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  if (!matches.length) { sug.style.display = 'none'; return; }
  sug.innerHTML = matches.map(p => `
    <div onclick="autocompletarProducto('${p.nombre.replace(/'/g,"\'")}','${(p.cat||'').replace(/'/g,"\'")}',${p.costo},${p.precio})"
      style="padding:9px 14px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
      <div style="font-weight:500;">${p.nombre}</div>
      <div style="color:var(--muted);font-size:11px;margin-top:2px;">${p.cat||''} · $${p.precio.toFixed(2)} · en: ${p.locales.join(', ')}</div>
    </div>`).join('');
  sug.style.display = 'block';
};

window.autocompletarProducto = function(nombre, cat, costo, precio) {
  document.getElementById('i-nombre').value = nombre;
  document.getElementById('i-cat').value = cat;
  document.getElementById('i-costo').value = costo.toFixed(2);
  document.getElementById('i-precio').value = precio.toFixed(2);
  document.getElementById('i-suggest').style.display = 'none';
  document.getElementById('i-qty').focus();
};

document.addEventListener('click', e => {
  const sug = document.getElementById('i-suggest');
  if (sug && !e.target.closest('#i-nombre') && !e.target.closest('#i-suggest')) sug.style.display = 'none';
});

function invalidarCacheProductos() { window._allProductNames = []; }

// ================================================================
// TRASPASOS
// ================================================================
// tspLocalIdx declared at module scope
window.switchTspLocal = function(idx) { tspLocalIdx = idx; renderTraspasos(); };

async function renderTraspasos() {
  const isAdmin = currentUser.rol === 'admin';
  if (!isAdmin) tspLocalIdx = currentUser.localIdx ?? 0;
  const tabsEl = document.getElementById('tsp-local-tabs');
  if (isAdmin) {
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = LOCAL_NAMES.map((n,i) => `<button class="local-tab ${i===tspLocalIdx?'active':''}" onclick="switchTspLocal(${i})">${n}</button>`).join('');
  } else { tabsEl.style.display = 'none'; }
  document.getElementById('traspaso-form-card').style.display = isAdmin ? 'none' : 'block';
  const localIdx = tspLocalIdx;
  document.getElementById('t-origen').value = LOCAL_NAMES[localIdx];
  const destSel = document.getElementById('t-destino');
  destSel.innerHTML = '<option value="">Selecciona local...</option>' +
    LOCAL_NAMES.map((n, i) => i !== localIdx ? `<option value="${i}">${n}</option>` : '').join('');
  const inv = await getInventario(localIdx);
  const prodSel = document.getElementById('t-producto');
  prodSel.innerHTML = '<option value="">Selecciona...</option>' +
    inv.map(p => `<option value="${p.id}">${p.nombre} (stock: ${p.qty})</option>`).join('');
  const traspasos = await getTraspasos(localIdx);
  const tbody = document.getElementById('traspaso-tbody');
  if (!traspasos.length) { tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Sin traspasos</td></tr>`; return; }
  tbody.innerHTML = traspasos.map(t => `
    <tr>
      <td style="font-size:12px;color:var(--muted)">${fmtDate(t.fecha)}</td>
      <td><span class="badge badge-ok">${LOCAL_NAMES[t.origenIdx]}</span></td>
      <td><span class="badge badge-warn">${LOCAL_NAMES[t.destinoIdx]}</span></td>
      <td>${t.producto}</td>
      <td style="font-weight:500;">${t.qty}</td>
      <td style="color:var(--muted);font-size:12px;">${t.motivo||'—'}</td>
    </tr>`).join('');
}

window.registrarTraspaso = async function() {
  const origenIdx = currentUser.rol === 'admin' ? tspLocalIdx : (currentUser.localIdx ?? 0);
  const destinoIdx = parseInt(document.getElementById('t-destino').value);
  const pid = document.getElementById('t-producto').value;
  const qty = parseInt(document.getElementById('t-qty').value) || 0;
  const motivo = document.getElementById('t-motivo').value.trim();
  if (isNaN(destinoIdx)) { showModalError('Local destino requerido', 'Debes seleccionar el local al que quieres enviar el producto.', '¿Qué hacer? Elige un local destino diferente al tuyo en el selector.'); return; }
  if (!pid) { showModalError('Producto requerido', 'Debes seleccionar el producto a traspasar.', '¿Qué hacer? Elige el producto de la lista desplegable de inventario disponible.'); return; }
  if (qty < 1) { showModalError('Cantidad inválida', 'La cantidad debe ser un número mayor a 0.', '¿Qué hacer? Ingresa cuántas unidades deseas enviar al otro local.'); return; }
  const inv = await getInventario(origenIdx);
  const prod = inv.find(p => p.id === pid);
  if (!prod) { showModalError('Producto no encontrado', 'El producto seleccionado no pudo ser localizado en el inventario.', '¿Qué hacer? Recarga la página y vuelve a intentarlo. Si el problema persiste, contacta al administrador.'); return; }
  if (prod.qty < qty) { showModalError('Stock insuficiente para traspaso', `Solo hay ${prod.qty} unidades disponibles para traspasar.`, '¿Qué hacer? Reduce la cantidad o agrega más unidades al inventario desde la sección de Lotes.'); return; }
  const invDestino = await getInventario(destinoIdx);
  const prodDestino = invDestino.find(p => p.nombre === prod.nombre);
  const traspaso = { origenIdx, destinoIdx, producto: prod.nombre, productoId: pid, qty, motivo, fecha: new Date().toISOString() };
  if (firebaseOk) {
    const { collection, addDoc, doc, updateDoc, increment } = window._fs;
    await addDoc(collection(db, 'traspasos'), traspaso);
    await updateDoc(doc(db, 'inventario', pid), { qty: increment(-qty) });
    if (prodDestino) await updateDoc(doc(db, 'inventario', prodDestino.id), { qty: increment(qty) });
    else await addDoc(collection(db, 'inventario'), { ...prod, id: undefined, localIdx: destinoIdx, qty });
  } else {
    traspaso.id = Date.now().toString();
    window._localData.traspasos.push(traspaso);
    prod.qty -= qty;
    if (prodDestino) prodDestino.qty += qty;
    else window._localData.inventario[destinoIdx].push({ ...prod, id: Date.now().toString()+'_d', localIdx: destinoIdx, qty });
    window._saveLocal();
  }
  await logHistorial({ tipo: 'traspaso', localIdx: origenIdx, destinoIdx, usuario: currentUser.nombre,
    descripcion: `Traspaso: ${qty}x "${prod.nombre}" de ${LOCAL_NAMES[origenIdx]} → ${LOCAL_NAMES[destinoIdx]}. Motivo: ${motivo||'No especificado'}` });
  document.getElementById('t-qty').value = '';
  document.getElementById('t-motivo').value = '';
  renderTraspasos();
  showModalOk(
    '¡Traspaso registrado!',
    `${qty}x "${prod.nombre}" enviado de ${LOCAL_NAMES[origenIdx]} → ${LOCAL_NAMES[destinoIdx]}. Motivo: ${motivo||'No especificado'}`,
    '🔄'
  );
};

// ================================================================
// HISTORIAL
// ================================================================
let histLocalIdx = null;
window.switchHistLocal = function(idx) { histLocalIdx = idx; renderHistorial(); };

const HIST_COLORS = { venta:'#10b981', traspaso:'#f59e0b', producto_agregado:'#3b82f6', edicion:'#8b5cf6', importacion:'#06b6d4', default:'#6b7280' };
const HIST_LABELS = { venta:'Venta', traspaso:'Traspaso', producto_agregado:'Producto', edicion:'Edición', importacion:'Importación' };

async function renderHistorial() {
  const isAdmin = currentUser.rol === 'admin';
  const localFilter = isAdmin ? histLocalIdx : currentUser.localIdx;
  const tabsEl = document.getElementById('hist-local-tabs');
  if (isAdmin) {
    tabsEl.innerHTML = `<button class="local-tab ${histLocalIdx===null?'active':''}" onclick="switchHistLocal(null)">Todos</button>` +
      LOCAL_NAMES.map((n,i) => `<button class="local-tab ${histLocalIdx===i?'active':''}" onclick="switchHistLocal(${i})">${n}</button>`).join('');
  } else { tabsEl.innerHTML = ''; }
  const hist = await getHistorial(localFilter);
  const container = document.getElementById('hist-list');
  if (!hist.length) { container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px;font-size:13px;">Sin movimientos</p>'; return; }
  container.innerHTML = hist.slice(0, 80).map(h => {
    const color = HIST_COLORS[h.tipo] || HIST_COLORS.default;
    const label = HIST_LABELS[h.tipo] || h.tipo;
    const localName = h.localIdx !== undefined ? LOCAL_NAMES[h.localIdx] : '';
    const usuario = h.usuario ? ` · ${h.usuario}` : '';
    return `<div class="hist-item">
      <div class="hist-dot" style="background:${color};margin-top:6px;"></div>
      <div class="hist-body">
        <strong><span class="badge" style="background:${color}22;color:${color};margin-right:8px;">${label}</span>${h.descripcion}</strong>
        <p>${localName}${usuario} · ${fmtDate(h.fecha)}</p>
      </div>
    </div>`;
  }).join('');
}

async function logHistorial(data) {
  const entry = { ...data, usuario: data.usuario || (currentUser ? currentUser.nombre : ''), fecha: new Date().toISOString() };
  if (firebaseOk) {
    const { collection, addDoc } = window._fs;
    await addDoc(collection(db, 'historial'), entry);
  } else {
    entry.id = Date.now().toString();
    if (!window._localData.historial) window._localData.historial = [];
    window._localData.historial.push(entry);
    window._saveLocal();
  }
}

// ================================================================
// COMPARAR
// ================================================================
async function renderComparar() {
  const isAdmin = currentUser.rol === 'admin';
  const hoy = new Date().toDateString();
  const resumen = await Promise.all(LOCAL_NAMES.map(async (nombre, i) => {
    const inv = await getInventario(i);
    const vtas = await getVentas(i);
    const totalVentas = vtas.reduce((a,v) => a + v.total, 0);
    const hoyVentas = vtas.filter(v => { try { return (v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha)).toDateString() === hoy; } catch(e){return false;} }).reduce((a,v) => a+v.total,0);
    const costMap = {}; inv.forEach(p => { costMap[p.nombre.toLowerCase()] = p.costo||0; });
    const totalGanancia = vtas.reduce((a,v) => a + ((v.precio-(costMap[v.producto?.toLowerCase()]||0))*v.qty), 0);
    const hoyGanancia = vtas.filter(v => { try { return (v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha)).toDateString() === hoy; } catch(e){return false;} }).reduce((a,v) => a+((v.precio-(costMap[v.producto?.toLowerCase()]||0))*v.qty),0);
    const margenPct = totalVentas > 0 ? (totalGanancia/totalVentas*100) : 0;
    return { nombre, totalVentas, hoyVentas, totalGanancia, hoyGanancia, margenPct, productos: inv.length, stockBajo: inv.filter(p=>p.qty<=p.min).length, numVentas: vtas.length };
  }));
  const maxVentas = Math.max(...resumen.map(r=>r.totalVentas),1);
  const maxGanancia = Math.max(...resumen.map(r=>r.totalGanancia),1);
  if (isAdmin) {
    document.getElementById('compare-grid').innerHTML = resumen.map((r,i) => `
      <div class="compare-card">
        <h3><span class="avatar" style="width:28px;height:28px;font-size:11px;background:${LOCAL_COLORS[i]}22;color:${LOCAL_COLORS[i]};">${r.nombre.substring(0,2)}</span>${r.nombre}</h3>
        <div class="bar-row" style="margin-bottom:10px;"><div class="bar-meta"><span>Ventas totales</span><span>$${r.totalVentas.toFixed(2)}</span></div><div class="bar-bg"><div class="bar-fill" style="width:${(r.totalVentas/maxVentas*100).toFixed(1)}%;background:${LOCAL_COLORS[i]};"></div></div></div>
        <div class="bar-row"><div class="bar-meta"><span style="color:var(--green);">Ganancia total</span><span style="color:var(--green);">$${r.totalGanancia.toFixed(2)}</span></div><div class="bar-bg"><div class="bar-fill" style="width:${(r.totalGanancia/maxGanancia*100).toFixed(1)}%;background:var(--green);"></div></div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;">
          <div style="background:var(--bg3);border-radius:8px;padding:10px;"><p style="font-size:10px;color:var(--muted);">VENTAS HOY</p><p style="font-size:16px;font-family:'Syne',sans-serif;">$${r.hoyVentas.toFixed(2)}</p></div>
          <div style="background:var(--bg3);border-radius:8px;padding:10px;"><p style="font-size:10px;color:var(--green);">GANANCIA HOY</p><p style="font-size:16px;font-family:'Syne',sans-serif;color:var(--green);">$${r.hoyGanancia.toFixed(2)}</p></div>
          <div style="background:var(--bg3);border-radius:8px;padding:10px;"><p style="font-size:10px;color:var(--muted);">MARGEN</p><p style="font-size:16px;font-family:'Syne',sans-serif;">${r.margenPct.toFixed(1)}%</p></div>
          <div style="background:var(--bg3);border-radius:8px;padding:10px;"><p style="font-size:10px;color:${r.stockBajo>0?'var(--amber)':'var(--muted)'};">STOCK BAJO</p><p style="font-size:16px;font-family:'Syne',sans-serif;color:${r.stockBajo>0?'var(--amber)':'var(--green)'};">${r.stockBajo}</p></div>
        </div>
      </div>`).join('');
    document.getElementById('compare-bars').innerHTML = `
      <p style="font-size:11px;color:var(--muted);margin-bottom:12px;">VENTAS</p>
      ${resumen.map((r,i) => `<div class="bar-row" style="margin-bottom:10px;"><div class="bar-meta"><span>${r.nombre}</span><span>$${r.totalVentas.toFixed(2)}</span></div><div class="bar-bg" style="height:8px;border-radius:6px;"><div class="bar-fill" style="width:${(r.totalVentas/maxVentas*100).toFixed(1)}%;height:8px;border-radius:6px;background:${LOCAL_COLORS[i]};"></div></div></div>`).join('')}
      <p style="font-size:11px;color:var(--muted);margin:16px 0 12px;">GANANCIAS</p>
      ${resumen.map((r,i) => `<div class="bar-row" style="margin-bottom:10px;"><div class="bar-meta"><span>${r.nombre}</span><span style="color:var(--green);">$${r.totalGanancia.toFixed(2)}</span></div><div class="bar-bg" style="height:8px;border-radius:6px;"><div class="bar-fill" style="width:${(r.totalGanancia/maxGanancia*100).toFixed(1)}%;height:8px;border-radius:6px;background:var(--green);opacity:.75;"></div></div></div>`).join('')}`;
  } else {
    const r = resumen[currentUser.localIdx]; const i = currentUser.localIdx;
    document.getElementById('compare-grid').innerHTML = `
      <div class="compare-card" style="max-width:320px;">
        <h3><span class="avatar" style="width:28px;height:28px;font-size:11px;background:${LOCAL_COLORS[i]}22;color:${LOCAL_COLORS[i]};">${r.nombre.substring(0,2)}</span>${r.nombre}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
          <div style="background:var(--bg3);border-radius:8px;padding:14px;"><p style="font-size:10px;color:var(--muted);">VENTAS HOY</p><p style="font-size:20px;font-family:'Syne',sans-serif;">$${r.hoyVentas.toFixed(2)}</p></div>
          <div style="background:var(--bg3);border-radius:8px;padding:14px;"><p style="font-size:10px;color:var(--muted);">TRANSACCIONES HOY</p><p style="font-size:20px;font-family:'Syne',sans-serif;">${r.numVentas}</p></div>
          <div style="background:var(--bg3);border-radius:8px;padding:14px;"><p style="font-size:10px;color:var(--muted);">PRODUCTOS</p><p style="font-size:20px;font-family:'Syne',sans-serif;">${r.productos}</p></div>
          <div style="background:var(--bg3);border-radius:8px;padding:14px;"><p style="font-size:10px;color:${r.stockBajo>0?'var(--amber)':'var(--muted)'};">STOCK BAJO</p><p style="font-size:20px;font-family:'Syne',sans-serif;color:${r.stockBajo>0?'var(--amber)':'var(--green)'};">${r.stockBajo}</p></div>
        </div>
      </div>`;
    document.getElementById('compare-bars').innerHTML = '';
  }
}

// ================================================================
// CORTE DE CAJA
// ================================================================
async function renderCorte() {
  if (currentUser.rol === 'admin') {
    document.getElementById('corte-stats').innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px;font-size:13px;">El corte solo está disponible por local.</p>';
    return;
  }
  const localIdx = currentUser.localIdx ?? 0;
  const fechaInput = document.getElementById('corte-fecha');
  if (!fechaInput.value) {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset()*60000);
    fechaInput.value = local.toISOString().slice(0,10);
  }
  const fechaSel = fechaInput.value;
  fechaInput.onchange = () => renderCorte();
  const todasVtas = await getVentas(localIdx);
  const inv = await getInventario(localIdx);
  const vtasDia = todasVtas.filter(v => { try { const f = v.fecha?.toDate ? v.fecha.toDate().toISOString() : String(v.fecha); return f.slice(0,10) === fechaSel; } catch(e){return false;} });
  const totalDia = vtasDia.reduce((a,v) => a+v.total, 0);
  const numTx = vtasDia.length;
  const ticketProm = numTx > 0 ? totalDia/numTx : 0;
  document.getElementById('corte-stats').innerHTML = `
    <div class="stat-card"><div class="slabel">Total del día</div><div class="sval c-green">$${totalDia.toFixed(2)}</div></div>
    <div class="stat-card"><div class="slabel">Transacciones</div><div class="sval c-blue">${numTx}</div></div>
    <div class="stat-card"><div class="slabel">Ticket promedio</div><div class="sval">${numTx>0?'$'+ticketProm.toFixed(2):'—'}</div></div>
    <div class="stat-card"><div class="slabel">Productos distintos</div><div class="sval">${[...new Set(vtasDia.map(v=>v.producto))].length}</div></div>`;
  const prodDept = {}; inv.forEach(p => { prodDept[p.nombre.toLowerCase()] = p.cat||'Sin categoría'; });
  const depts = {};
  vtasDia.forEach(v => {
    const dept = prodDept[v.producto.toLowerCase()]||'Sin categoría';
    if (!depts[dept]) depts[dept] = { total:0, qty:0, txs:0 };
    depts[dept].total += v.total; depts[dept].qty += v.qty; depts[dept].txs++;
  });
  const deptRows = Object.entries(depts).sort((a,b) => b[1].total-a[1].total);
  const tbody = document.getElementById('corte-dept-tbody');
  if (!deptRows.length) { tbody.innerHTML = `<tr><td colspan="5" class="empty-row">Sin ventas</td></tr>`; document.getElementById('corte-detalle-tbody').innerHTML = `<tr><td colspan="6" class="empty-row">Sin ventas</td></tr>`; return; }
  tbody.innerHTML = deptRows.map(([dept,d]) => {
    const pct = totalDia > 0 ? (d.total/totalDia*100).toFixed(1) : '0.0';
    return `<tr><td><strong>${dept}</strong></td><td>${d.qty}</td><td>${d.txs}</td><td style="color:var(--green);font-weight:500;">$${d.total.toFixed(2)}</td><td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;background:rgba(255,255,255,.06);border-radius:4px;height:5px;"><div style="width:${pct}%;height:5px;border-radius:4px;background:var(--accent);"></div></div><span style="font-size:11px;color:var(--muted);min-width:36px;">${pct}%</span></div></td></tr>`;
  }).join('') + `<tr style="border-top:1px solid var(--border2);"><td style="font-weight:500;">TOTAL</td><td>${vtasDia.reduce((a,v)=>a+v.qty,0)}</td><td>${numTx}</td><td style="color:var(--green);font-weight:700;">$${totalDia.toFixed(2)}</td><td></td></tr>`;
  document.getElementById('corte-detalle-tbody').innerHTML = [...vtasDia].sort((a,b) => a.fecha.localeCompare(b.fecha)).map(v => {
    const dept = prodDept[v.producto.toLowerCase()]||'—';
    const hora = fmtDate(v.fecha).split(',')[1]?.trim()||'—';
    return `<tr><td style="color:var(--muted);font-size:12px;">${hora}</td><td>${v.producto}</td><td style="color:var(--muted);">${dept}</td><td>${v.qty}</td><td>$${v.precio.toFixed(2)}</td><td style="color:var(--green);font-weight:500;">$${v.total.toFixed(2)}</td></tr>`;
  }).join('');
}
window.imprimirCorte = function() { window.print(); };

// ================================================================
// MÉTRICAS MENSUALES
// ================================================================
async function guardarMetricaMes(localIdx, mes, data) {
  const key = `metricas_${localIdx}_${mes}`;
  const payload = { ...data, localIdx, mes, updatedAt: new Date().toISOString() };
  if (firebaseOk) {
    try { const { collection, doc, setDoc } = window._fs; await setDoc(doc(collection(db,'metricas'),key), payload); } catch(e) {}
  } else {
    if (!window._localData.metricas) window._localData.metricas = {};
    window._localData.metricas[key] = payload;
    window._saveLocal();
  }
}

async function getMetricas() {
  if (firebaseOk) {
    try { const { collection, getDocs } = window._fs; const snap = await getDocs(collection(db,'metricas')); return snap.docs.map(d => d.data()); } catch(e) { return []; }
  } else { return Object.values(window._localData.metricas||{}); }
}

window.renderDashHistorico = async function() {
  const metricas = await getMetricas();
  if (!metricas.length) { document.getElementById('dash-historico-tabla').innerHTML = '<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px;">Sin datos históricos aún</p>'; return; }
  const meses = [...new Set(metricas.map(m => m.mes))].sort().reverse();
  const sel = document.getElementById('dash-mes-sel');
  const curSel = sel.value || meses[0];
  sel.innerHTML = meses.map(m => `<option value="${m}" ${m===curSel?'selected':''}>${m}</option>`).join('');
  const mesSel = sel.value || meses[0];
  const mesMets = metricas.filter(m => m.mes === mesSel);
  const totalVentas = mesMets.reduce((a,m) => a+(m.ventas||0), 0);
  const totalGanancia = mesMets.reduce((a,m) => a+(m.ganancia||0), 0);
  const totalInversion = mesMets.reduce((a,m) => a+(m.inversion||0), 0);
  document.getElementById('dash-historico-tabla').innerHTML = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr><th style="text-align:left;padding:8px 12px;color:var(--muted);font-size:10px;text-transform:uppercase;border-bottom:1px solid var(--border);">Local</th><th style="text-align:right;padding:8px 12px;color:var(--muted);font-size:10px;text-transform:uppercase;border-bottom:1px solid var(--border);">Ventas</th><th style="text-align:right;padding:8px 12px;color:var(--muted);font-size:10px;text-transform:uppercase;border-bottom:1px solid var(--border);">Ganancia</th><th style="text-align:right;padding:8px 12px;color:var(--muted);font-size:10px;text-transform:uppercase;border-bottom:1px solid var(--border);">Inversión</th><th style="text-align:right;padding:8px 12px;color:var(--muted);font-size:10px;text-transform:uppercase;border-bottom:1px solid var(--border);">Margen</th></tr></thead><tbody>${LOCAL_NAMES.map((nombre,i) => { const m = mesMets.find(x=>x.localIdx===i)||{ventas:0,ganancia:0,inversion:0}; const margen = m.ventas>0?(m.ganancia/m.ventas*100).toFixed(1):'—'; return `<tr><td style="padding:10px 12px;border-bottom:1px solid var(--border);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${LOCAL_COLORS[i]};margin-right:8px;"></span>${nombre}</td><td style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:right;">$${(m.ventas||0).toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:right;color:var(--green);">$${(m.ganancia||0).toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:right;color:var(--amber);">$${(m.inversion||0).toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:right;">${margen}${margen!=='—'?'%':''}</td></tr>`; }).join('')}<tr style="font-weight:600;"><td style="padding:10px 12px;">TOTAL</td><td style="padding:10px 12px;text-align:right;">$${totalVentas.toFixed(2)}</td><td style="padding:10px 12px;text-align:right;color:var(--green);">$${totalGanancia.toFixed(2)}</td><td style="padding:10px 12px;text-align:right;color:var(--amber);">$${totalInversion.toFixed(2)}</td><td style="padding:10px 12px;text-align:right;">${totalVentas>0?(totalGanancia/totalVentas*100).toFixed(1)+'%':'—'}</td></tr></tbody></table></div>`;
};

// ================================================================
// REALTIME LISTENERS
// ================================================================
function setupListeners() {
  const { collection, onSnapshot } = window._fs;
  ['inventario','ventas','traspasos','historial','categorias'].forEach(col => {
    onSnapshot(collection(db, col), () => {
      renderSection(currentTab);
      if (col === 'categorias') poblarSelectCats();
    });
  });
}

// ================================================================
// LOTES POR PRODUCTO
// ================================================================
let _lotesProdId = null;
let _lotesProdNombre = null;

// Get all lotes for a product
async function getLotes(prodId) {
  if (firebaseOk) {
    try {
      const { collection, getDocs, query, orderBy } = window._fs;
      const snap = await getDocs(query(
        collection(db, 'inventario', prodId, 'lotes'),
        orderBy('caduca', 'asc')
      ));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      // Fallback without orderBy
      const { collection, getDocs } = window._fs;
      const snap = await getDocs(collection(db, 'inventario', prodId, 'lotes'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (a.caduca||'').localeCompare(b.caduca||''));
    }
  } else {
    const lotes = window._localData.lotes?.[prodId] || [];
    return [...lotes].sort((a,b) => (a.caduca||'').localeCompare(b.caduca||''));
  }
}

async function sincronizarQtyDesdeLotes(prodId) {
  const lotes = await getLotes(prodId);
  const totalQty = lotes.reduce((a,l) => a + (l.cantidad||0), 0);
  // Update in-memory cache immediately
  if (window._currentInv) {
    const cached = window._currentInv.find(p => p.id === prodId);
    if (cached) cached.qty = totalQty;
  }
  if (firebaseOk) {
    const { doc, updateDoc } = window._fs;
    await updateDoc(doc(db, 'inventario', prodId), { qty: totalQty });
  } else {
    const li = viewingLocalIdx;
    const inv = window._localData.inventario[li] || [];
    const p = inv.find(x => x.id === prodId);
    if (p) { p.qty = totalQty; window._saveLocal(); }
  }
  return totalQty;
}

window.abrirModalLotes = async function(prodId, prodNombre) {
  _lotesProdId = prodId;
  _lotesProdNombre = prodNombre;
  document.getElementById('lotes-prod-nombre').textContent = prodNombre;
  document.getElementById('lote-qty').value = '';
  document.getElementById('lote-caduca').value = '';
  // Clear cache for this product so we fetch fresh from Firebase on open
  if (window._lotesCache) delete window._lotesCache[prodId];
  await renderLotesList();
  document.getElementById('modal-lotes').style.display = 'flex';
};

window.cerrarModalLotes = function() {
  document.getElementById('modal-lotes').style.display = 'none';
  const closedProdId = _lotesProdId;
  _lotesProdId = null;
  // Refresh just the qty in cache from sincronized value, then re-render without re-fetch
  const searchEl = document.getElementById('inv-search');
  if (searchEl && searchEl.value.trim()) window.filtrarInventario(searchEl.value);
  else renderInventario();
};

// Render lotes list from in-memory cache (instant, no Firebase round-trip)
function renderLotesListFromCache(prodId) {
  const lotes = (window._lotesCache && window._lotesCache[prodId]) || [];
  _renderLotesDOM(lotes);
}

async function renderLotesList() {
  // Use cache if available for instant paint, then refresh from Firebase in background
  if (window._lotesCache && window._lotesCache[_lotesProdId]) {
    _renderLotesDOM(window._lotesCache[_lotesProdId]);
  }
  const lotes = await getLotes(_lotesProdId);
  // Update cache
  if (!window._lotesCache) window._lotesCache = {};
  window._lotesCache[_lotesProdId] = lotes;
  _renderLotesDOM(lotes);
}

function _renderLotesDOM(lotes) {
  const lista = document.getElementById('lotes-lista');
  if (!lista) return;
  const totalQty = lotes.reduce((a,l) => a + (l.cantidad||0), 0);

  if (!lotes.length) {
    lista.innerHTML = `
      <div style="text-align:center;padding:32px;color:var(--muted);">
        <p style="font-size:32px;margin-bottom:10px;">📦</p>
        <p style="font-size:13px;">Sin lotes registrados.</p>
        <p style="font-size:12px;margin-top:6px;">Agrega el primer lote abajo.</p>
      </div>`;
    return;
  }

  lista.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <p style="font-size:12px;color:var(--muted);">${lotes.length} lote${lotes.length!==1?'s':''}</p>
      <p style="font-size:13px;font-weight:600;">Total: <span style="color:var(--accent);">${totalQty} uds</span></p>
    </div>
    ${lotes.map(l => {
      const dias = diasParaCaducar(l.caduca);
      const urgent = dias <= 8;
      const caducado = dias < 0;
      return `<div style="background:var(--bg3);border:1px solid ${caducado?'rgba(239,68,68,.4)':urgent?'rgba(245,158,11,.3)':'var(--border)'};
        border-radius:10px;padding:14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;font-weight:700;font-family:'Syne',sans-serif;">${l.cantidad}</span>
            <span style="font-size:12px;color:var(--muted);">unidades</span>
          </div>
          ${badgeCaduca(dias)}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:var(--muted);">
            Caduca: <strong style="color:${caducado?'var(--red)':urgent?'var(--amber)':'var(--text)'};">${l.caduca||'Sin fecha'}</strong>
          </span>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="editarLote('${l.id}',${l.cantidad},'${l.caduca||''}')"
              style="font-size:11px;padding:4px 8px;">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarLote('${l.id}')"
              style="font-size:11px;padding:4px 8px;">✕</button>
          </div>
        </div>
        ${caducado ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(239,68,68,.1);border-radius:6px;font-size:11px;color:var(--red);">⚠ Este lote ya caducó — considera retirarlo del exhibidor</div>` : ''}
        ${urgent && !caducado ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(245,158,11,.08);border-radius:6px;font-size:11px;color:var(--amber);">💡 Próximo a caducar — ponlo al frente del exhibidor y considera una promoción (aprobación Meri)</div>` : ''}
      </div>`;
    }).join('')}`;
}

window.agregarLote = async function() {
  const qty = parseInt(document.getElementById('lote-qty').value) || 0;
  const caduca = document.getElementById('lote-caduca').value;
  if (qty < 1) { showModalError('Cantidad inválida', 'La cantidad del lote debe ser al menos 1 unidad.', '¿Qué hacer? Ingresa el número de piezas que recibiste en este lote.'); return; }
  if (!caduca) { showModalError('Fecha requerida', 'La fecha de caducidad es obligatoria para registrar un lote.', '¿Qué hacer? Revisa la etiqueta del producto y anota la fecha de caducidad que viene impresa.'); return; }

  const lote = { cantidad: qty, caduca, creadoEn: new Date().toISOString() };
  const prodId = _lotesProdId;

  // ── 1. Limpiar campos y mostrar toast inmediatamente ──
  document.getElementById('lote-qty').value = '';
  document.getElementById('lote-caduca').value = '';
  window.toast(`✓ Lote agregado: ${qty} uds · caduca ${caduca}`);

  // ── 2. Actualizar caché local en memoria al instante ──
  if (!window._lotesCache) window._lotesCache = {};
  if (!window._lotesCache[prodId]) window._lotesCache[prodId] = [];
  const loteOptimista = { ...lote, id: '_tmp_' + Date.now() };
  window._lotesCache[prodId].push(loteOptimista);
  window._lotesCache[prodId].sort((a,b) => (a.caduca||'').localeCompare(b.caduca||''));

  // Actualizar qty en caché del inventario
  if (window._currentInv) {
    const cached = window._currentInv.find(p => p.id === prodId);
    if (cached) cached.qty = (cached.qty || 0) + qty;
  }

  // ── 3. Re-renderizar el modal desde caché — sin esperar Firebase ──
  renderLotesListFromCache(prodId);

  // ── 4. Guardar en Firebase/localStorage en segundo plano ──
  if (firebaseOk) {
    const { collection, addDoc } = window._fs;
    addDoc(collection(db, 'inventario', prodId, 'lotes'), lote).then(ref => {
      // Reemplazar el id temporal con el real
      if (window._lotesCache[prodId]) {
        const tmp = window._lotesCache[prodId].find(l => l.id === loteOptimista.id);
        if (tmp) tmp.id = ref.id;
      }
    }).catch(err => {
      console.error('[LOTE] Error guardando en Firebase:', err);
      window.toast('⚠ Error al guardar el lote — reintentando...');
    });
    // Sincronizar qty y log en paralelo, sin bloquear UI
    sincronizarQtyDesdeLotes(prodId).then(newTotal => {
      logHistorial({ tipo:'edicion', localIdx: viewingLocalIdx, usuario: currentUser.nombre,
        descripcion: `Lote agregado: ${qty} uds de "${_lotesProdNombre}" (caduca: ${caduca}). Total: ${newTotal} uds` });
      pushAlerta(`Lote agregado: ${qty} uds de "${_lotesProdNombre}" caduca el ${caduca}`, 'ok');
    });
  } else {
    if (!window._localData.lotes) window._localData.lotes = {};
    if (!window._localData.lotes[prodId]) window._localData.lotes[prodId] = [];
    loteOptimista.id = Date.now().toString();
    window._localData.lotes[prodId].push({ ...lote, id: loteOptimista.id });
    window._saveLocal();
    sincronizarQtyDesdeLotes(prodId).then(newTotal => {
      logHistorial({ tipo:'edicion', localIdx: viewingLocalIdx, usuario: currentUser.nombre,
        descripcion: `Lote agregado: ${qty} uds de "${_lotesProdNombre}" (caduca: ${caduca}). Total: ${newTotal} uds` });
      pushAlerta(`Lote agregado: ${qty} uds de "${_lotesProdNombre}" caduca el ${caduca}`, 'ok');
    });
  }
};

window.editarLote = function(loteId, qty, caduca) {
  document.getElementById('lote-qty').value = qty;
  document.getElementById('lote-caduca').value = caduca;
  // Change button to update mode
  const btn = document.querySelector('[onclick="agregarLote()"]');
  if (btn) {
    btn.textContent = '✓ Actualizar';
    btn.setAttribute('onclick', `actualizarLote('${loteId}')`);
  }
};

window.actualizarLote = async function(loteId) {
  const qty = parseInt(document.getElementById('lote-qty').value) || 0;
  const caduca = document.getElementById('lote-caduca').value;
  if (qty < 1) { showModalError('Cantidad inválida', 'La cantidad del lote debe ser mayor a 0.', '¿Qué hacer? Ingresa la cantidad correcta para este lote.'); return; }
  if (!caduca) { showModalError('Fecha requerida', 'La fecha de caducidad no puede estar vacía.', '¿Qué hacer? Ingresa la fecha de caducidad del producto.'); return; }

  if (firebaseOk) {
    const { doc, updateDoc } = window._fs;
    await updateDoc(doc(db, 'inventario', _lotesProdId, 'lotes', loteId), { cantidad: qty, caduca });
  } else {
    const lotes = window._localData.lotes?.[_lotesProdId] || [];
    const l = lotes.find(x => x.id === loteId);
    if (l) { l.cantidad = qty; l.caduca = caduca; window._saveLocal(); }
  }

  await sincronizarQtyDesdeLotes(_lotesProdId);
  // Reset button
  const btn = document.querySelector(`[onclick="actualizarLote('${loteId}')"]`);
  if (btn) { btn.textContent = '+ Agregar'; btn.setAttribute('onclick','agregarLote()'); }
  document.getElementById('lote-qty').value = '';
  document.getElementById('lote-caduca').value = '';
  await renderLotesList();
  window.toast('✓ Lote actualizado');
};

window.eliminarLote = async function(loteId) {
  const prodId = _lotesProdId;

  // ── 1. Quitar del caché al instante y re-renderizar ──
  if (window._lotesCache && window._lotesCache[prodId]) {
    const removed = window._lotesCache[prodId].find(l => l.id === loteId);
    window._lotesCache[prodId] = window._lotesCache[prodId].filter(l => l.id !== loteId);
    // Actualizar qty en caché del inventario
    if (removed && window._currentInv) {
      const cached = window._currentInv.find(p => p.id === prodId);
      if (cached) cached.qty = Math.max(0, (cached.qty || 0) - (removed.cantidad || 0));
    }
    renderLotesListFromCache(prodId);
  }
  window.toast('✓ Lote eliminado — stock recalculado');

  // ── 2. Borrar en Firebase/localStorage en segundo plano ──
  if (firebaseOk) {
    const { doc, deleteDoc } = window._fs;
    deleteDoc(doc(db, 'inventario', prodId, 'lotes', loteId)).then(() => {
      sincronizarQtyDesdeLotes(prodId);
    });
  } else {
    const lotes = window._localData.lotes?.[prodId] || [];
    window._localData.lotes[prodId] = lotes.filter(l => l.id !== loteId);
    window._saveLocal();
    sincronizarQtyDesdeLotes(prodId);
  }
};

// Close modal on backdrop
document.getElementById('modal-lotes')?.addEventListener('click', function(e) {
  if (e.target === this) cerrarModalLotes();
});

// ================================================================
// CADUCIDAD
// ================================================================
function diasParaCaducar(fechaStr) {
  if (!fechaStr) return Infinity;
  const hoy = new Date();
  const hoyMid = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const parts = fechaStr.split('-');
  if (parts.length !== 3) return Infinity;
  const cad = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  return Math.round((cad - hoyMid) / (1000*60*60*24));
}

function badgeCaduca(dias) {
  // <0: caducado
  if (dias < 0)  return `<span style="background:rgba(139,0,0,.25);color:#ff4444;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">⛔ Caducado</span>`;
  // 0: hoy
  if (dias === 0) return `<span style="background:rgba(239,68,68,.25);color:#ef4444;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">🔴 ¡HOY!</span>`;
  // 1-7: sacar ya, urgente
  if (dias <= 7)  return `<span style="background:rgba(239,68,68,.15);color:#ef4444;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">🚨 ${dias}d — Sacar pronto</span>`;
  // 8-12: iniciar promoción
  if (dias <= 12) return `<span style="background:rgba(245,158,11,.15);color:var(--amber);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">⚠ ${dias}d — Promocionar</span>`;
  // >12: normal
  return `<span style="background:rgba(255,255,255,.06);color:var(--muted);padding:2px 8px;border-radius:20px;font-size:11px;">${dias}d</span>`;
}

async function getLotesACaducar(localIdx, dias = 30) {
  const inv = await getInventario(localIdx);
  // Fetch all lotes in parallel instead of one-by-one
  const lotesArr = await Promise.all(inv.map(p => getLotes(p.id)));
  const resultados = [];
  inv.forEach((p, idx) => {
    lotesArr[idx].forEach(l => {
      if (l.caduca && diasParaCaducar(l.caduca) <= dias) {
        resultados.push({ ...l, prodId: p.id, prodNombre: p.nombre, cat: p.cat||'', localIdx, _prod: p });
      }
    });
  });
  return resultados.sort((a,b) => diasParaCaducar(a.caduca) - diasParaCaducar(b.caduca));
}

async function getProductosACaducar(localIdx, dias = 30) {
  // Legacy: returns unique products that have at least one lot expiring soon
  const lotes = await getLotesACaducar(localIdx, dias);
  const seen = new Set();
  return lotes.filter(l => { if (seen.has(l.prodId)) return false; seen.add(l.prodId); return true; })
    .map(l => ({ id: l.prodId, nombre: l.prodNombre, cat: l.cat, caduca: l.caduca, qty: l._prod.qty, localIdx }));
}

let _cadLocalIdx = null; // null = all locals for admin
window.switchCadLocal = function(idx) { _cadLocalIdx = idx; renderCaducidad(); };

async function renderCaducidad() {
  const isAdmin = currentUser.rol === 'admin';
  const tabsEl = document.getElementById('cad-local-tabs');
  if (isAdmin) {
    tabsEl.innerHTML = `<button class="local-tab ${_cadLocalIdx===null?'active':''}" onclick="switchCadLocal(null)">Todos</button>` +
      LOCAL_NAMES.map((n,i) => `<button class="local-tab ${_cadLocalIdx===i?'active':''}" onclick="switchCadLocal(${i})">${n}</button>`).join('');
  } else {
    _cadLocalIdx = currentUser.localIdx;
    tabsEl.innerHTML = '';
  }

  const locales = _cadLocalIdx !== null ? [_cadLocalIdx] : [0,1,2];
  const lista = document.getElementById('cad-lista');
  lista.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">Cargando...</div>';

  let allLotes = [];
  for (const li of locales) {
    const lotes = await getLotesACaducar(li, 30);
    lotes.forEach(l => allLotes.push({ ...l, _localIdx: li }));
  }
  allLotes.sort((a,b) => diasParaCaducar(a.caduca) - diasParaCaducar(b.caduca));

  if (!allLotes.length) {
    lista.innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted);font-size:14px;">✅ Ningún lote caduca en los próximos 30 días</div>';
    return;
  }

  // Group by product for display
  const byProd = {};
  allLotes.forEach(l => {
    const key = l.prodId + '_' + l._localIdx;
    if (!byProd[key]) byProd[key] = { nombre: l.prodNombre, cat: l.cat, localIdx: l._localIdx, lotes: [] };
    byProd[key].lotes.push(l);
  });

  lista.innerHTML = Object.values(byProd).map(g => {
    const minDias = Math.min(...g.lotes.map(l => diasParaCaducar(l.caduca)));
    const urgent = minDias <= 8;
    return `<div style="background:var(--bg2);border:1px solid ${urgent?'rgba(245,158,11,.35)':'var(--border)'};border-radius:10px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <p style="font-weight:600;font-size:14px;">${g.nombre}</p>
          <p style="font-size:11px;color:var(--muted);margin-top:3px;">${LOCAL_NAMES[g.localIdx]} · ${g.cat||'Sin cat.'}</p>
        </div>
        <button onclick="abrirModalLotes('${g.lotes[0].prodId}','${g.nombre.replace(/'/g,"\'")}');cerrarModalCaduca && null;"
          class="btn btn-ghost btn-sm" style="font-size:11px;">Ver lotes</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${g.lotes.map(l => {
          const d = diasParaCaducar(l.caduca);
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--bg3);border-radius:6px;font-size:12px;">
            <span><strong>${l.cantidad}</strong> uds · caduca: ${l.caduca}</span>
            ${badgeCaduca(d)}
          </div>`;
        }).join('')}
      </div>
      ${urgent ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(245,158,11,.08);border-radius:6px;font-size:12px;color:var(--amber);">
        💡 Considera una promoción — recuerda aprobación de <strong>Meri</strong>
      </div>` : ''}
    </div>`;
  }).join('');
}

window.cerrarModalCaduca = function() {
  document.getElementById('modal-caduca').style.display = 'none';
  // Mark as seen today so it doesn't re-appear
  localStorage.setItem('caduca_seen', new Date().toDateString());
};

async function checkCaducidadAlert() {
  // Only show once per day
  if (localStorage.getItem('caduca_seen') === new Date().toDateString()) return;
  const localIdx = currentUser.localIdx ?? 0;
  const lotes = await getLotesACaducar(localIdx, 8);
  if (!lotes.length) return;

  // Deduplicate by product + show worst lote
  const seen = new Set();
  const lista = lotes.filter(l => { if(seen.has(l.prodId)) return false; seen.add(l.prodId); return true; })
    .map(l => {
      const dias = diasParaCaducar(l.caduca);
      const label = dias < 0 ? 'CADUCADO' : dias === 0 ? '¡HOY!' : `${dias} día${dias!==1?'s':''}`;
      return `<strong>${l.prodNombre}</strong> — ${label} · ${l.cantidad} uds (${l.caduca})`;
    }).join('<br>');

  document.getElementById('modal-caduca-lista').innerHTML = lista;
  document.getElementById('modal-caduca').style.display = 'flex';
}

// ================================================================
// CATEGORÍAS
// ================================================================
async function getCategorias() {
  if (firebaseOk) {
    try {
      const { collection, getDocs } = window._fs;
      const snap = await getDocs(collection(db, 'categorias'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { return []; }
  } else {
    return window._localData.categorias || [];
  }
}

async function renderCategorias() {
  const cats = await getCategorias();
  const lista = document.getElementById('cats-lista');
  if (!lista) return;
  if (!cats.length) {
    lista.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:16px;text-align:center;">Sin categorías aún</p>';
    return;
  }
  lista.innerHTML = cats.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;
      border-bottom:1px solid var(--border);gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="width:12px;height:12px;border-radius:50%;background:${c.color||'var(--accent)'};flex-shrink:0;"></span>
        <span style="font-size:13px;">${c.nombre}</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="eliminarCategoria('${c.id}')">✕</button>
    </div>`).join('');
  // Populate cat selects
  await poblarSelectCats();
}

async function poblarSelectCats() {
  const cats = await getCategorias();
  window._catsCache = cats; // cache for row selects
  const opts = '<option value="">Sin categoría</option>' +
    cats.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
  // Populate all cat selects
  ['i-cat','mn-cat'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = opts;
  });
}

window.agregarCategoria = async function() {
  const nombre = document.getElementById('cat-nombre').value.trim();
  if (!nombre) { showModalError('Nombre requerido', 'Debes escribir un nombre para la categoría.', '¿Qué hacer? Escribe el nombre de la categoría, por ejemplo: Bebidas, Botanas, Dulcería, etc.'); return; }
  const color = document.getElementById('cat-color').value || '#3b82f6';
  const data = { nombre, color, creadoEn: new Date().toISOString() };
  if (firebaseOk) {
    const { collection, addDoc } = window._fs;
    await addDoc(collection(db, 'categorias'), data);
  } else {
    if (!window._localData.categorias) window._localData.categorias = [];
  if (!window._localData.lotes) window._localData.lotes = {};
    data.id = Date.now().toString();
    window._localData.categorias.push(data);
    window._saveLocal();
  }
  document.getElementById('cat-nombre').value = '';
  window._catsCache = null; // invalidate so next render fetches fresh
  await poblarSelectCats();
  renderCategorias();
  showModalOk('Categoría creada', `La categoría "${nombre}" fue agregada y ya está disponible al registrar productos.`, '🏷');
};

window.eliminarCategoria = async function(cid) {
  if (firebaseOk) {
    const { doc, deleteDoc } = window._fs;
    await deleteDoc(doc(db, 'categorias', cid));
  } else {
    window._localData.categorias = (window._localData.categorias||[]).filter(c => c.id !== cid);
    window._saveLocal();
  }
  window._catsCache = null;
  await poblarSelectCats();
  renderCategorias();
  showModalOk('Categoría eliminada', 'La categoría fue eliminada. Los productos que la tenían asignada conservan su categoría anterior.', '🗑');
};

// ================================================================
// BOOT
// ================================================================
// ================================================================
// UTILS — toast + modales de confirmación
// ================================================================
window.toast = function(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
};

window._modalOkCallback = null;

window.showModalOk = function(titulo, msg, icon) {
  _showModal('modal-ok', icon||'✅', titulo, msg, 'var(--accent)');
};

window.showModalError = function(titulo, msg, detalle) {
  const fullMsg = detalle ? (msg + '\n\n' + detalle) : msg;
  _showModal('modal-ok', '❌', titulo, fullMsg, 'var(--red)');
};

window.showModalInfo = function(titulo, msg, icon) {
  _showModal('modal-ok', icon||'ℹ️', titulo, msg, 'var(--amber)');
};

function _showModal(id, icon, titulo, msg, color) {
  const m = document.getElementById(id);
  if (!m) { window.toast(titulo + ': ' + msg); return; }
  const iconEl = document.getElementById('modal-ok-icon');
  const tituloEl = document.getElementById('modal-ok-titulo');
  const msgEl = document.getElementById('modal-ok-msg');
  if (iconEl) iconEl.textContent = icon;
  if (tituloEl) { tituloEl.textContent = titulo; tituloEl.style.color = color; }
  if (msgEl) { msgEl.style.whiteSpace = 'pre-line'; msgEl.textContent = msg; }
  m.style.display = 'flex';
}

window.cerrarModalOk = function() {
  const m = document.getElementById('modal-ok');
  if (m) { m.style.display = 'none'; }
  const tituloEl = document.getElementById('modal-ok-titulo');
  if (tituloEl) tituloEl.style.color = '';
  if (window._modalOkCallback) { window._modalOkCallback(); window._modalOkCallback = null; }

};

function renderAlertas() {
  const badge = document.getElementById('alert-badge');
  const count = document.getElementById('alert-count');
  const list  = document.getElementById('alert-list');
  const noLeidas = (window._alertas||[]).filter(a => !a.leida).length;
  if (badge) { badge.textContent = noLeidas; badge.style.display = noLeidas > 0 ? 'flex' : 'none'; }
  if (count) { count.textContent = noLeidas; count.style.display = noLeidas > 0 ? 'flex' : 'none'; }
  if (!list) return;
  if (!(window._alertas||[]).length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px;">Sin alertas</p>';
    return;
  }
  const colors = { warn:'var(--amber)', error:'var(--red)', ok:'var(--green)', info:'var(--accent)' };
  list.innerHTML = (window._alertas||[]).slice(0,20).map(a => `
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);opacity:${a.leida?'0.5':'1'};">
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <span style="color:${colors[a.tipo]||colors.info};font-size:14px;">${a.tipo==='warn'?'⚠':'ℹ'}</span>
        <div><p style="font-size:12px;line-height:1.4;">${a.msg}</p>
          <p style="font-size:10px;color:var(--muted);margin-top:3px;">${fmtDate(a.fecha)}</p>
        </div>
      </div>
    </div>`).join('');
}

window.toggleAlertas = function() {
  const panel = document.getElementById('alert-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    (window._alertas||[]).forEach(a => a.leida = true);
    localStorage.setItem('mlc_alertas', JSON.stringify(window._alertas||[]));
    renderAlertas();
  }
};

window.limpiarAlertas = function() {
  window._alertas = [];
  localStorage.setItem('mlc_alertas', '[]');
  renderAlertas();
  const panel = document.getElementById('alert-panel');
  if (panel) panel.style.display = 'none';
};

// Close alert panel on outside click
document.addEventListener('click', e => {
  const panel = document.getElementById('alert-panel');
  if (panel && panel.style.display !== 'none') {
    if (!e.target.closest('#alert-bell') && !e.target.closest('#alert-panel')) {
      panel.style.display = 'none';
    }
  }
});

renderLoginUsers();
initFirebase();
