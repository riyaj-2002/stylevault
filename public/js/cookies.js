// ── Cookie Consent ──
(function () {
  // If already decided, don't show banner
  if (localStorage.getItem('cookie_consent')) return;

  // Inject banner HTML on pages that don't have it
  if (!document.getElementById('cookie-banner')) {
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = `
      <div class="cookie-content">
        <div class="cookie-text">
          <span class="cookie-icon">🍪</span>
          <div>
            <strong>We use cookies</strong>
            <p>We use cookies to improve your experience, remember your cart, and keep you logged in. By continuing, you agree to our use of cookies.</p>
          </div>
        </div>
        <div class="cookie-btns">
          <button id="cookie-decline">Decline</button>
          <button id="cookie-accept">Accept All</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
  }

  const banner = document.getElementById('cookie-banner');

  // Show after short delay
  setTimeout(() => banner.classList.add('show'), 1800);

  document.getElementById('cookie-accept').addEventListener('click', () => {
    localStorage.setItem('cookie_consent', 'accepted');
    hideBanner();
  });

  document.getElementById('cookie-decline').addEventListener('click', () => {
    localStorage.setItem('cookie_consent', 'declined');
    hideBanner();
  });

  function hideBanner() {
    banner.classList.remove('show');
    banner.classList.add('hide');
    setTimeout(() => banner.remove(), 500);
  }
})();
