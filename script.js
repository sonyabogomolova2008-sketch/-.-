/* =========================================================
   Ключи, константы
   ========================================================= */
const K = {
  forms: 'cf_forms',
  cats: 'cf_categories',
  nextId: 'cf_nextId',
  admin: 'cf_admin',
  initialized: 'cf_initialized'
};
const ADMIN_DEFAULT = { login: 'admin', password: 'admin123' };
const PER_PAGE = 6;
const app = document.getElementById('app');

/* =========================================================
   Утилиты
   ========================================================= */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function now() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function ph(text, color) {
  color = color || '#2f5bea';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
    <rect width="800" height="500" fill="${color}"/>
    <text x="400" y="265" fill="#fff" font-family="Arial, sans-serif" font-size="52"
          font-weight="bold" text-anchor="middle">${esc(text)}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

async function hashPassword(pwd) {
  try {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { /* fallback */ }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < pwd.length; i++) {
    const ch = pwd.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'fb' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function validateImage(file) {
  const ok = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ok.includes(file.type)) return 'Недопустимый формат (только JPG, PNG, WEBP).';
  if (file.size > 500 * 1024) return 'Файл больше 500 КБ.';
  return null;
}

/* =========================================================
   Storage
   ========================================================= */
function getForms() {
  try { return JSON.parse(localStorage.getItem(K.forms) || '[]'); }
  catch { return []; }
}
function setForms(arr) {
  try { localStorage.setItem(K.forms, JSON.stringify(arr)); }
  catch (e) {
    toast('Превышен лимит хранилища. Удалите часть изображений.', 'error');
    throw e;
  }
}
function getCats() {
  try { return JSON.parse(localStorage.getItem(K.cats) || '[]'); }
  catch { return []; }
}
function setCats(arr) {
  try { localStorage.setItem(K.cats, JSON.stringify(arr)); }
  catch { toast('Ошибка сохранения', 'error'); }
}
function nextId() {
  const n = +(localStorage.getItem(K.nextId) || '1');
  localStorage.setItem(K.nextId, n + 1);
  return n;
}
function isAuthed() { return sessionStorage.getItem(K.admin) === '1'; }
function requireAuth() {
  if (!isAuthed()) { location.hash = '#/admin/login'; return false; }
  return true;
}

/* =========================================================
Демо-данные
   ========================================================= */
const SEED = [
  { title: 'Седан', category: 'Легковые',
    short: 'Классический трёхобъёмный кузов с отдельным багажником',
    desc: 'Седан — самый распространённый тип кузова легкового автомобиля. Имеет три чётко разделённых объёма: моторный отсек, пассажирский салон и багажник.\n\nОсобенности:\n• Отдельный багажник с крышкой\n• 4-5 мест\n• Комфорт и аэродинамика\n\nПримеры: Toyota Camry, Hyundai Sonata, Kia K5',
    color: '#2f5bea' },
  { title: 'Хэтчбек', category: 'Легковые',
    short: 'Укороченный кузов с задней дверью вместо багажника',
    desc: 'Хэтчбек — кузов с двумя объёмами, где багажник объединён с салоном, а задняя дверь открывается вместе со стеклом.\n\nОсобенности:\n• Компактность\n• Трансформируемый багажник\n• Экономичность\n\nПримеры: VW Golf, Ford Focus, Skoda Fabia',
    color: '#12b76a' },
  { title: 'Универсал', category: 'Легковые',
    short: 'Удлинённый кузов с багажником во всю высоту салона',
    desc: 'Универсал — разновидность хэтчбека с удлинённой задней частью. Крыша продолжается до задней двери, что даёт максимум пространства для груза.\n\nОсобенности:\n• Большой багажник\n• Полноценный задний ряд\n• Семейный автомобиль\n\nПримеры: Skoda Octavia Combi, Volvo V60, Lada Vesta SW',
    color: '#f79009' },
  { title: 'Купе', category: 'Легковые',
    short: 'Двухдверный кузов с покатой крышей',
    desc: 'Купе — спортивный двухдверный кузов со сдвинутой назад кабиной и покатой крышей. Часто используется в премиальных авто.\n\nОсобенности:\n• 2 двери\n• Пониженный центр тяжести\n• Спортивный дизайн\n\nПримеры: BMW 4 Series, Mercedes C-Class Coupe, Audi A5',
    color: '#7a5af8' },
  { title: 'Внедорожник (SUV)', category: 'Внедорожники',
    short: 'Высокий полный привод и большие колёса',
    desc: 'SUV (Sport Utility Vehicle) — универсальный автомобиль с повышенной проходимостью и высоким клиренсом. Может быть как рамным, так и несущим.\n\nОсобенности:\n• Полный привод\n• Большие колёса\n• Высокая посадка\n\nПримеры: Toyota Land Cruiser, BMW X5, Lada Niva',
    color: '#d92d20' },
  { title: 'Пикап', category: 'Грузовые',
    short: 'Кабина + открытая грузовая платформа',
    desc: 'Пикап — гибрид легкового и грузового автомобиля: закрытая кабина спереди, открытая платформа сзади.\n\nОсобенности:\n• Открытый кузов\n• Высокая грузоподъёмность\n• Часто полный привод\n\nПримеры: Ford F-150, Toyota Hilux, Mitsubishi L200',
    color: '#475467' }
];

async function init() {
  if (!localStorage.getItem(K.initialized)) {
    setCats(['Легковые', 'Внедорожники', 'Грузовые']);
    const forms = SEED.map((s, i) => ({
      id: i + 1,
      title: s.title,
      category: s.category,
      short_description: s.short,
      description: s.desc,
      main_image: ph(s.title, s.color),
      images: [
        ph(s.title + ' — вид 1', s.color),
        ph(s.title + ' — вид 2', s.color)
      ],
      views: Math.floor(Math.random() * 40) + 3,
      created_at: now(),
      updated_at: now()
    }));
    setForms(forms);
    localStorage.setItem(K.nextId, forms.length + 1);

    const adminHash = await hashPassword(ADMIN_DEFAULT.password);
    localStorage.setItem(K.admin, JSON.stringify({ login: ADMIN_DEFAULT.login, hash: adminHash }));
    localStorage.setItem(K.initialized, '1');
  }
  route();
}

/* =========================================================
   Роутер
   ========================================================= */
function route() {
  const hash = location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);

  document.querySelectorAll('.site-header nav a').forEach(a => a.classList.remove('active'));
  if (parts[0] === 'admin') document.getElementById('nav-admin').classList.add('active');
  else document.getElementById('nav-home').classList.add('active');

  window.scrollTo(0, 0);

  if (parts[0] === 'form' && parts[1]) { renderForm(+parts[1]); return; }

  if (parts[0] === 'admin') {
if (parts[1] === 'login') { renderAdminLogin(); return; }
    if (parts[1] === 'logout') {
      sessionStorage.removeItem(K.admin);
      toast('Вы вышли', 'success');
      location.hash = '#/';
      return;
    }
    if (!requireAuth()) return;

    if (parts[1] === 'forms') { renderAdminForms(); return; }
    if (parts[1] === 'categories') { renderAdminCategories(); return; }
    if (parts[1] === 'form' && parts[2] === 'add') { renderAdminForm(null); return; }
    if (parts[1] === 'form' && parts[2] === 'edit') { renderAdminForm(+parts[3]); return; }
    renderAdminDashboard();
    return;
  }

  renderHome();
}

/* =========================================================
   Каталог
   ========================================================= */
let state = { q: '', cat: '', page: 1 };

function renderHome() {
  state = { q: '', cat: '', page: 1 };
  app.innerHTML = `
    <div class="page-head">
      <h1>Справочник форм автомобилей</h1>
      <p>Типы кузова: описание, характеристики, фотографии</p>
    </div>
    <div class="toolbar">
      <input type="search" id="q" placeholder="🔍  Поиск по названию…">
      <select id="catSel"></select>
    </div>
    <div id="results"></div>
  `;

  document.getElementById('catSel').innerHTML =
    `<option value="">Все категории</option>` +
    getCats().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  document.getElementById('q').addEventListener('input', e => {
    state.q = e.target.value; state.page = 1; renderHomeList();
  });
  document.getElementById('catSel').addEventListener('change', e => {
    state.cat = e.target.value; state.page = 1; renderHomeList();
  });
  document.getElementById('results').addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    state.page = +btn.dataset.page;
    renderHomeList();
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  renderHomeList();
}

function renderHomeList() {
  const q = state.q.trim().toLowerCase();
  const cat = state.cat;

  const filtered = getForms().filter(f => {
    const matchQ = !q || (f.title || '').toLowerCase().includes(q);
    const matchC = !cat || f.category === cat;
    return matchQ && matchC;
  }).sort((a, b) => b.id - a.id);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  const results = document.getElementById('results');
  if (!pageItems.length) {
    results.innerHTML = `
      <div class="empty">
        <h2>Ничего не найдено</h2>
        <p>Попробуйте изменить запрос или категорию.</p>
      </div>`;
    return;
  }

  let html = '<div class="grid">';
  for (const f of pageItems) {
    html += `
      <a class="card" href="#/form/${f.id}">
        <div class="card-img"><img src="${f.main_image || ph('Нет фото')}" alt="${esc(f.title)}"></div>
        <div class="card-body">
          <span class="tag">${esc(f.category)}</span>
          <h3>${esc(f.title)}</h3>
          <p>${esc(f.short_description || '')}</p>
          <div class="card-foot">
            <span>👁 ${f.views || 0}</span>
            <span class="more">Подробнее →</span>
          </div>
        </div>
      </a>`;
  }
  html += '</div>' + paginationHtml(totalPages, state.page);
  results.innerHTML = html;
}

function paginationHtml(total, current) {
  if (total <= 1) return '';
  let html = '<div class="pagination">';
  html += `<button class="pg" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>←</button>`;
  let last = 0;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 2) {
      if (i - last > 1) html += '<span class="pg-dots">…</span>';
      html += `<button class="pg ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
last = i;
    }
  }
  html += `<button class="pg" data-page="${current + 1}" ${current === total ? 'disabled' : ''}>→</button>`;
  return html + '</div>';
}

/* =========================================================
   Просмотр записи
   ========================================================= */
function renderForm(id) {
  const forms = getForms();
  const idx = forms.findIndex(f => f.id === id);

  if (idx === -1) {
    app.innerHTML = `
      <div class="empty">
        <h2>Запись не найдена</h2>
        <p style="margin-top:12px"><a href="#/" class="btn">← Вернуться в каталог</a></p>
      </div>`;
    return;
  }

  forms[idx].views = (forms[idx].views || 0) + 1;
  setForms(forms);

  const f = forms[idx];
  const images = [f.main_image, ...(f.images || [])].filter(Boolean);
  const mainSrc = images[0] || ph('Нет фото');

  app.innerHTML = `
    <a href="#/" class="back-link">← Назад к каталогу</a>
    <div class="form-view-grid">
      <div class="gallery">
        <img id="mainImg" class="main-img" src="${mainSrc}" alt="${esc(f.title)}">
        <div class="thumbs">
          ${images.map((src, i) => `
            <button class="thumb ${i === 0 ? 'active' : ''}" data-src="${src}">
              <img src="${src}" alt="">
            </button>`).join('')}
        </div>
      </div>
      <div class="form-info">
        <span class="tag">${esc(f.category)}</span>
        <h1>${esc(f.title)}</h1>
        <p class="lead">${esc(f.short_description || '')}</p>
        <div class="form-stats">
          <span>👁 ${f.views} просмотров</span>
          <span>📅  ${esc(f.created_at)}</span>
        </div>
        <div class="desc">${esc(f.description || '')}</div>
      </div>
    </div>`;

  const thumbs = document.querySelectorAll('.thumb');
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      document.getElementById('mainImg').src = t.dataset.src;
      thumbs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
    });
  });
}

/* =========================================================
   Авторизация
   ========================================================= */
function renderAdminLogin() {
  app.innerHTML = `
    <div class="auth-wrap">
      <form class="auth-card" id="loginForm">
        <h2>Вход в админ-панель</h2>
        <p class="hint">По умолчанию: <b>admin</b> / <b>admin123</b></p>
        <div class="field">
          <label>Логин</label>
          <input name="login" required autofocus autocomplete="username">
        </div>
        <div class="field">
          <label>Пароль</label>
          <input name="password" type="password" required autocomplete="current-password">
        </div>
        <button class="btn primary" type="submit">Войти</button>
        <p class="err" id="err"></p>
      </form>
    </div>`;

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const login = (fd.get('login') || '').toString().trim();
    const password = (fd.get('password') || '').toString();
    const err = document.getElementById('err');
    err.textContent = '';

    let admin = null;
    try { admin = JSON.parse(localStorage.getItem(K.admin) || 'null'); } catch {}
    if (!admin) { err.textContent = 'Администратор не настроен.'; return; }

    const hash = await hashPassword(password);
    if (login === admin.login && hash === admin.hash) {
      sessionStorage.setItem(K.admin, '1');
      toast('Добро пожаловать!', 'success');
      location.hash = '#/admin';
    } else {
      err.textContent = 'Неверный логин или пароль';
    }
  });
}

/* =========================================================
   Админ-каркас
   ========================================================= */
function adminShell(content, active) {
  const items = [
    ['#/admin', 'Дашборд', 'dash'],
    ['#/admin/forms', 'Записи', 'forms'],
    ['#/admin/categories', 'Категории', 'cats']
  ];
  return `
<div class="admin-layout">
      <aside class="admin-nav">
        ${items.map(([href, label, key]) =>
          `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`).join('')}
        <a href="#/admin/logout" class="logout">Выйти</a>
      </aside>
      <div class="admin-content">${content}</div>
    </div>`;
}

function renderAdminDashboard() {
  const forms = getForms();
  const cats = getCats();
  const totalViews = forms.reduce((s, f) => s + (f.views || 0), 0);
  const last = [...forms].sort((a, b) => b.id - a.id).slice(0, 5);

  const recentRows = last.map(f => `
    <tr>
      <td>${esc(f.title)}</td>
      <td>${esc(f.category)}</td>
      <td>${f.views || 0}</td>
    </tr>`).join('');

  const content = `
    <h1>Дашборд</h1>
    <div class="stats-grid">
      <div class="stat-card"><div class="k">Всего форм</div><div class="v">${forms.length}</div></div>
      <div class="stat-card"><div class="k">Всего просмотров</div><div class="v">${totalViews}</div></div>
      <div class="stat-card"><div class="k">Категорий</div><div class="v">${cats.length}</div></div>
    </div>

    <h2>Последние добавленные</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Название</th><th>Категория</th><th>Просмотры</th></tr></thead>
        <tbody>${recentRows || '<tr><td colspan="3">Пока нет записей</td></tr>'}</tbody>
      </table>
    </div>

    <div class="actions-row">
      <a href="#/admin/form/add" class="btn primary">+ Добавить запись</a>
      <button class="btn danger" id="resetBtn">Сбросить демо-данные</button>
    </div>`;

  app.innerHTML = adminShell(content, 'dash');

  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (!confirm('Сбросить все данные?')) return;
    [K.forms, K.cats, K.nextId, K.admin, K.initialized].forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem(K.admin);
    await init();
    toast('Демо-данные восстановлены', 'success');
  });
}

/* =========================================================
   Список записей
   ========================================================= */
function renderAdminForms() {
  const forms = [...getForms()].sort((a, b) => b.id - a.id);

  const content = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; gap:10px; flex-wrap:wrap">
      <h1 style="margin:0">Записи (${forms.length})</h1>
      <a href="#/admin/form/add" class="btn primary">+ Добавить</a>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Фото</th><th>Название</th><th>Категория</th>
          <th>Просмотры</th><th>Дата</th><th>Действия</th>
        </tr></thead>
        <tbody>
          ${forms.map(f => `
            <tr>
              <td><img src="${f.main_image || ph('—')}" alt=""></td>
              <td><b>${esc(f.title)}</b></td>
              <td>${esc(f.category)}</td>
              <td>${f.views || 0}</td>
              <td>${esc(f.created_at)}</td>
              <td>
                <a href="#/form/${f.id}" class="btn sm" title="Открыть">👁</a>
                <a href="#/admin/form/edit/${f.id}" class="btn sm" title="Изменить">✎</a>
                <button class="btn sm danger" data-del="${f.id}" title="Удалить">🗑</button>
              </td>
            </tr>`).join('') || '<tr><td colspan="6">Пока нет записей</td></tr>'}
        </tbody>
      </table>
    </div>`;

  app.innerHTML = adminShell(content, 'forms');

  app.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = +btn.dataset.del;
      const f = getForms().find(x => x.id === id);
      if (!f) return;
      if (!confirm(`Удалить запись «${f.title}»?`)) return;
      setForms(getForms().filter(x => x.id !== id));
      toast('Запись удалена', 'success');
      renderAdminForms();
    });
  });
}

