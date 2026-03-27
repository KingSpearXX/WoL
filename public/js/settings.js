const Settings = {
  async load() {
    this.loadTokens();
  },

  async loadTokens() {
    try {
      const res = await fetch('/api/tokens');
      const data = await res.json();
      const list = document.getElementById('token-list');
      list.innerHTML = data.tokens
        .map(
          (t) => `
        <li class="token-item">
          <div>
            <div class="token-name">${this.escapeHtml(t.name)}</div>
            <div class="token-date">${new Date(t.createdAt).toLocaleDateString()}</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="Settings.deleteToken('${t.id}')">Revoke</button>
        </li>`
        )
        .join('');
    } catch {
      // ignore
    }
  },

  async createToken() {
    const nameInput = document.getElementById('token-name');
    const name = nameInput.value.trim();
    if (!name) return;

    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Show token once
      const reveal = document.getElementById('new-token-reveal');
      reveal.textContent = data.token;
      reveal.style.display = 'block';
      reveal.title = 'Click to copy';
      reveal.onclick = () => {
        navigator.clipboard.writeText(data.token);
        reveal.textContent = 'Copied!';
        setTimeout(() => { reveal.style.display = 'none'; }, 2000);
      };

      nameInput.value = '';
      this.loadTokens();
    } catch (err) {
      alert(err.message);
    }
  },

  async deleteToken(id) {
    try {
      await fetch(`/api/tokens/${id}`, { method: 'DELETE' });
      this.loadTokens();
    } catch {
      // ignore
    }
  },

  async registerBiometric() {
    const statusEl = document.getElementById('biometric-status');
    try {
      // Get registration options
      const optRes = await fetch('/api/auth/webauthn/register/options', { method: 'POST' });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error);

      // Start registration
      const regResp = await SimpleWebAuthnBrowser.startRegistration({ optionsJSON: optData });

      // Verify
      const verRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regResp),
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error(verData.error);

      statusEl.innerHTML = '<div class="alert alert-success">Biometric registered successfully!</div>';
    } catch (err) {
      statusEl.innerHTML = `<div class="alert alert-error">${this.escapeHtml(err.message || 'Registration failed')}</div>`;
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  init() {
    document.getElementById('btn-create-token').addEventListener('click', () => this.createToken());
    document.getElementById('btn-register-biometric').addEventListener('click', () => this.registerBiometric());
  },
};

document.addEventListener('DOMContentLoaded', () => Settings.init());
