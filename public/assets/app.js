'use strict';
/* ShopNova front end. Talks to ../api/index.php (JSON) and renders every page. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const page = document.body.dataset.page;
const params = new URLSearchParams(location.search);

let state;
let wishes = [];
try { wishes = JSON.parse(localStorage.getItem('shopnova-wishlist') || '[]'); if (!Array.isArray(wishes)) wishes = []; } catch { wishes = []; }

const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (p) => Math.round((1 - p.price / p.mrp) * 100);
const count = () => state.cart.reduce((n, p) => n + p.quantity, 0);
const total = () => state.cart.reduce((n, p) => n + p.price * p.quantity, 0);
const mrpTotal = () => state.cart.reduce((n, p) => n + p.mrp * p.quantity, 0);
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- icons ---------- */
const ICON = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.3a1 1 0 0 0 1 .7h8.8a1 1 0 0 0 1-.8L20 8H6"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.2C1.7 7.5 3.6 4.5 6.7 4.5c2 0 3.4 1 5.3 3 1.9-2 3.3-3 5.3-3 3.1 0 5 3 3.9 6.3C19.5 15.4 12 20 12 20z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  truck: '<path d="M2 6h11v10H2zM13 9h5l3 3v4h-8"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.3 8 8 9 4.7-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  ret: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
  home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;

/* ---------- API ---------- */
async function api(action, data) {
  const res = await fetch('../api/index.php?action=' + action, {
    method: data ? 'POST' : 'GET',
    headers: data ? { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf } : {},
    body: data ? JSON.stringify(data) : undefined
  });
  let result;
  try { result = await res.json(); } catch { throw Error('Start the project through PHP/XAMPP. Do not open HTML files directly.'); }
  if (!res.ok) throw Error(result.error || 'Request failed');
  return result;
}
function toast(message) {
  const t = $('#toast');
  t.textContent = message; t.style.display = 'block';
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => { t.style.display = 'none'; }, 2800);
}
const safeNext = () => { const n = params.get('next') || ''; return /^[a-z-]+\.html(\?[\w=&%.-]*)?$/i.test(n) ? n : ''; };
const loginUrl = (next) => 'login.html?next=' + encodeURIComponent(next);
const here = () => location.pathname.split('/').pop() + location.search;

/* ---------- shared pieces ---------- */
const img = (p, cls = '') => `<img class="${cls}" src="${esc(p.image || '')}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.visibility='hidden'">`;
const stars = (r) => `<div class="stars" aria-label="${r} out of 5">${'★'.repeat(Math.round(r))}${'☆'.repeat(5 - Math.round(r))}<span>${r}</span></div>`;

function header() {
  const u = state.user;
  const nav = [['products.html', 'Shop', 'products'], ['categories.html', 'Categories', 'categories'], ['deals.html', 'Deals', 'deals'], ['faq.html', 'Help', 'faq']];
  const links = nav.map(([h, t, k]) => `<a href="${h}" class="${page === k ? 'on' : ''}">${t}</a>`).join('');
  $('#header').innerHTML = `
    <div class="site-head">
      <div class="wrap bar">
        <a class="logo" href="index.html">SHOPNOVA<small>EVERYDAY STORE</small></a>
        <nav class="main-nav" aria-label="Main">${links}</nav>
        <form class="hsearch" action="products.html" role="search">
          <input name="q" aria-label="Search products" placeholder="Search products…" value="${esc(page === 'products' ? params.get('q') || '' : '')}">
          <button aria-label="Search">${ic('search')}</button>
        </form>
        <div class="icons">
          <a class="ibtn" href="wishlist.html" aria-label="Wishlist">${ic('heart')}${wishes.length ? `<span class="cnt">${wishes.length}</span>` : ''}</a>
          <a class="ibtn" href="cart.html" aria-label="Cart, ${count()} items">${ic('cart')}${count() ? `<span class="cnt">${count()}</span>` : ''}</a>
          ${u ? `
          <div class="menu-wrap">
            <button class="ibtn" id="menuBtn" aria-haspopup="true" aria-expanded="false"><span class="avatar">${esc(u.name.trim()[0].toUpperCase())}</span><span class="lbl">${esc(u.name.split(' ')[0])}</span></button>
            <div class="menu" id="menu">
              <div class="who"><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div>
              <a href="account.html">${ic('user')} My account</a>
              <a href="orders.html">${ic('box')} Order history</a>
              <a href="wishlist.html">${ic('heart')} Wishlist</a>
              <button class="danger" data-logout>${ic('out')} Sign out</button>
            </div>
          </div>` : `<a class="ibtn" href="login.html">${ic('user')}<span class="lbl">Sign in</span></a>`}
        </div>
      </div>
      <nav class="subnav" aria-label="Sections">${links}</nav>
    </div>`;
}

