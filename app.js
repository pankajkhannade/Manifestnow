// app.js (drop-in replacement or merge these changes)

class ManifestNow {
  constructor() {
    // Load state
    this.manifestations = JSON.parse(localStorage.getItem('manifestations')) || [];
    this.settings = JSON.parse(localStorage.getItem('settings')) || {
      reminderTime: '08:00',
      streak: 0,
      lastEngagement: null,
      notificationsEnabled: false
    };
    this.customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
    this.currentFilter = 'all';
    this.reminderInterval = null;

    // Init
    this.updateStreak();
    this.loadCustomCategories();
    this.render();
    this.bindEvents();
    this.loadSettings();
    this.updateStats();
    this.setupNotifications();
  }

  // Robust event binding with element checks
  bindEvents() {
    const addBtn = document.getElementById('addBtn');
    const newInput = document.getElementById('newManifestation');
    const addCatBtn = document.getElementById('addCategoryBtn');
    const customCat = document.getElementById('customCategory');
    const reminderSel = document.getElementById('reminderTime');
    const testBtn = document.getElementById('testNotification');

    if (!addBtn || !newInput) {
      console.error('Required elements missing: addBtn/newManifestation');
      this.showFeedback('❌ UI not ready. Reload the page.');
      return;
    }

    addBtn.onclick = () => this.addManifestation();
    newInput.onkeypress = (e) => { if (e.key === 'Enter') this.addManifestation(); };

    if (addCatBtn) addCatBtn.onclick = () => this.addCustomCategory();
    if (customCat) customCat.onkeypress = (e) => { if (e.key === 'Enter') this.addCustomCategory(); };

    if (reminderSel) reminderSel.onchange = (e) => {
      this.settings.reminderTime = e.target.value;
      this.saveSettings();
      this.setupNotifications();
    };

    if (testBtn) testBtn.onclick = () => this.testNotification();

    // Filters
    this.bindFilterEvents();
  }

  bindFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.onclick = (e) => this.setActiveFilter(e.target.dataset.category);
    });
  }

  addManifestation() {
    const input = document.getElementById('newManifestation');
    const select = document.getElementById('categorySelect');

    if (!input || !select) {
      console.error('Missing input/select for Add');
      this.showFeedback('❌ Something went wrong. Reload the page.');
      return;
    }

    const text = input.value.trim();
    const category = select.value;

    if (!text) {
      this.showFeedback('❌ Please enter a manifestation');
      return;
    }

    const item = {
      id: Date.now(),
      text,
      category,
      status: 'active',
      dateAdded: new Date().toISOString(),
      dateAchieved: null
    };

    // Persist and render
    this.manifestations.unshift(item);
    this.saveManifestations();
    input.value = '';
    this.render();
    this.updateStats();
    this.showFeedback('✨ Manifestation added to the universe!');
  }

  achieveManifestation(id) {
    const m = this.manifestations.find((x) => x.id === id);
    if (!m) return;
    m.status = 'achieved';
    m.dateAchieved = new Date().toISOString();
    this.saveManifestations();
    this.updateStreak();
    this.render();
    this.updateStats();
    this.showFeedback('🎉 Manifestation achieved!');
  }

  reactivateManifestation(id) {
    const m = this.manifestations.find((x) => x.id === id);
    if (!m) return;
    m.status = 'active';
    m.dateAchieved = null;
    this.saveManifestations();
    this.render();
    this.updateStats();
    this.showFeedback('🔄 Manifestation reactivated!');
  }

  setActiveFilter(category) {
    this.currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-category="${category}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    this.render();
  }

  // UI renders (unchanged from your working version, shortened)
  render() {
    this.renderActive();
    this.renderAchievements();
    this.renderStreak();
  }

  renderActive() {
    const el = document.getElementById('activeList');
    if (!el) return;
    let items = this.manifestations.filter((m) => m.status === 'active');
    if (this.currentFilter !== 'all') items = items.filter((m) => m.category === this.currentFilter);
    if (!items.length) {
      el.innerHTML = '<div class="empty-state">No active manifestations in this category ✨</div>';
      return;
    }
    el.innerHTML = items.map((m) => `
      <div class="manifestation-item">
        <span class="category-badge category-${m.category}">${this.getCategoryDisplay(m.category)}</span>
        <div class="manifestation-text">${m.text}</div>
        <div class="manifestation-date">Added ${this.formatDate(m.dateAdded)}</div>
        <div class="action-buttons">
          <button class="achieve-btn" onclick="app.achieveManifestation(${m.id})">✓ Manifested</button>
        </div>
      </div>
    `).join('');
  }

  renderAchievements() {
    const el = document.getElementById('achievementsList');
    if (!el) return;
    let items = this.manifestations.filter((m) => m.status === 'achieved');
    if (this.currentFilter !== 'all') items = items.filter((m) => m.category === this.currentFilter);
    if (!items.length) {
      el.innerHTML = '<div class="empty-state">Your manifested blessings will appear here 🙏</div>';
      return;
    }
    el.innerHTML = items.map((m) => `
      <div class="manifestation-item achieved-item">
        <span class="category-badge category-${m.category}">${this.getCategoryDisplay(m.category)}</span>
        <div class="manifestation-text">${m.text}</div>
        <div class="gratitude-message">🙏 Thank you, Universe, for manifesting this blessing into my life!</div>
        <div class="manifestation-date achievement-date">Manifested ${this.formatDate(m.dateAchieved)}</div>
        <div class="action-buttons">
          <button class="reactivate-btn" onclick="app.reactivateManifestation(${m.id})">🔄 Reactivate</button>
        </div>
      </div>
    `).join('');
  }

  renderStreak() {
    const s = document.getElementById('streakCount');
    if (s) s.textContent = this.settings.streak;
  }

  // Helpers and persistence
  updateStreak() {
    const today = new Date().toDateString();
    const last = this.settings.lastEngagement;
    if (last !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      this.settings.streak = (last === y.toDateString()) ? (this.settings.streak + 1) : 1;
      this.settings.lastEngagement = today;
      this.saveSettings();
    }
  }

  updateStats() {
    const total = this.manifestations.filter((m) => m.status === 'achieved').length;
    const month = this.manifestations.filter((m) => {
      if (m.status !== 'achieved') return false;
      const d = new Date(m.dateAchieved), n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    }).length;
    const active = this.manifestations.filter((m) => m.status === 'active').length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('totalManifested', total);
    set('thisMonth', month);
    set('activeCount', active);
  }

  getCategoryDisplay(c) {
    const map = { general: 'General', career: 'Career', health: 'Health', relationships: 'Love', finances: 'Money', personal: 'Growth' };
    return map[c] || c.charAt(0).toUpperCase() + c.slice(1);
  }

  loadSettings() {
    const sel = document.getElementById('reminderTime');
    if (sel) sel.value = this.settings.reminderTime;
    this.updateNotificationStatus();
  }

  async setupNotifications() {
    if ('Notification' in window && this.settings.notificationsEnabled) this.scheduleReminder();
  }

  scheduleReminder() {
    if (this.reminderInterval) clearInterval(this.reminderInterval);
    this.reminderInterval = setInterval(() => {
      const now = new Date();
      const [h, m] = this.settings.reminderTime.split(':');
      const t = new Date(); t.setHours(parseInt(h), parseInt(m), 0, 0);
      if (Math.abs(now - t) < 60000) this.showReminderNotification();
    }, 60000);
  }

  async testNotification() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.settings.notificationsEnabled = true;
      this.saveSettings();
      this.showReminderNotification();
      this.setupNotifications();
      this.updateNotificationStatus();
      this.showFeedback('🔔 Test notification sent! Reminders active.');
    } else {
      this.settings.notificationsEnabled = false;
      this.saveSettings();
      this.updateNotificationStatus();
      this.showFeedback('❌ Enable notifications in browser settings.');
    }
  }

  showReminderNotification() {
    const active = this.manifestations.filter((m) => m.status === 'active');
    if (!active.length) return;
    const picks = this.getRandomItems(active, Math.min(3, active.length));
    const body = picks.map((m) => `• ${m.text}`).join('\n');
    new Notification('🌟 ManifestNow - Daily Reminder', { body, icon: 'icon-192.png', tag: 'daily-reminder' });
  }

  updateNotificationStatus() {
    const el = document.getElementById('statusText');
    if (!el) return;
    if (this.settings.notificationsEnabled) {
      const [h] = this.settings.reminderTime.split(':');
      el.textContent = `Daily reminders active at ${this.formatTime12Hour(h, '00')}`;
    } else {
      el.textContent = 'Click "Test Reminder" to enable notifications';
    }
  }

  formatTime12Hour(hours, minutes) {
    const h = parseInt(hours), ampm = h >= 12 ? 'PM' : 'AM', hh = h % 12 || 12;
    return `${hh}:${minutes} ${ampm}`;
  }

  formatDate(s) {
    const d = new Date(s), t = new Date(), diff = Math.floor(Math.abs(t - d) / 86400000);
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    return `${diff} days ago`;
  }

  getRandomItems(arr, n) {
    const a = [...arr].sort(() => 0.5 - Math.random());
    return a.slice(0, n);
  }

  showFeedback(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:#fff;padding:12px 20px;border-radius:8px;z-index:1000;font-weight:600;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,.15)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  saveManifestations() { localStorage.setItem('manifestations', JSON.stringify(this.manifestations)); }
  saveSettings() { localStorage.setItem('settings', JSON.stringify(this.settings)); }
  saveCustomCategories() { localStorage.setItem('customCategories', JSON.stringify(this.customCategories)); }
}

// Ensure global app exists and DOM is ready before binding
window.app = null;
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ManifestNow();
});

// Service worker registration (safe)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.log);
}
