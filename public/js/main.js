async function updateCartCount() {
  const res = await fetch('/api/cart', { credentials: 'include' });
  const data = await res.json();
  const el = document.getElementById('cart-count');
  if (el && data.success) el.textContent = data.cart.reduce((sum, i) => sum + i.quantity, 0);
}

async function updateAuthLink() {
  const res = await fetch('/api/session');
  const data = await res.json();
  const link = document.getElementById('auth-link');
  if (!link) return;
  if (data.loggedIn) {
    link.textContent = 'Profile';
    link.href = 'profile.html';
    link.onclick = null;
  } else {
    link.textContent = 'Login';
    link.href = 'login.html';
  }
}

async function addToCart(product) {
  const session = await fetch('/api/session', { credentials: 'include' }).then(r => r.json());
  if (!session.loggedIn) { window.location.href = 'login.html'; return; }
  await fetch('/api/cart/add', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(product)
  });
  updateCartCount();
  showToast('Added to cart!');
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '30px', right: '30px',
    background: '#1a1a2e', color: '#fff', padding: '12px 20px',
    borderRadius: '8px', fontSize: '0.95rem', zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const path = window.location.pathname;
  const SKIP_CATEGORIES = ['Customized', 'Logo'];
  const isHome = path.endsWith('index.html') || path === '/' || path.endsWith('/');
  let list;
  if (isHome) {
    const seen = new Set();
    list = products.filter(p => {
      if (SKIP_CATEGORIES.includes(p.category) || seen.has(p.category)) return false;
      seen.add(p.category);
      return true;
    });
  } else {
    list = products;
  }
  grid.innerHTML = list.map(p => `
    <div class="product-card" onclick="window.location.href='product.html?id=${p.id}'" style="cursor:pointer">
      <img src="${p.image}" alt="${p.name}" onerror="this.src='images/placeholder.png'"/>
      <div class="info">
        <h3>${p.name}</h3>
        <p class="price">&#8377;${p.price}</p>
        <button onclick="event.stopPropagation(); window.location.href='product.html?id=${p.id}'">View Details</button>
      </div>
    </div>
  `).join('');
  if (isHome) {
    grid.insertAdjacentHTML('afterend', '<div style="text-align:center;padding:30px 0 70px"><a href="collections.html" style="background:#E2725B;color:#fff;padding:14px 38px;border-radius:30px;text-decoration:none;font-size:1rem;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(100,50,10,0.2);">See All Covers &#8594;</a></div>');
  }
}

renderProducts();
updateCartCount();
updateAuthLink();

// ── Hamburger nav toggle ──
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('nav');
  if (!nav) return;
  const links = nav.querySelector('.nav-links');
  if (!links) return;
  const toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', 'Menu');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  nav.insertBefore(toggle, links);
  // close on link click
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
});

function showLogoutModal() {
  const overlay = document.createElement('div');
  overlay.id = 'logout-modal';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '99999'
  });
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:40px;text-align:center;max-width:360px;width:90%;box-shadow:0 8px 30px rgba(0,0,0,0.15)">
      <h3 style="color:#1a1a2e;margin-bottom:10px;font-size:1.3rem">Logout</h3>
      <p style="color:#555;margin-bottom:25px;font-size:0.97rem">Are you sure you want to logout?</p>
      <div style="display:flex;gap:15px;justify-content:center">
        <button onclick="document.getElementById('logout-modal').remove()" style="padding:10px 28px;border-radius:8px;border:2px solid #1a1a2e;background:#fff;color:#1a1a2e;font-size:0.95rem;font-weight:600;cursor:pointer">Cancel</button>
        <button onclick="confirmLogout()" style="padding:10px 28px;border-radius:8px;border:none;background:#e94560;color:#fff;font-size:0.95rem;font-weight:600;cursor:pointer">Yes, Logout</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function confirmLogout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.reload();
}
