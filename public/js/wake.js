const Wake = {
  async loadTargets() {
    try {
      const res = await fetch('/api/wake/targets');
      const data = await res.json();
      const select = document.getElementById('target-select');
      select.innerHTML = data.targets
        .map((t) => `<option value="${t.id}">${t.name}</option>`)
        .join('');
    } catch {
      // ignore
    }
  },

  async send() {
    const btn = document.getElementById('wake-btn');
    const status = document.getElementById('wake-status');
    const targetId = document.getElementById('target-select').value;

    btn.className = 'wake-btn sending';
    btn.disabled = true;
    status.textContent = 'Sending magic packet...';

    try {
      const res = await fetch('/api/wake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      btn.className = 'wake-btn success';
      status.textContent = `Packet sent to ${data.target}`;
    } catch (err) {
      btn.className = 'wake-btn error';
      status.textContent = err.message || 'Failed to send packet';
    }

    setTimeout(() => {
      btn.className = 'wake-btn';
      btn.disabled = false;
    }, 3000);
  },

  init() {
    document.getElementById('wake-btn').addEventListener('click', () => this.send());
  },
};

document.addEventListener('DOMContentLoaded', () => Wake.init());
