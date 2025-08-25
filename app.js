// app.js (drop-in replacement or merge these changes)

class ManifestNow {
  constructor() {
    // Load state with error handling
    try {
      this.manifestations = JSON.parse(localStorage.getItem('manifestations')) || [];
      this.settings = JSON.parse(localStorage.getItem('settings')) || {
        reminderTime: '08:00',
        streak: 0,
        lastEngagement: null,
        notificationsEnabled: false,
        lastNotificationDate: null
      };
      this.customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      this.manifestations = [];
      this.settings = {
        reminderTime: '08:00',
        streak: 0,
        lastEngagement: null,
        notificationsEnabled: false,
        lastNotificationDate: null
      };
      this.customCategories = [];
    }
    
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

    // Data management
    const exportBtn = document.getElementById('exportData');
    const importBtn = document.getElementById('importData');
    const importFile = document.getElementById('importFile');

    if (exportBtn) exportBtn.onclick = () => this.exportData();
    if (importBtn) importBtn.onclick = () => importFile.click();
    if (importFile) importFile.onchange = (e) => this.importData(e);

    // Filters
    this.bindFilterEvents();
    
    // Keyboard shortcuts
    this.bindKeyboardShortcuts();
  }

  bindFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.onclick = (e) => this.setActiveFilter(e.target.dataset.category);
    });
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter to add manifestation
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.addManifestation();
      }
      
      // Escape to clear input
      if (e.key === 'Escape') {
        const input = document.getElementById('newManifestation');
        if (input && document.activeElement === input) {
          input.value = '';
          input.blur();
        }
      }
      
      // Ctrl/Cmd + S to export data
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.exportData();
      }
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

    // Validate input length
    if (text.length > 200) {
      this.showFeedback('❌ Manifestation is too long (max 200 characters)');
      return;
    }

    // Sanitize text to prevent XSS
    const sanitizedText = this.sanitizeText(text);

    const item = {
      id: Date.now(),
      text: sanitizedText,
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
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      if (last === yesterdayStr) {
        // Continue streak
        this.settings.streak += 1;
      } else if (last !== today) {
        // Reset streak if more than 1 day has passed
        this.settings.streak = 1;
      }
      
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
      const reminderTime = new Date();
      reminderTime.setHours(parseInt(h), parseInt(m), 0, 0);
      
      // Check if it's within 1 minute of the reminder time
      const timeDiff = Math.abs(now - reminderTime);
      if (timeDiff < 60000 && timeDiff > 0) {
        // Only show notification if we haven't shown one today
        const today = new Date().toDateString();
        if (this.settings.lastNotificationDate !== today) {
          this.showReminderNotification();
          this.settings.lastNotificationDate = today;
          this.saveSettings();
        }
      }
    }, 30000); // Check every 30 seconds instead of 60
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
    new Notification('🌟 ManifestNow - Daily Reminder', { body, tag: 'daily-reminder' });
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
    // Remove existing feedback messages
    const existing = document.querySelectorAll('.feedback-message');
    existing.forEach(el => el.remove());
    
    const t = document.createElement('div');
    t.textContent = msg;
    t.className = 'feedback-message';
    t.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:#fff;padding:12px 20px;border-radius:8px;z-index:1000;font-weight:600;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,.15);animation:slideIn 0.3s ease-out';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  loadCustomCategories() {
    // Load custom categories from localStorage
    this.customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
    this.updateCategoryFilters();
  }

  addCustomCategory() {
    const input = document.getElementById('customCategory');
    if (!input) return;
    
    const category = input.value.trim().toLowerCase();
    if (!category) {
      this.showFeedback('❌ Please enter a category name');
      return;
    }
    
    // Validate category name
    if (category.length < 2) {
      this.showFeedback('❌ Category name must be at least 2 characters');
      return;
    }
    
    if (category.length > 15) {
      this.showFeedback('❌ Category name is too long (max 15 characters)');
      return;
    }
    
    // Check for reserved names
    const reservedCategories = ['all', 'general', 'career', 'health', 'relationships', 'finances', 'personal'];
    if (reservedCategories.includes(category)) {
      this.showFeedback('❌ This category name is reserved');
      return;
    }
    
    if (this.customCategories.includes(category)) {
      this.showFeedback('❌ Category already exists');
      return;
    }
    
    this.customCategories.push(category);
    this.saveCustomCategories();
    this.updateCategoryFilters();
    input.value = '';
    this.showFeedback('✨ Category added!');
  }

  updateCategoryFilters() {
    const filtersContainer = document.getElementById('categoryFilters');
    const categorySelect = document.getElementById('categorySelect');
    if (!filtersContainer) return;
    
    // Keep the default filters
    const defaultFilters = ['all', 'general', 'career', 'health', 'relationships', 'finances', 'personal'];
    const allCategories = [...defaultFilters, ...this.customCategories];
    
    // Update the filter buttons
    const filterButtons = allCategories.map(category => {
      const displayName = this.getCategoryDisplay(category);
      const isActive = category === this.currentFilter ? 'active' : '';
      return `<button class="filter-btn ${isActive}" data-category="${category}">${displayName}</button>`;
    }).join('');
    
    filtersContainer.innerHTML = filterButtons;
    
    // Update the category dropdown
    if (categorySelect) {
      const defaultOptions = categorySelect.innerHTML;
      const customOptions = this.customCategories.map(category => 
        `<option value="${category}">${this.getCategoryDisplay(category)}</option>`
      ).join('');
      categorySelect.innerHTML = defaultOptions + customOptions;
    }
    
    this.bindFilterEvents();
  }

  sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  exportData() {
    const data = {
      manifestations: this.manifestations,
      settings: this.settings,
      customCategories: this.customCategories,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifestnow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showFeedback('📤 Data exported successfully!');
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.manifestations && data.settings && data.customCategories) {
          this.manifestations = data.manifestations;
          this.settings = { ...this.settings, ...data.settings };
          this.customCategories = data.customCategories;
          
          this.saveManifestations();
          this.saveSettings();
          this.saveCustomCategories();
          
          this.render();
          this.updateStats();
          this.updateCategoryFilters();
          
          this.showFeedback('📥 Data imported successfully!');
        } else {
          this.showFeedback('❌ Invalid backup file format');
        }
      } catch (error) {
        console.error('Error importing data:', error);
        this.showFeedback('❌ Error importing data');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  saveManifestations() { 
    try {
      localStorage.setItem('manifestations', JSON.stringify(this.manifestations));
    } catch (error) {
      console.error('Error saving manifestations:', error);
      this.showFeedback('❌ Error saving data');
    }
  }
  
  saveSettings() { 
    try {
      localStorage.setItem('settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showFeedback('❌ Error saving settings');
    }
  }
  
  saveCustomCategories() { 
    try {
      localStorage.setItem('customCategories', JSON.stringify(this.customCategories));
    } catch (error) {
      console.error('Error saving categories:', error);
      this.showFeedback('❌ Error saving categories');
    }
  }
}

// Ensure global app exists and DOM is ready before binding
let app = null;
document.addEventListener('DOMContentLoaded', () => {
  app = new ManifestNow();
  window.app = app; // Make it globally accessible
});

// Service worker registration (safe)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.log);
}
