// BulkMaster Pro - API & Utility Module
const BulkAPI = {
    storage: {
        get(key, defaultValue = null) {
            try { const item = localStorage.getItem(`bulk_${key}`); return item ? JSON.parse(item) : defaultValue; }
            catch { return defaultValue; }
        },
        set(key, value) { localStorage.setItem(`bulk_${key}`, JSON.stringify(value)); }
    },

    orders: {
        getAll() { return BulkAPI.storage.get('orders', []); },
        save(orders) { BulkAPI.storage.set('orders', orders); },
        add(order) {
            const orders = this.getAll();
            order.id = 'ORD-' + Date.now().toString(36).toUpperCase();
            order.createdAt = new Date().toISOString();
            order.status = order.status || 'pending';
            orders.unshift(order);
            this.save(orders);
            return order;
        },
        update(id, updates) {
            const orders = this.getAll();
            const idx = orders.findIndex(o => o.id === id);
            if (idx !== -1) { Object.assign(orders[idx], updates); this.save(orders); return orders[idx]; }
            return null;
        },
        delete(id) { let orders = this.getAll(); orders = orders.filter(o => o.id !== id); this.save(orders); },
        bulkUpdate(ids, updates) {
            const orders = this.getAll();
            ids.forEach(id => {
                const idx = orders.findIndex(o => o.id === id);
                if (idx !== -1) Object.assign(orders[idx], updates);
            });
            this.save(orders);
        },
        bulkDelete(ids) {
            let orders = this.getAll();
            orders = orders.filter(o => !ids.includes(o.id));
            this.save(orders);
        }
    },

    workflows: {
        getAll() { return BulkAPI.storage.get('workflows', []); },
        save(workflows) { BulkAPI.storage.set('workflows', workflows); },
        add(workflow) {
            const workflows = this.getAll();
            workflow.id = 'WF-' + Date.now().toString(36).toUpperCase();
            workflow.createdAt = new Date().toISOString();
            workflow.runs = 0;
            workflows.unshift(workflow);
            this.save(workflows);
            return workflow;
        },
        delete(id) { let workflows = this.getAll(); workflows = workflows.filter(w => w.id !== id); this.save(workflows); },
        run(id) {
            const workflows = this.getAll();
            const workflow = workflows.find(w => w.id === id);
            if (workflow) {
                workflow.runs = (workflow.runs || 0) + 1;
                workflow.lastRun = new Date().toISOString();
                this.save(workflows);
                return this.executeWorkflow(workflow);
            }
            return { success: false, message: 'Workflow not found' };
        },
        executeWorkflow(workflow) {
            const orders = BulkAPI.orders.getAll();
            let affected = 0;

            orders.forEach(order => {
                if (this.matchesCondition(order, workflow.condition)) {
                    Object.assign(order, workflow.action);
                    affected++;
                }
            });

            BulkAPI.orders.save(orders);
            return { success: true, affected };
        },
        matchesCondition(order, condition) {
            if (!condition) return true;
            if (condition.status && order.status !== condition.status) return false;
            if (condition.minAmount && order.total < condition.minAmount) return false;
            if (condition.maxAmount && order.total > condition.maxAmount) return false;
            return true;
        }
    },

    templates: {
        getAll() { return BulkAPI.storage.get('templates', []); },
        save(templates) { BulkAPI.storage.set('templates', templates); },
        add(template) {
            const templates = this.getAll();
            template.id = 'TPL-' + Date.now().toString(36).toUpperCase();
            template.createdAt = new Date().toISOString();
            templates.unshift(template);
            this.save(templates);
            return template;
        },
        delete(id) { let templates = this.getAll(); templates = templates.filter(t => t.id !== id); this.save(templates); }
    },

    getAnalytics() {
        const orders = this.orders.getAll();
        const pending = orders.filter(o => o.status === 'pending');
        const fulfilled = orders.filter(o => o.status === 'fulfilled');
        const cancelled = orders.filter(o => o.status === 'cancelled');
        const revenue = fulfilled.reduce((sum, o) => sum + (o.total || 0), 0);

        return {
            total: orders.length,
            pending: pending.length,
            fulfilled: fulfilled.length,
            cancelled: cancelled.length,
            revenue,
            avgOrderValue: orders.length ? revenue / orders.length : 0
        };
    },

    toast: {
        show(message, type = 'info') {
            const container = document.getElementById('toast-container') || this.createContainer();
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i><span>${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
        },
        createContainer() {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
            document.body.appendChild(container);
            const style = document.createElement('style');
            style.textContent = `.toast{display:flex;align-items:center;gap:10px;padding:12px 20px;background:#1e1e3f;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;transform:translateX(120%);transition:transform 0.3s;}.toast.show{transform:translateX(0);}.toast-success{border-left:3px solid #10b981;}.toast-error{border-left:3px solid #ef4444;}.toast i{font-size:18px;}.toast-success i{color:#10b981;}.toast-error i{color:#ef4444;}`;
            document.head.appendChild(style);
            return container;
        },
        success(msg) { this.show(msg, 'success'); },
        error(msg) { this.show(msg, 'error'); }
    },

    format: {
        currency(num) { return '$' + Number(num).toFixed(2); },
        date(d) { return new Date(d).toLocaleDateString(); },
        timeAgo(date) {
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);
            if (seconds < 60) return 'Just now';
            if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
            if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
            return Math.floor(seconds / 86400) + 'd ago';
        }
    }
};

window.BulkAPI = BulkAPI;