/* =========================================================
   Добавление / редактирование
========================================================= */
function renderAdminForm(id) {
  const isEdit = id != null;
  const existing = isEdit ? getForms().find(f => f.id === id) : null;

  if (isEdit && !existing) {
    app.innerHTML = adminShell('<div class="empty"><h2>Запись не найдена</h2></div>', 'forms');
    return;
  }

  const cats = getCats();
  if (!cats.length) {
    const content = `
      <h1>Новая запись</h1>
      <div class="empty">
        <h2>Сначала создайте категорию</h2>
        <p style="margin-bottom:16px">Без категорий нельзя добавить запись.</p>
        <a href="#/admin/categories" class="btn primary">Перейти к категориям</a>
      </div>`;
    app.innerHTML = adminShell(content, 'forms');
    return;
  }

  let mainImage = existing ? existing.main_image : null;
  let gallery = existing ? [...(existing.images || [])] : [];

  const content = `
    <h1>${isEdit ? 'Редактирование' : 'Новая запись'}</h1>
    <form class="form-grid" id="form">
      <div class="field">
        <label>Название *</label>
        <input name="title" required value="${existing ? esc(existing.title) : ''}">
      </div>
      <div class="field">
        <label>Категория *</label>
        <select name="category" required>
          ${cats.map(c => `<option value="${esc(c)}" ${existing && existing.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Краткое описание</label>
        <textarea name="short_description" rows="2">${existing ? esc(existing.short_description || '') : ''}</textarea>
      </div>
      <div class="field">
        <label>Полное описание</label>
        <textarea name="description" rows="7">${existing ? esc(existing.description || '') : ''}</textarea>
      </div>
      <div class="field">
        <label>Главное изображение</label>
        <input type="file" name="mainFile" accept="image/jpeg,image/png,image/webp">
        <div id="mainPreview"></div>
      </div>
      <div class="field">
        <label>Галерея</label>
        <input type="file" name="galleryFiles" accept="image/jpeg,image/png,image/webp" multiple>
        <div class="previews" id="galleryPreview"></div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn primary">${isEdit ? 'Сохранить' : 'Добавить'}</button>
        <a href="#/admin/forms" class="btn">Отмена</a>
      </div>
    </form>`;

  app.innerHTML = adminShell(content, 'forms');

  const mainPreview = document.getElementById('mainPreview');
  const galleryPreview = document.getElementById('galleryPreview');

  function renderMainPreview() {
    mainPreview.innerHTML = mainImage
      ? `<div class="img-prev"><img src="${mainImage}" alt=""><button type="button" class="x" data-rm-main>×</button></div>`
      : `<p>Не выбрано</p>`;
    const rm = mainPreview.querySelector('[data-rm-main]');
    if (rm) rm.onclick = () => { mainImage = null; renderMainPreview(); };
  }

  function renderGalleryPreview() {
    galleryPreview.innerHTML = gallery.map((src, i) =>
      `<div class="img-prev">
        <img src="${src}" alt="">
        <button type="button" class="x" data-rm-g="${i}">×</button>
      </div>`
    ).join('') || '<p style="color:var(--muted);font-size:13.5px">Пока нет изображений</p>';
    galleryPreview.querySelectorAll('[data-rm-g]').forEach(btn => {
      btn.onclick = () => {
        gallery.splice(+btn.dataset.rmG, 1);
        renderGalleryPreview();
      };
    });
  }

  renderMainPreview();
  renderGalleryPreview();

  document.querySelector('[name="mainFile"]').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateImage(file);
    if (err) { toast(err, 'error'); e.target.value = ''; return; }
    mainImage = await readFileAsDataURL(file);
    renderMainPreview();
  });

  document.querySelector('[name="galleryFiles"]').addEventListener('change', async e => {
for (const file of [...e.target.files]) {
      const err = validateImage(file);
      if (err) { toast(`${file.name}: ${err}`, 'error'); continue; }
      gallery.push(await readFileAsDataURL(file));
    }
    e.target.value = '';
    renderGalleryPreview();
  });

  document.getElementById('form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      title: fd.get('title').toString().trim(),
      category: fd.get('category').toString(),
      short_description: fd.get('short_description').toString().trim(),
      description: fd.get('description').toString().trim()
    };
    if (!data.title) { toast('Введите название', 'error'); return; }

    const forms = getForms();
    if (isEdit) {
      const i = forms.findIndex(f => f.id === id);
      if (i === -1) { toast('Запись не найдена', 'error'); return; }
      forms[i] = { ...forms[i], ...data, main_image: mainImage, images: gallery, updated_at: now() };
    } else {
      forms.push({
        id: nextId(),
        ...data,
        main_image: mainImage,
        images: gallery,
        views: 0,
        created_at: now(),
        updated_at: now()
      });
    }
    setForms(forms);
    toast(isEdit ? 'Сохранено' : 'Добавлено', 'success');
    location.hash = '#/admin/forms';
  });
}

/* =========================================================
   Категории
   ========================================================= */
function renderAdminCategories() {
  const cats = getCats();
  const counts = {};
  getForms().forEach(f => { counts[f.category] = (counts[f.category] || 0) + 1; });

  const content = `
    <h1>Категории</h1>
    <form id="addCat" class="inline-form">
      <input name="name" placeholder="Новая категория" required>
      <button class="btn primary" type="submit">Добавить</button>
    </form>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Название</th><th>Записей</th><th>Действия</th></tr></thead>
        <tbody>
          ${cats.map(c => `
            <tr>
              <td><b>${esc(c)}</b></td>
              <td>${counts[c] || 0}</td>
              <td>
                <button class="btn sm" data-rename="${esc(c)}" title="Переименовать">✎</button>
                <button class="btn sm danger" data-rmcat="${esc(c)}" title="Удалить">🗑</button>
              </td>
            </tr>`).join('') || '<tr><td colspan="3">Нет категорий</td></tr>'}
        </tbody>
      </table>
    </div>`;

  app.innerHTML = adminShell(content, 'cats');

  document.getElementById('addCat').addEventListener('submit', e => {
    e.preventDefault();
    const name = e.target.querySelector('[name="name"]').value.trim();
    if (!name) return;
    const cats = getCats();
    if (cats.includes(name)) { toast('Такая категория уже есть', 'error'); return; }
    cats.push(name);
    setCats(cats);
    toast('Категория добавлена', 'success');
    renderAdminCategories();
  });

  app.querySelectorAll('[data-rename]').forEach(btn => {
    btn.addEventListener('click', () => {
      const oldName = btn.dataset.rename;
      const newName = prompt('Новое название:', oldName);
      if (!newName || newName.trim() === oldName) return;
      const trimmed = newName.trim();
      if (getCats().includes(trimmed)) { toast('Такая категория уже есть', 'error'); return; }
      setCats(getCats().map(c => c === oldName ? trimmed : c));
      setForms(getForms().map(f => f.category === oldName ? { ...f, category: trimmed } : f));
      toast('Переименовано', 'success');
      renderAdminCategories();
    });
  });

  app.querySelectorAll('[data-rmcat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.rmcat;
      const count = getForms().filter(f => f.category === name).length;
      if (count > 0) {
        toast(`Нельзя удалить: в категории ${count} записей`, 'error');
        return;
      }
      if (!confirm(`Удалить «${name}»?`)) return;
setCats(getCats().filter(c => c !== name));
      toast('Удалено', 'success');
      renderAdminCategories();
    });
  });
}

/* =========================================================
   Boot
   ========================================================= */
window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', init);