function footer() {
  $('#footer').innerHTML = `
    <div class="site-foot"><div class="wrap">
      <div><a class="logo" href="index.html">SHOPNOVA</a><p style="margin-top:10px">Everyday essentials across six categories.</p><small>WT educational project · sample products and simulated orders</small></div>
      <div><h4>Shop</h4><p><a href="products.html">All products</a></p><p><a href="categories.html">Categories</a></p><p><a href="deals.html">Deals</a></p></div>
      <div><h4>Help</h4><p><a href="account.html">My account</a></p><p><a href="faq.html">FAQ</a></p><p><a href="contact.html">Contact us</a></p><p><a href="about.html">About</a></p></div>
    </div></div>`;
}

function card(p) {
  const on = wishes.includes(p.id);
  return `
    <article class="pcard">
      <a class="pimg" href="product.html?id=${p.id}">${img(p)}<span class="tag">-${pct(p)}%</span></a>
      <button class="heart" data-wish="${p.id}" aria-pressed="${on}" aria-label="${on ? 'Remove' : 'Add'} ${esc(p.name)} ${on ? 'from' : 'to'} wishlist">${ic('heart')}</button>
      <div class="pbody">
        <small>${esc(p.category)}</small>
        <h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
        ${stars(p.rating)}
        <div class="pr price">${money(p.price)}<del>${money(p.mrp)}</del></div>
        <button class="btn sm" data-add="${p.id}">${ic('cart')} Add to cart</button>
      </div>
    </article>`;
}
const grid = (list, cls = '') => `<div class="grid ${cls}">${list.map(card).join('')}</div>`;
const empty = (t, d, link = ['products.html', 'Browse products']) => `<div class="card-box empty"><h2>${t}</h2><p>${d}</p><a class="btn" href="${link[0]}">${link[1]}</a></div>`;

function field(name, label, type = 'text', extra = '') {
  return `<label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" required ${extra}>`;
}
function pwField(name, label, auto) {
  return `<label for="${name}">${label}</label><div class="pw"><input id="${name}" name="${name}" type="password" required minlength="8" maxlength="128" autocomplete="${auto}"><button type="button" data-showpw="${name}" aria-label="Show or hide password">${ic('eye')}</button></div>`;
}

/* ---------- orders helpers ---------- */
function statusOf(o) {
  const h = (Date.now() - new Date(o.created).getTime()) / 36e5;
  if (h < 24) return { step: 1, label: 'Processing', cls: 'amber' };
  if (h < 72) return { step: 2, label: 'Shipped', cls: 'blue' };
  return { step: 3, label: 'Delivered', cls: 'green' };
}
const addrParts = (o) => { const [a = '', pin = '', ph = ''] = o.address.split(' | '); return { a, pin, ph }; };

/* ---------- portal layout ---------- */
function portal(active, inner) {
  const u = state.user;
  const item = (k, h, icon, t) => `<a href="${h}" class="${active === k ? 'on' : ''}">${ic(icon)} ${t}</a>`;
  return `<div class="portal">
    <aside class="pnav" aria-label="Account">
      <div class="me"><span class="avatar">${esc(u.name.trim()[0].toUpperCase())}</span><div><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div></div>
      ${item('account', 'account.html', 'home', 'Overview')}
      ${item('orders', 'orders.html', 'box', 'Order history')}
      ${item('wishlist', 'wishlist.html', 'heart', 'Wishlist')}
      ${item('cart', 'cart.html', 'cart', 'My cart')}
      <hr><button data-logout>${ic('out')} Sign out</button>
    </aside>
    <section>${inner}</section></div>`;
}

/* ---------- shop (filters) ---------- */
const fs = { q: params.get('q') || '', cats: new Set(params.get('category') ? [params.get('category')] : []), min: '', max: '', rating: 0, sort: 'featured', view: 'grid' };

