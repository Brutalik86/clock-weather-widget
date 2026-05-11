window.ThemeManager = {
  registry: {
    default: { name: 'Стандартная (Glass)', logo: false },
    eve: { name: 'EVE Online (Sci-Fi)', logo: true, logoPath: 'themes/eve/eve-logo.svg' }
  },
  
  init() {
    const saved = localStorage.getItem('widget-theme') || 'default';
    this.apply(saved);
    this.populateSelect();
    this.injectLogo();
    document.getElementById('theme-select')?.addEventListener('change', e => this.apply(e.target.value));
  },

  apply(key) {
    if (!this.registry[key]) return;
    localStorage.setItem('widget-theme', key);
    const link = document.getElementById('theme-stylesheet');
    if (link) link.href = `themes/${key}/${key}.css`;
    document.body.setAttribute('data-theme', key);
    const sel = document.getElementById('theme-select');
    if (sel) sel.value = key;
    this.injectLogo();
  },

  injectLogo() {
    const key = localStorage.getItem('widget-theme') || 'default';
    const theme = this.registry[key];
    const clockSection = document.querySelector('.clock-section');
    const oldLogo = document.getElementById('eve-logo');
    if (oldLogo) oldLogo.remove();
    if (theme && theme.logo && clockSection) {
      const img = document.createElement('img');
      img.id = 'eve-logo';
      img.src = theme.logoPath;
      img.alt = 'Theme Logo';
      clockSection.insertBefore(img, clockSection.firstChild);
    }
  },

  populateSelect() {
    const sel = document.getElementById('theme-select');
    if (!sel) return;
    sel.innerHTML = '';
    for (const [k, v] of Object.entries(this.registry)) {
      const o = document.createElement('option');
      o.value = k; o.textContent = v.name;
      sel.appendChild(o);
    }
  }
};

if (document.readyState === 'loading') 
  document.addEventListener('DOMContentLoaded', () => window.ThemeManager.init());
else 
  window.ThemeManager.init();