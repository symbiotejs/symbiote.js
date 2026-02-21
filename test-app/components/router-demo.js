import Symbiote, { html, css } from '../../core/index.js';
import { AppRouter } from '../../core/AppRouter.js';

class RouterDemo extends Symbiote {
  init$ = {
    currentRoute: '—',
    currentOptions: '—',
    currentTitle: '—',
    currentUrl: '—',
    logText: '',
    guardEnabled: false,
    navHome: () => this.#doNav('home'),
    navAbout: () => this.#doNav('about'),
    // navUser42: () => this.#doNav('user', { id: '42' }),
    navUser99: () => this.#doNav('user', { id: '99' }),
    navUser42Params: () => this.#doNav('user', { id: '42', tab: 'posts', verbose: true }),
    navSettings: () => this.#doNav('settings'),
    do404: () => {
      this.#log('🔗 pushState → /unknown/path');
      window.history.pushState(null, '', '/unknown/path');
      AppRouter.notify();
      this.#updateUrl();
    },
    handleLinkClick: (e) => {
      let a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      let url = new URL(a.href);
      this.#log(`🔗 <a href="${url.pathname}${url.search}">`);
      window.history.pushState(null, '', url.pathname + url.search);
      AppRouter.notify();
      this.#updateUrl();
    },
    onGuardToggle: (e) => {
      this.$.guardEnabled = e.target.checked;
    },
  };

  onNavUser42() {
    this.#doNav('user', { id: '42' });
    console.log('onNavUser42');
  }

  #guardUnsub = null;
  #ctx = null;

  #log(msg) {
    let ts = new Date().toLocaleTimeString();
    this.$.logText = `[${ts}] ${msg}\n` + this.$.logText;
  }

  #updateUrl() {
    this.$.currentUrl = window.location.pathname + window.location.search;
  }

  #doNav(route, options = {}) {
    this.#log(`🔗 navigate('${route}', ${JSON.stringify(options)})`);
    AppRouter.navigate(route, options);
    this.#updateUrl();
  }

  renderCallback() {
    this.#ctx = AppRouter.initRoutingCtx('R', {
      home: { 
        pattern: '/', 
        title: 'Home', 
        default: true,
      },
      about: { 
        pattern: '/about',
        title: 'About',
      },
      user: { 
        pattern: '/users/:id',
        title: 'User Profile',
      },
      settings: {
        pattern: '/settings',
        title: 'Settings',
        load: () => {
          this.#log('⏳ Lazy loading settings module...');
          return new Promise((r) => setTimeout(() => {
            this.#log('✅ Settings module loaded');
            r();
          }, 500));
        },
      },
      notFound: { 
        pattern: '/404',
        title: 'Not Found',
        error: true,
      },
    });

    this.sub('R/route', (route) => {
      this.$.currentRoute = route || '—';
      this.#log(`📍 Route changed: ${route}`);
    });

    this.sub('R/options', (opts) => {
      this.$.currentOptions = opts ? JSON.stringify(opts) : '—';
    });

    this.sub('R/title', (title) => {
      this.$.currentTitle = title || '—';
    });

    this.sub('R/route', () => this.#updateUrl());

    this.sub('guardEnabled', (val) => {
      if (val) {
        this.#guardUnsub = AppRouter.beforeRoute((to, from) => {
          this.#log(`🛡️ Guard: ${from?.route || 'null'} → ${to.route}`);
          if (to.route === 'settings') {
            this.#log('🚫 Blocked → home');
            return 'home';
          }
        });
        this.#log('🛡️ Guard enabled');
      } else {
        this.#guardUnsub?.();
        this.#guardUnsub = null;
        this.#log('🛡️ Guard disabled');
      }
    });

    this.#log('🚀 Router initialized');
    this.#updateUrl();
  }
}

RouterDemo.template = html`
  <div class="section-label">Programmatic (JS)</div>
  <div class="btn-row">
    <button ${{ onclick: 'navHome' }}>Home</button>
    <button ${{ onclick: 'navAbout' }}>About</button>
    <button ${{ onclick: 'onNavUser42' }}>User #42</button>
    <button ${{ onclick: 'navUser99' }}>User #99</button>
    <button ${{ onclick: 'navUser42Params' }}>User #42 + params</button>
    <button ${{ onclick: 'navSettings' }}>Settings</button>
    <button ${{ onclick: 'do404' }}>404 Test</button>
  </div>

  <div class="section-label">HTML Links (intercepted)</div>
  <div class="link-row" ${{ onclick: 'handleLinkClick' }}>
    <a href="/">/</a>
    <a href="/about">/about</a>
    <a href="/users/42">/users/42</a>
    <a href="/users/42?tab=posts&verbose">/users/42?tab=…</a>
    <a href="/settings">/settings</a>
    <a href="/unknown/path">/unknown/path</a>
  </div>

  <div class="guard-row">
    <input type="checkbox" id="guard-cb" ${{ onchange: 'onGuardToggle' }}>
    <label for="guard-cb">Auth guard (blocks Settings → Home)</label>
  </div>

  <div class="state-grid">
    <div class="state-card">
      <div class="card-label">Route</div>
      <div class="card-value">{{currentRoute}}</div>
    </div>
    <div class="state-card">
      <div class="card-label">Options</div>
      <div class="card-value">{{currentOptions}}</div>
    </div>
    <div class="state-card">
      <div class="card-label">Title</div>
      <div class="card-value">{{currentTitle}}</div>
    </div>
    <div class="state-card">
      <div class="card-label">URL</div>
      <div class="card-value">{{currentUrl}}</div>
    </div>
  </div>

  <div class="section-label">Event Log</div>
  <pre class="log" ${{ textContent: 'logText' }}></pre>
`;

RouterDemo.rootStyles = css`
  router-demo {
    display: block;

    & .section-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 8px 0 6px;
    }

    & .btn-row, & .link-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    & .btn-row button {
      font-family: var(--font);
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      cursor: pointer;

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
      }
    }

    & .link-row a {
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: #3fb950;
      text-decoration: none;

      &:hover {
        border-color: #3fb950;
      }
    }

    & .guard-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 8px 0;
      font-size: 12px;
      color: var(--text-muted);

      & input {
        accent-color: var(--accent);
      }
    }

    & .state-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }

    & .state-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
    }

    & .card-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    & .card-value {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--accent);
      word-break: break-all;
    }

    & .log {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px;
      max-height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
      margin: 0;
    }
  }
`;

RouterDemo.reg('router-demo');
