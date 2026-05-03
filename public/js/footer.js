// Inject premium footer into every page
(function() {
  const footerEl = document.querySelector('footer');
  if (!footerEl) return;
  footerEl.innerHTML = `
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <a href="index.html" class="footer-logo">StyleVault</a>
          <p>Premium phone cases that blend style, protection &amp; personality. Express yourself, one case at a time.</p>
        </div>
        <div class="footer-features">
          <div class="footer-feat">
            <div class="footer-feat-icon">🔒</div>
            <div><strong>Secure Payments</strong><span>via Razorpay</span></div>
          </div>
          <div class="footer-feat">
            <div class="footer-feat-icon">🔄</div>
            <div><strong>7-Day Easy Returns</strong><span>Hassle-free</span></div>
          </div>
          <div class="footer-feat">
            <div class="footer-feat-icon">🛡️</div>
            <div><strong>SSL Encrypted &amp; Safe</strong><span>100% secure</span></div>
          </div>
          <div class="footer-feat">
            <div class="footer-feat-icon">🚚</div>
            <div><strong>Free Shipping</strong><span>Across India</span></div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 StyleVault. All rights reserved. Made with ♥</p>
        <div class="footer-links">
          <a href="privacy.html">Privacy Policy</a>
          <a href="terms.html">Terms &amp; Conditions</a>
          <a href="shipping.html">Shipping Policy</a>
          <a href="returns.html">Return Policy</a>
        </div>
      </div>
    </div>
  `;
})();
