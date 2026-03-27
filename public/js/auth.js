const Auth = {
  init() {
    document.getElementById('setup-form').addEventListener('submit', (e) => this.handleSetup(e));
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('webauthn-login-btn').addEventListener('click', () => this.handleWebAuthnLogin());
  },

  showError(prefix, msg) {
    const el = document.getElementById(`${prefix}-error`);
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  },

  async handleSetup(e) {
    e.preventDefault();
    const username = document.getElementById('setup-username').value;
    const password = document.getElementById('setup-password').value;

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      App.show('app');
      Wake.loadTargets();
    } catch (err) {
      this.showError('setup', err.message);
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      App.show('app');
      Wake.loadTargets();
    } catch (err) {
      this.showError('login', err.message);
    }
  },

  async handleWebAuthnLogin() {
    const username = document.getElementById('login-username').value;
    if (!username) {
      this.showError('login', 'Enter your username first');
      return;
    }

    try {
      // Get options
      const optRes = await fetch('/api/auth/webauthn/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error);

      const userId = optData._userId;

      // Start authentication
      const authResp = await SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: optData });

      // Verify
      const verRes = await fetch('/api/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, response: authResp }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error(verData.error);

      App.show('app');
      Wake.loadTargets();
    } catch (err) {
      this.showError('login', err.message || 'Biometric authentication failed');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  // Show biometric button if WebAuthn is available
  if (window.PublicKeyCredential) {
    document.getElementById('webauthn-login-btn').style.display = 'block';
  }
});
