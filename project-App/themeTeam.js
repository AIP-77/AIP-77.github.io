// theme.js
class ThemeManager {
  constructor() {
    this.toggleBtn = document.getElementById('themeToggle');
    this.currentTheme = localStorage.getItem('theme') || 'auto';
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.toggleBtn?.addEventListener('click', () => this.toggle());
    
    // Слушаем системные настройки
    if (this.currentTheme === 'auto') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        this.applyTheme('auto');
      });
    }
  }

  applyTheme(mode) {
    const body = document.body;
    const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    body.classList.toggle('theme-dark', isDark);
    
    // Обновляем meta theme-color для PWA
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#1a1a2e' : '#1a73e8');
    }
    
    this.currentTheme = mode;
    localStorage.setItem('theme', mode);
  }

  toggle() {
    const modes = ['auto', 'light', 'dark'];
    const currentIndex = modes.indexOf(this.currentTheme);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.applyTheme(nextMode);
    
    // Визуальная индикация
    const icons = { 'auto': '🌓', 'light': '☀️', 'dark': '🌙' };
    this.toggleBtn.textContent = icons[nextMode];
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});