function filterPanel(categories) {
  return `<aside class="filters" id="filters" aria-label="Filters">
    <div class="fh"><b>Filters</b><button class="rm" data-clear>Clear all</button></div>
    <div class="fgroup"><h4>Category</h4>
      ${categories.map((c) => `<label class="chk"><input type="checkbox" data-cat="${esc(c)}" ${fs.cats.has(c) ? 'checked' : ''}> ${esc(c)} <em>${state.products.filter((p) => p.category === c).length}</em></label>`).join('')}
    </div>
    <div class="fgroup"><h4>Price (₹)</h4>
      <div class="prange"><input type="number" min="0" id="pmin" placeholder="Min" aria-label="Minimum price" value="${fs.min}"><span>–</span><input type="number" min="0" id="pmax" placeholder="Max" aria-label="Maximum price" value="${fs.max}"></div>
    </div>
    <div class="fgroup"><h4>Rating</h4>
      ${[[0, 'Any rating'], [4, '4★ & up'], [4.3, '4.3★ & up']].map(([v, t]) => `<label class="chk"><input type="radio" name="rating" data-rating="${v}" ${fs.rating === v ? 'checked' : ''}> ${t}</label>`).join('')}
    </div>
  </aside>`;
}

function applyFilters() {
  let list = state.products.filter((p) =>
    (!fs.q || (p.name + ' ' + p.category).toLowerCase().includes(fs.q.toLowerCase())) &&
    (!fs.cats.size || fs.cats.has(p.category)) &&
    (fs.min === '' || p.price >= Number(fs.min)) && (fs.max === '' || p.price <= Number(fs.max)) &&
    p.rating >= fs.rating);
  if (fs.sort === 'low') list.sort((a, b) => a.price - b.price);
  if (fs.sort === 'high') list.sort((a, b) => b.price - a.price);
  if (fs.sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  $('#results').innerHTML = list.length ? grid(list, fs.view === 'list' ? 'list' : '') : empty('No products match', 'Try removing a filter or searching for something else.');
  $('#resultCount').textContent = list.length + (list.length === 1 ? ' result' : ' results');
  $$('.vt button').forEach((b) => b.classList.toggle('on', b.dataset.view === fs.view));
}

/* ---------- pages ---------- */
async function render() {
  header();
  const P = state.products;
  const categories = [...new Set(P.map((p) => p.category))];
  const u = state.user;
  let html = '';

  /* gate pages that need a signed-in user */
  if (['account', 'orders', 'order'].includes(page) && !u) { location.replace(loginUrl(here())); return; }

  if (page === 'index') {
    const hero = [...P].sort((a, b) => b.rating - a.rating).slice(0, 6);
    html = `
    <section class="hero"><div class="wrap">
      <div>
        <h1>Find it fast. Save it. Check out in a minute.</h1>
        <p>${P.length} everyday products across ${categories.length} categories, with live search, a wishlist, a persistent cart and your own order history.</p>
        <div class="row"><a class="btn gold" href="products.html">Shop all products</a><a class="btn line" href="${u ? 'account.html' : 'register.html'}">${u ? 'Open my account' : 'Create an account'}</a></div>
      </div>
      <div class="shots" aria-hidden="true">${hero.map((p) => `<div class="shot">${img(p)}<small>${esc(p.name)}</small></div>`).join('')}</div>
    </div></section>
    <div class="wrap">
      <div class="sechead"><h2>Shop by category</h2><a class="link" href="categories.html">All categories</a></div>
      <div class="cats">${categories.map((c) => { const f = P.find((p) => p.category === c); return `<a class="cat" href="products.html?category=${encodeURIComponent(c)}">${img(f)}<div><b>${esc(c)}</b><span>${P.filter((p) => p.category === c).length} items</span></div></a>`; }).join('')}</div>

      <div class="sechead"><h2>Top rated right now</h2><a class="link" href="products.html">View all</a></div>
      ${grid([...P].sort((a, b) => b.rating - a.rating).slice(0, 10))}

      <div class="sechead"><h2>Everything in one place</h2></div>
      <div class="features">
        <div class="feat"><h3>Discovery &amp; Search</h3><p>Type a keyword, then narrow by category, price and rating. Switch between grid and list view.</p><a class="link" href="products.html">Start browsing</a></div>
        <div class="feat"><h3>Cart &amp; Wishlist</h3><p>Your cart stays with you across pages. Tap the heart on any product to save it for later.</p><a class="link" href="cart.html">Open cart</a></div>
        <div class="feat"><h3>User Portal</h3><p>Register, sign in, track every order and manage your details from one dashboard.</p><a class="link" href="${u ? 'account.html' : 'login.html'}">${u ? 'Go to portal' : 'Sign in'}</a></div>
      </div>
      <div class="strip">
        <div>${ic('truck')} Free delivery on every order</div><div>${ic('ret')} Easy returns (demo)</div><div>${ic('shield')} Secure sign-in &amp; checkout</div>
      </div>
    </div>`;
    $('#main').innerHTML = html; footer(); return;
  }

  if (page === 'products') {
    html = `<div class="wrap page">
      <div class="crumbs"><a href="index.html">Home</a> / Shop</div>
      <div class="pagehead"><h1>All products</h1></div>
      <div class="shop">${filterPanel(categories)}
        <div>
          <div class="toolbar">
            <div><button class="btn ghost sm fbtn" data-toggle-filters>${ic('filter')} Filters</button> <strong id="resultCount"></strong></div>
            <div class="right">
              <select id="sort" aria-label="Sort by"><option value="featured">Sort: Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option></select>
              <div class="vt"><button data-view="grid" aria-label="Grid view">${ic('grid')}</button><button data-view="list" aria-label="List view">${ic('list')}</button></div>
            </div>
          </div>
          <div id="results"></div>
        </div></div></div>`;
  }

  if (page === 'deals') {
    const list = [...P].sort((a, b) => pct(b) - pct(a));
    html = `<div class="wrap page"><div class="crumbs"><a href="index.html">Home</a> / Deals</div>
      <div class="pagehead"><div><h1>Today’s deals</h1><p>Save up to ${pct(list[0])}% against the listed price.</p></div></div>${grid(list)}</div>`;
  }

  if (page === 'wishlist') {
    const list = P.filter((p) => wishes.includes(p.id));
    const body = `<div class="pagehead"><div><h1>Your wishlist</h1><p>${list.length ? list.length + ' saved item' + (list.length > 1 ? 's' : '') : 'Items you save appear here.'}</p></div></div>` +
      (list.length ? grid(list) : empty('Nothing saved yet', 'Tap the heart on any product to keep it here.'));
    html = u ? `<div class="wrap page">${portal('wishlist', body)}</div>` : `<div class="wrap page">${body}<p class="muted">Wishlist is saved in this browser. <a class="link" href="${loginUrl('wishlist.html')}">Sign in</a> to access your account.</p></div>`;
  }

  if (page === 'categories') {
    html = `<div class="wrap page"><div class="crumbs"><a href="index.html">Home</a> / Categories</div><div class="pagehead"><h1>Shop by category</h1></div>
      <div class="cats" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${categories.map((c) => { const f = P.find((p) => p.category === c); return `<a class="cat" href="products.html?category=${encodeURIComponent(c)}">${img(f)}<div><b>${esc(c)}</b><span>${P.filter((p) => p.category === c).length} products</span></div></a>`; }).join('')}</div></div>`;
  }

  if (page === 'product') {
    const p = P.find((x) => x.id === Number(params.get('id')));
    if (!p) html = `<div class="wrap page">${empty('Product not found', 'Choose another item from the catalogue.')}</div>`;
    else {
      const on = wishes.includes(p.id);
      const rel = P.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
      html = `<div class="wrap page">
        <div class="crumbs"><a href="index.html">Home</a> / <a href="products.html">Shop</a> / <a href="products.html?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a></div>
        <div class="detail">
          <div class="gal">${img(p)}</div>
          <div>
            <span class="badge green">In stock</span>
            <h1 style="margin-top:10px">${esc(p.name)}</h1>
            ${stars(p.rating)}
            <p class="price" style="margin:12px 0 4px">${money(p.price)} <del>${money(p.mrp)}</del> <span class="badge green">Save ${pct(p)}%</span></p>
            <p class="muted">${esc(p.description)}</p>
            <div class="perks"><div>${ic('truck')} Free delivery · Cash on delivery (demo)</div><div>${ic('ret')} 7-day easy returns (demo)</div><div>${ic('shield')} Secure checkout</div></div>
            <div class="actions">
              <div class="qty"><button type="button" data-step="-1" aria-label="Decrease">−</button><input id="pqty" type="number" min="1" max="10" value="1" aria-label="Quantity"><button type="button" data-step="1" aria-label="Increase">+</button></div>
              <button class="btn" data-add="${p.id}">${ic('cart')} Add to cart</button>
              <button class="btn ghost" data-wish="${p.id}" aria-pressed="${on}">${ic('heart')} <span data-wishlabel>${on ? 'Saved' : 'Save'}</span></button>
            </div>
          </div>
        </div>
        ${rel.length ? `<div class="sechead"><h2>You may also like</h2></div>${grid(rel)}` : ''}
      </div>`;
    }
  }

  if (page === 'cart') {
    const lines = state.cart.map((p) => `
      <div class="line">
        <a href="product.html?id=${p.id}">${img(p)}</a>
        <div>
          <a class="nm" href="product.html?id=${p.id}">${esc(p.name)}</a>
          <div class="meta">${esc(p.category)} · <span style="color:var(--green)">In stock</span></div>
          <div class="ctl">
            <div class="qty"><button data-cartstep="${p.id}" data-d="-1" aria-label="Decrease quantity">−</button><input type="number" min="1" max="10" value="${p.quantity}" data-qty="${p.id}" aria-label="Quantity for ${esc(p.name)}"><button data-cartstep="${p.id}" data-d="1" aria-label="Increase quantity">+</button></div>
            <button class="rm" data-remove="${p.id}">${ic('trash')} Remove</button>
            <button class="rm" data-wish="${p.id}" aria-pressed="${wishes.includes(p.id)}">${ic('heart')} <span data-wishlabel>${wishes.includes(p.id) ? 'Saved' : 'Save for later'}</span></button>
          </div>
        </div>
        <div class="tot">${money(p.price * p.quantity)}</div>
      </div>`).join('');
    html = `<div class="wrap page"><div class="pagehead"><div><h1>Your cart (${count()})</h1><p>Review your items and proceed to checkout.</p></div><a class="link" href="products.html">Continue shopping</a></div>
      ${state.cart.length ? `<div class="two">
        <div class="card-box lines">${lines}</div>
        <aside class="card-box summary"><h2>Order summary</h2>
          <div class="srow"><span>Price (${count()} items)</span><span>${money(mrpTotal())}</span></div>
          <div class="srow save"><span>Discount</span><span>−${money(mrpTotal() - total())}</span></div>
          <div class="srow"><span>Delivery</span><span>Free</span></div>
          <div class="srow total"><span>Total</span><span>${money(total())}</span></div>
          <a class="btn block" style="margin-top:14px" href="${u ? 'checkout.html' : loginUrl('checkout.html')}">${u ? 'Proceed to checkout' : 'Sign in to checkout'}</a>
          <p class="note">Cash on delivery (simulated). No payment is collected.</p>
        </aside></div>` : empty('Your cart is empty', 'Add something you love to get started.')}</div>`;
  }

  if (page === 'login' || page === 'register') {
    if (u) { location.replace(safeNext() || 'account.html'); return; }
    const isLogin = page === 'login';
    const nx = safeNext();
    html = `<div class="wrap"><div class="auth">
      <div class="side"><div><h2>${isLogin ? 'Welcome back.' : 'Join ShopNova.'}</h2><p>One account for your cart, orders and saved details.</p></div>
        <ul><li>${ic('box')} Track every order</li><li>${ic('cart')} Faster checkout</li><li>${ic('shield')} Passwords are stored hashed</li></ul></div>
      <form data-form="${page}" novalidate>
        <h1>${isLogin ? 'Sign in' : 'Create your account'}</h1>
        ${nx ? '<p class="muted">Please sign in to continue.</p>' : ''}
        ${isLogin ? '' : field('name', 'Full name', 'text', 'minlength="2" maxlength="80" autocomplete="name"')}
        ${field('email', 'Email address', 'email', 'autocomplete="email"')}
        ${pwField('password', 'Password', isLogin ? 'current-password' : 'new-password')}
        ${isLogin ? '' : pwField('confirm', 'Confirm password', 'new-password')}
        <p class="error" role="alert"></p>
        <button class="btn block">${isLogin ? 'Sign in' : 'Create account'}</button>
        <p class="alt">${isLogin ? 'New here?' : 'Already registered?'} <a class="link" href="${isLogin ? 'register' : 'login'}.html${nx ? '?next=' + encodeURIComponent(nx) : ''}">${isLogin ? 'Create an account' : 'Sign in'}</a></p>
      </form></div></div>`;
  }

  if (page === 'checkout') {
    if (!u) { location.replace(loginUrl('checkout.html')); return; }
    if (!state.cart.length) html = `<div class="wrap page">${empty('No items to check out', 'Add products to your cart first.')}</div>`;
    else html = `<div class="wrap page"><div class="pagehead"><h1>Checkout</h1></div>
      <div class="two">
        <form class="card-box" data-form="checkout" novalidate>
          <h2>Delivery details</h2>
          <label for="address">Full delivery address</label><textarea id="address" name="address" required minlength="10" maxlength="500" autocomplete="street-address" placeholder="House no., street, area, city, state"></textarea>
          <div class="grid2"><div>${field('phone', 'Mobile number', 'tel', 'pattern="[0-9]{10}" maxlength="10" inputmode="numeric" autocomplete="tel-national"')}</div><div>${field('pincode', 'PIN code', 'text', 'pattern="[1-9][0-9]{5}" maxlength="6" inputmode="numeric" autocomplete="postal-code"')}</div></div>
          <h2 style="margin-top:22px">Payment</h2>
          <label class="chk"><input type="radio" checked> Cash on delivery <em>demo</em></label>
          <p class="note">No payment is collected and no real shipment is created.</p>
          <p class="error" role="alert"></p>
          <button class="btn block">Place order · ${money(total())}</button>
        </form>
        <aside class="card-box summary"><h2>Your items</h2>
          ${state.cart.map((p) => `<div class="mini">${img(p)}<span>${esc(p.name)} × ${p.quantity}</span><b>${money(p.price * p.quantity)}</b></div>`).join('')}
          <div class="srow" style="margin-top:8px"><span>Delivery</span><span>Free</span></div>
          <div class="srow total"><span>Total</span><span>${money(total())}</span></div>
          <a class="link" href="cart.html" style="font-size:14px">Edit cart</a>
        </aside></div></div>`;
  }

  if (page === 'account' || page === 'orders' || page === 'order') {
    const orders = await api('orders');
    if (page === 'account') {
      const spent = orders.reduce((n, o) => n + o.total, 0);
      const addrs = [...new Map(orders.map((o) => [addrParts(o).a + addrParts(o).pin, addrParts(o)])).values()].slice(0, 2);
      const body = `
        <div class="pagehead"><div><h1>Hello, ${esc(u.name.split(' ')[0])}</h1><p>Here’s what’s happening with your account.</p></div></div>
        <div class="stats">
          <div class="stat"><b>${orders.length}</b><span>Orders placed</span></div>
          <div class="stat"><b>${money(spent)}</b><span>Total spent</span></div>
          <div class="stat"><b>${wishes.length}</b><span>Wishlist items</span></div>
          <div class="stat"><b>${count()}</b><span>Items in cart</span></div>
        </div>
        <div class="card-box" style="margin-bottom:18px"><div class="pagehead" style="margin-bottom:8px"><h2 style="margin:0">Recent orders</h2><a class="link" href="orders.html">View all</a></div>
          ${orders.length ? ordersTable(orders.slice(0, 3)) : '<p class="muted">No orders yet. <a class="link" href="products.html">Start shopping</a></p>'}</div>
        <div class="two-col">
          <div class="card-box"><h2>Profile</h2><p style="margin:0"><b>${esc(u.name)}</b></p><p class="muted">${esc(u.email)}</p><button class="btn ghost sm" data-logout>${ic('out')} Sign out</button></div>
          <div class="card-box"><h2>Delivery addresses</h2>${addrs.length ? addrs.map((a) => `<div class="addr" style="margin-bottom:8px">${esc(a.a)}\nPIN ${esc(a.pin)} · ${esc(a.ph)}</div>`).join('') : '<p class="muted">Addresses you use at checkout are listed here.</p>'}</div>
        </div>`;
      html = `<div class="wrap page">${portal('account', body)}</div>`;
    } else if (page === 'orders') {
      html = `<div class="wrap page">${portal('orders', `<div class="pagehead"><div><h1>Order history</h1><p>View and manage your recent orders.</p></div></div>
        <div class="card-box">${orders.length ? ordersTable(orders) : '<div class="empty"><h2>No orders yet</h2><p>Your placed orders will appear here.</p><a class="btn" href="products.html">Browse products</a></div>'}</div>
        ${orders.length ? '<p class="note">Delivery status is simulated from the order date for this demo.</p>' : ''}`)}</div>`;
    } else {
      const o = orders.find((x) => Number(x.id) === Number(params.get('id')));
      if (!o) html = `<div class="wrap page">${portal('orders', empty('Order not found', 'This order is unavailable for your account.', ['orders.html', 'All orders']))}</div>`;
      else {
        const s = statusOf(o), a = addrParts(o);
        const steps = ['Placed', 'Processing', 'Shipped', 'Delivered'];
        html = `<div class="wrap page">${portal('orders', `
          <div class="crumbs"><a href="orders.html">Order history</a> / #${o.id}</div>
          <div class="pagehead"><div><h1>Order #${o.id}</h1><p>Placed on ${fmtDate(o.created)}</p></div><span class="badge ${s.cls}">${s.label}</span></div>
          ${new URLSearchParams(location.search).get('new') ? `<div class="card-box" style="margin-bottom:18px;border-color:var(--green)"><b style="color:var(--green)">${ic('check')} Thank you! Your order has been placed.</b></div>` : ''}
          <div class="card-box" style="margin-bottom:18px"><div class="track">${steps.map((t, i) => `<div class="${i <= s.step ? 'done' : ''}">${t}</div>`).join('')}</div>
            <div class="lines">${o.items.map((p) => `<div class="line"><a href="product.html?id=${p.id}">${img(p)}</a><div><a class="nm" href="product.html?id=${p.id}">${esc(p.name)}</a><div class="meta">${money(p.price)} × ${p.quantity}</div></div><div class="tot">${money(p.price * p.quantity)}</div></div>`).join('')}</div></div>
          <div class="two-col">
            <div class="card-box"><h2>Delivery address</h2><div class="addr">${esc(a.a)}\nPIN ${esc(a.pin)}\nPhone ${esc(a.ph)}</div></div>
            <div class="card-box"><h2>Payment</h2><div class="srow"><span>Method</span><span>Cash on delivery</span></div><div class="srow"><span>Delivery</span><span>Free</span></div><div class="srow total"><span>Total</span><span>${money(o.total)}</span></div></div>
          </div>`)}</div>`;
      }
    }
  }

  if (page === 'about') {
    html = `<div class="wrap page narrow" style="max-width:860px"><h1>About ShopNova</h1>
      <p>ShopNova is a Web Technology project that shows a complete shopping journey with separate HTML, CSS, JavaScript and PHP files.</p>
      <div class="two-col" style="margin-top:20px">
        <div class="card-box"><h3>Front end</h3><p class="muted">Responsive pages with search, filters, cart, wishlist and a user portal.</p></div>
        <div class="card-box"><h3>Back end</h3><p class="muted">A JSON PHP API with sessions, hashed passwords, CSRF tokens and SQLite storage.</p></div>
      </div></div>`;
  }

  if (page === 'contact') {
    html = `<div class="wrap page"><form class="card-box narrow" data-form="contact" novalidate>
      <h1>How can we help?</h1><p class="muted">Your message is saved to this project’s database. No email is sent.</p>
      ${field('name', 'Your name', 'text', 'minlength="2" value="' + esc(u ? u.name : '') + '"')}
      ${field('email', 'Email', 'email', 'value="' + esc(u ? u.email : '') + '"')}
      <label for="message">Message</label><textarea id="message" name="message" required minlength="10" maxlength="2000"></textarea>
      <p class="error" role="alert"></p><button class="btn">Send message</button></form></div>`;
  }

  if (page === 'faq') {
    const faqs = [
      ['How do I place an order?', 'Create an account, add products to your cart, then enter your delivery details at checkout.'],
      ['Do I need an account to browse or add to cart?', 'No. You can browse and fill your cart freely. You only need to sign in at checkout.'],
      ['Are payments real?', 'No. Orders are demonstrations and cash on delivery is simulated.'],
      ['Where is my wishlist saved?', 'In this browser. Accounts, orders and messages are stored in SQLite on the server.'],
      ['What happens to my cart when I sign out?', 'The cart belongs to your session, so signing out clears it.'],
      ['Why does the page not load from a file?', 'PHP needs a server. Follow README.md to start XAMPP or the PHP development server.']
    ];
    html = `<div class="wrap page faq narrow"><h1>Help &amp; FAQ</h1>${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}<a class="btn" href="contact.html" style="margin-top:12px">Contact us</a></div>`;
  }

  $('#main').innerHTML = html;
  footer();
  if ($('#results')) { $('#sort').value = fs.sort; applyFilters(); }
}

function ordersTable(orders) {
  return `<div class="tablewrap"><table><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
    ${orders.map((o) => { const s = statusOf(o); return `<tr>
      <td><b>#${o.id}</b></td><td>${fmtDate(o.created)}</td>
      <td><div class="thumbs">${o.items.slice(0, 3).map((p) => img(p)).join('')}</div></td>
      <td>${money(o.total)}</td><td><span class="badge ${s.cls}">${s.label}</span></td>
      <td><a class="link" href="order.html?id=${o.id}">View details</a></td></tr>`; }).join('')}
  </tbody></table></div>`;
}

/* ---------- events ---------- */
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'pmin') { fs.min = t.value; applyFilters(); }
  if (t.id === 'pmax') { fs.max = t.value; applyFilters(); }
  if (t.id === 'pqty') t.value = Math.min(10, Math.max(1, Number(t.value) || 1));
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'sort') { fs.sort = t.value; applyFilters(); }
  if (t.dataset.cat !== undefined) { t.checked ? fs.cats.add(t.dataset.cat) : fs.cats.delete(t.dataset.cat); applyFilters(); }
  if (t.dataset.rating !== undefined) { fs.rating = Number(t.dataset.rating); applyFilters(); }
  if (t.dataset.qty) {
    try { state.cart = (await api('cart', { id: Number(t.dataset.qty), quantity: Math.min(10, Math.max(1, Number(t.value) || 1)) })).cart; }
    catch (err) { toast(err.message); }
    await render();
  }
});

