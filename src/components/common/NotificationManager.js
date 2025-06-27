export class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'notifications-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 5000) {
        const id = Date.now() + Math.random();
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.dataset.id = id;
        
        // Extended duration for important messages
        if (type === 'success' && (message.includes('PDF') || message.includes('processed'))) {
            duration = 8000;
        }
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${this.getIcon(type)}
                </div>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add improved styles
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            border: 1px solid ${this.getBorderColor(type)};
            color: ${this.getTextColor(type)};
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
            max-width: 100%;
            word-wrap: break-word;
        `;

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Auto remove (only if duration > 0)
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }

        // Manual close
        notification.querySelector('.notification-close').onclick = () => this.remove(notification);
        
        return notification;
    }

    remove(notification) {
        if (!notification) return;
        
        if (typeof notification === 'object' && notification.dataset && notification.dataset.id) {
            // Remove from map
            this.notifications.delete(notification.dataset.id);
            
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        return icons[type] || icons.info;
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#f0f9ff',
            error: '#fef2f2',
            info: '#f8fafc',
            warning: '#fffbeb'
        };
        return colors[type] || colors.info;
    }

    getBorderColor(type) {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        return colors[type] || colors.info;
    }

    getTextColor(type) {
        const colors = {
            success: '#065f46',
            error: '#991b1b',
            info: '#1e40af',
            warning: '#92400e'
        };
        return colors[type] || colors.info;
    }

    success(message) { return this.show(message, 'success'); }
    error(message) { return this.show(message, 'error'); }
    info(message) { return this.show(message, 'info', 0); } // No auto-remove for info
}

// Add CSS animations
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}