class ManifestNow {
    constructor() {
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
        this.init();
    }

    init() {
        this.updateStreak();
        this.loadCustomCategories();
        this.render();
        this.bindEvents();
        this.loadSettings();
        this.updateStats();
        this.setupNotifications();
    }

    bindEvents() {
        document.getElementById('addBtn').addEventListener('click', () => this.addManifestation());
        document.getElementById('newManifestation').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addManifestation();
        });
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.addCustomCategory());
        document.getElementById('customCategory').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCustomCategory();
        });
        document.getElementById('reminderTime').addEventListener('change', (e) => {
            this.settings.reminderTime = e.target.value;
            this.saveSettings();
            this.setupNotifications();
        });
        document.getElementById('testNotification').addEventListener('click', () => this.testNotification());
        this.bindFilterEvents();
    }

    bindFilterEvents() {
        document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.category);
            });
        });
    }

    addManifestation() {
        const input = document.getElementById('newManifestation');
        const categorySelect = document.getElementById('categorySelect');
        const text = input.value.trim();
        const category = categorySelect.value;

        if (!text) {
            this.showFeedback('❌ Please enter a manifestation');
            return;
        }

        const manifestation = {
            id: Date.now(),
            text,
            category,
            status: 'active',
            dateAdded: new Date().toISOString(),
            dateAchieved: null,
        };

        this.manifestations.unshift(manifestation);
        this.saveManifestations();

        input.value = '';
        this.render();
        this.updateStats();
        this.showFeedback('✨ Manifestation added to the universe!');
    }

    addCustomCategory() {
        const input = document.getElementById('customCategory');
        const categoryName = input.value.trim().toLowerCase();

        if (!categoryName || categoryName.length < 2) {
            this.showFeedback('❌ Category name must be at least 2 characters');
            return;
        }

        if (this.customCategories.includes(categoryName)) {
            this.showFeedback('❌ Category already exists');
            return;
        }

        const defaultCategories = [
            'general',
            'career',
            'health',
            'relationships',
            'finances',
            'personal',
        ];
        if (defaultCategories.includes(categoryName)) {
            this.showFeedback('❌ This category already exists');
            return;
        }

        this.customCategories.push(categoryName);
        this.saveCustomCategories();
        this.loadCustomCategories();

        input.value = '';
        document.getElementById('categorySelect').value = categoryName;
        this.showFeedback('✅ Category added successfully!');
    }

    loadCustomCategories() {
        const categorySelect = document.getElementById('categorySelect');
        const categoryFilters = document.getElementById('categoryFilters');

        // Remove existing custom options
        Array.from(categorySelect.options).forEach((option) => {
            if (
                ![
                    'general',
                    'career',
                    'health',
                    'relationships',
                    'finances',
                    'personal',
                ].includes(option.value)
            ) {
                option.remove();
            }
        });

        // Remove existing custom filter buttons
        const existingCustomBtns = categoryFilters.querySelectorAll(
            '.filter-btn:not([data-category="all"]):not([data-category="general"]):not([data-category="career"]):not([data-category="health"]):not([data-category="relationships"]):not([data-category="finances"]):not([data-category="personal"])'
        );
        existingCustomBtns.forEach((btn) => btn.remove());

        // Add custom categories
        this.customCategories.forEach((category) => {
            // Add to select dropdown
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.getCategoryDisplay(category);
            categorySelect.appendChild(option);

            // Add to filter buttons
            const filterBtn = document.createElement('button');
            filterBtn.className = 'filter-btn';
            filterBtn.dataset.category = category;
            filterBtn.textContent = this.getCategoryDisplay(category);
            categoryFilters.appendChild(filterBtn);
        });

        // Rebind filter events
        this.bindFilterEvents();
    }

    achieveManifestation(id) {
        const manifestation = this.manifestations.find((m) => m.id === id);
        if (manifestation) {
            manifestation.status = 'achieved';
            manifestation.dateAchieved = new Date().toISOString();
            this.saveManifestations();
            this.updateStreak();
            this.render();
            this.updateStats();
            this.showFeedback('🎉 Manifestation achieved! Gratitude to the universe!');
        }
    }

    reactivateManifestation(id) {
        const manifestation = this.manifestations.find((m) => m.id === id);
        if (manifestation) {
            manifestation.status = 'active';
            manifestation.dateAchieved = null;
            this.saveManifestations();
            this.render();
            this.updateStats();
            this.showFeedback('🔄 Manifestation reactivated!');
        }
    }

    setActiveFilter(category) {
        this.currentFilter = category;

        document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        this.render();
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastEngagement = this.settings.lastEngagement;

        if (lastEngagement !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastEngagement === yesterday.toDateString()) {
                this.settings.streak += 1;
            } else if (!lastEngagement || lastEngagement !== today) {
                this.settings.streak = 1;
            }

            this.settings.lastEngagement = today;
            this.saveSettings();
        }
    }

    updateStats() {
        const totalManifested = this.manifestations.filter((m) => m.status === 'achieved').length;
        const thisMonth = this.manifestations.filter((m) => {
            if (m.status !== 'achieved') return false;
            const achievedDate = new Date(m.dateAchieved);
            const now = new Date();
            return (
                achievedDate.getMonth() === now.getMonth() && achievedDate.getFullYear() === now.getFullYear()
            );
        }).length;
        const activeCount = this.manifestations.filter((m) => m.status === 'active').length;

        document.getElementById('totalManifested').textContent = totalManifested;
        document.getElementById('thisMonth').textContent = thisMonth;
        document.getElementById('activeCount').textContent = activeCount;
    }

    render() {
        this.renderActive();
        this.renderAchievements();
        this.renderStreak();
    }

    renderActive() {
        const activeList = document.getElementById('activeList');
        let active = this.manifestations.filter((m) => m.status === 'active');

        if (this.currentFilter !== 'all') {
            active = active.filter((m) => m.category === this.currentFilter);
        }

        if (active.length === 0) {
            activeList.innerHTML = '<div class="empty-state">No active manifestations in this category ✨</div>';
            return;
        }

        activeList.innerHTML = active
            .map(
                (m) => `
            <div class="manifestation-item">
                <span class="category-badge category-${m.category}">${this.getCategoryDisplay(m.category)}</span>
                <div class="manifestation-text">${m.text}</div>
                <div class="manifestation-date">Added ${this.formatDate(m.dateAdded)}</div>
                <div class="action-buttons">
                    <button class="achieve-btn" onclick="app.achieveManifestation(${m.id})">
                        ✓ Manifested
                    </button>
                </div>
            </div>
        `
            )
            .join('');
    }

    renderAchievements() {
        const achievementsList = document.getElementById('achievementsList');
        let achieved = this.manifestations.filter((m) => m.status === 'achieved');

        if (this.currentFilter !== 'all') {
            achieved = achieved.filter((m) => m.category === this.currentFilter);
        }

        if (achieved.length === 0) {
            achievementsList.innerHTML =
                '<div class="empty-state">Your manifested blessings will appear here 🙏</div>';
            return;
        }

        achievementsList.innerHTML = achieved
            .map(
                (m) => `
            <div class="manifestation-item achieved-item">
                <span class="category-badge category-${m.category}">${this.getCategoryDisplay(m.category)}</span>
                <div class="manifestation-text">${m.text}</div>
                <div class="gratitude-message">
                    🙏 Thank you, Universe, for manifesting this blessing into my life!
                </div>
                <div class="manifestation-date achievement-date">Manifested ${this.formatDate(m.dateAchieved)}</div>
                <div class="action-buttons">
                    <button class="reactivate-btn" onclick="app.reactivateManifestation(${m.id})">
                        🔄 Reactivate
                    </button>
                </div>
            </div>
        `
            )
            .join('');
    }

    renderStreak() {
        document.getElementById('streakCount').textContent = this.settings.streak;
    }

    getCategoryDisplay(category) {
        const categories = {
            general: 'General',
            career: 'Career',
            health: 'Health',
            relationships: 'Love',
            finances: 'Money',
            personal: 'Growth',
        };

        return categories[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    loadSettings() {
        document.getElementById('reminderTime').value = this.settings.reminderTime;
        this.updateNotificationStatus();
    }

    async setupNotifications() {
        if ('Notification' in window) {
            if (this.settings.notificationsEnabled) {
                this.scheduleReminder();
            }
        }
    }

    scheduleReminder() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
        }

        this.reminderInterval = setInterval(() => {
            const now = new Date();
            const [hours, minutes] = this.settings.reminderTime.split(':');
            const reminderTime = new Date();
            reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const timeDiff = Math.abs(now - reminderTime);
            if (timeDiff < 60000) {
                this.showReminderNotification();
            }
        }, 60000);
    }

    async testNotification() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.settings.notificationsEnabled = true;
                this.saveSettings();
                this.showReminderNotification();
                this.setupNotifications();
                this.updateNotificationStatus();
                this.showFeedback('🔔 Test notification sent! Daily reminders are now active.');
            } else {
                this.settings.notificationsEnabled = false;
                this.saveSettings();
                this.updateNotificationStatus();
                this.showFeedback('❌ Please enable notifications in your browser settings.');
            }
        }
    }

    showReminderNotification() {
        const active = this.manifestations.filter((m) => m.status === 'active');
        if (active.length === 0) return;

        const randomManifestations = this.getRandomItems(active, Math.min(3, active.length));
        const message = randomManifestations.map((m) => `• ${m.text}`).join('\n');

        new Notification('🌟 ManifestNow - Daily Reminder', {
            body: `Time to focus on your manifestations:\n${message}`,
            icon: 'icon-192.png',
            tag: 'daily-reminder',
        });
    }

    updateNotificationStatus() {
        const statusText = document.getElementById('statusText');

        if (this.settings.notificationsEnabled) {
            const [hours] = this.settings.reminderTime.split(':');
            const timeString = this.formatTime12Hour(hours, '00');
            statusText.textContent = `Daily reminders active at ${timeString}`;
        } else {
            statusText.textContent = 'Click "Test Reminder" to enable notifications';
        }
    }

    formatTime12Hour(hours, minutes) {
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:00 ${ampm}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        return `${diffDays} days ago`;
    }

    getRandomItems(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    showFeedback(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-weight: 600;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    saveManifestations() {
        localStorage.setItem('manifestations', JSON.stringify(this.manifestations));
    }

    saveSettings() {
        localStorage.setItem('settings', JSON.stringify(this.settings));
    }

    saveCustomCategories() {
        localStorage.setItem('customCategories', JSON.stringify(this.customCategories));
    }
}

// Initialize app when page loads
let app;
document.addEventListener('DOMContentLoaded', function () {
    app = new ManifestNow();
});

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.log);
}