async function doLogout() {
  try { await api('logout', {}); location.href = 'index.html'; } catch (err) { toast(err.message); }
}

document.addEventListener('click', async (e) => {
  const menu = $('#menu');
  if (menu && !e.target.closest('.menu-wrap')) { menu.classList.remove('open'); $('#menuBtn')?.setAttribute('aria-expanded', 'false'); }
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;

  try {
    if (b.id === 'menuBtn') { const open = menu.classList.toggle('open'); b.setAttribute('aria-expanded', open); return; }
    if ('logout' in d) { b.disabled = true; return doLogout(); }
    if (d.showpw) { const i = $('#' + d.showpw); i.type = i.type === 'password' ? 'text' : 'password'; return; }
    if ('toggleFilters' in d) { $('#filters').classList.toggle('open'); return; }
    if ('clear' in d) { Object.assign(fs, { q: '', cats: new Set(), min: '', max: '', rating: 0 }); $$('.filters input[type=checkbox]').forEach((c) => (c.checked = false)); $('#pmin').value = ''; $('#pmax').value = ''; $('[data-rating="0"]').checked = true; applyFilters(); return; }
    if (d.view) { fs.view = d.view; applyFilters(); return; }
    if (d.step) { const i = $('#pqty'); i.value = Math.min(10, Math.max(1, Number(i.value) + Number(d.step))); return; }

    if (d.add) {
      b.disabled = true;
      const id = Number(d.add);
      const add = $('#pqty') ? Number($('#pqty').value) : 1;
      const qty = Math.min(10, (state.cart.find((p) => p.id === id)?.quantity || 0) + add);
      state.cart = (await api('cart', { id, quantity: qty })).cart;
      header(); toast('Added to cart');
      b.disabled = false; return;
    }
    if (d.cartstep) {
      const id = Number(d.cartstep);
      const cur = state.cart.find((p) => p.id === id).quantity;
      const next = cur + Number(d.d);
      state.cart = (await api('cart', { id, quantity: Math.min(10, Math.max(1, next)) })).cart;
      if (next > 10) toast('Maximum 10 per item');
      await render(); return;
    }
    if (d.remove) { state.cart = (await api('cart', { id: Number(d.remove), quantity: 0 })).cart; toast('Removed from cart'); await render(); return; }

    if (d.wish) {
      const id = Number(d.wish);
      wishes = wishes.includes(id) ? wishes.filter((x) => x !== id) : [...wishes, id];
      try { localStorage.setItem('shopnova-wishlist', JSON.stringify(wishes)); } catch {}
      const on = wishes.includes(id);
      toast(on ? 'Saved to wishlist' : 'Removed from wishlist');
      if (page === 'wishlist') return render();
      $$(`[data-wish="${id}"]`).forEach((x) => { x.setAttribute('aria-pressed', on); const l = $('[data-wishlabel]', x); if (l) l.textContent = on ? 'Saved' : (page === 'cart' ? 'Save for later' : 'Save'); });
      header();
    }
  } catch (err) { toast(err.message); b.disabled = false; }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#menu')?.classList.remove('open'); } });

document.addEventListener('submit', async (e) => {
  const f = e.target;
  const kind = f.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const btn = $('button:not([type=button])', f), err = $('.error', f);
  err.textContent = '';
  if (!f.checkValidity()) { f.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(f));
  if (kind === 'register' && data.password !== data.confirm) { err.textContent = 'Passwords do not match.'; return; }
  delete data.confirm;
  btn.disabled = true;
  try {
    const r = await api(kind, data);
    if (kind === 'contact') { f.reset(); toast('Message saved. Thank you!'); }
    else if (kind === 'checkout') location.href = 'order.html?new=1&id=' + r.id;
    else location.href = safeNext() || 'account.html';
  } catch (ex) { err.textContent = ex.message; }
  btn.disabled = false;
});

(async () => {
  try { state = await api('bootstrap'); await render(); }
  catch (error) {
    $('#main').innerHTML = `<div class="wrap page"><div class="card-box"><h1>Unable to load ShopNova</h1><p>${esc(error.message)}</p><p>Run through XAMPP / PHP with PDO SQLite enabled. See README.md.</p></div></div>`;
  }
})();
