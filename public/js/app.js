/* global SimpleWebAuthnBrowser */

const App = {
  currentView: null,
  installPrompt: null,

  views: ['setup', 'login', 'app', 'settings'],

  show(viewName) {
    this.views.forEach((v) => {
      document.getElementById(`view-${v}`).classList.toggle('active', v === viewName);
    });
    this.currentView = viewName;
  },

  async checkStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      if (!data.setup) {
        this.show('setup');
        return;
      }

      // Check if we have a valid session
      const wakeRes = await fetch('/api/wake/targets');
      if (wakeRes.ok) {
        this.show('app');
        Wake.loadTargets();
      } else {
        this.show('login');
      }
    } catch {
      this.show('login');
    }
  },

  init() {
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      const banner = document.getElementById('install-banner');
      banner.style.display = 'block';
      banner.addEventListener('click', async () => {
        this.installPrompt.prompt();
        const result = await this.installPrompt.userChoice;
        if (result.outcome === 'accepted') {
          banner.style.display = 'none';
        }
        this.installPrompt = null;
      });
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    // Nav buttons
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.show('settings');
      Settings.load();
    });
    document.getElementById('btn-back').addEventListener('click', () => {
      this.show('app');
    });
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      this.show('login');
    });

    this.checkStatus();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
