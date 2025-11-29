// State management
const state = {
    user: null,
    tickets: [],
    users: [],
    currentTicket: null
};

// API helper
const api = {
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Request failed');
            return data;
        } catch (error) {
            throw error;
        }
    },
    
    auth: {
        login: (username, password) => api.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        }),
        logout: () => api.request('/api/auth/logout', { method: 'POST' }),
        me: () => api.request('/api/auth/me')
    },
    
    tickets: {
        list: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return api.request(`/api/tickets?${query}`);
        },
        get: (id) => api.request(`/api/tickets/${id}`),
        create: (data) => api.request('/api/tickets', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => api.request(`/api/tickets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    },
    
    comments: {
        list: (ticketId) => api.request(`/api/comments/ticket/${ticketId}`),
        create: (data) => api.request('/api/comments', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },
    
    users: {
        list: () => api.request('/api/users'),
        agents: () => api.request('/api/users/agents'),
        create: (data) => api.request('/api/users', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => api.request(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    },
    
    dashboard: {
        stats: () => api.request('/api/dashboard/stats')
    }
};

// Initialize app
async function init() {
    try {
        state.user = await api.auth.me();
        showMainApp();
        loadDashboard();
    } catch (error) {
        showLoginPage();
    }
}

// UI Functions
function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-name').textContent = state.user.full_name;
    
    // Hide admin-only elements for non-admins
    if (state.user.role !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }
}

function showPage(pageName) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.add('hidden'));
    document.getElementById(`${pageName}-page`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
}

function showModal(content) {
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `<div class="modal">${content}</div>`;
    overlay.classList.remove('hidden');
}

function hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('id-ID');
}

// Dashboard
async function loadDashboard() {
    try {
        const stats = await api.dashboard.stats();
        document.getElementById('stat-total').textContent = stats.total_tickets;
        document.getElementById('stat-open').textContent = stats.open_tickets;
        document.getElementById('stat-in-progress').textContent = stats.in_progress_tickets;
        document.getElementById('stat-resolved').textContent = stats.resolved_tickets;
    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}

// Tickets
async function loadTickets(filters = {}) {
    try {
        state.tickets = await api.tickets.list(filters);
        renderTickets();
    } catch (error) {
        console.error('Load tickets error:', error);
    }
}

function renderTickets() {
    const container = document.getElementById('tickets-list');
    
    if (state.tickets.length === 0) {
        container.innerHTML = '<p>No tickets found</p>';
        return;
    }
    
    container.innerHTML = state.tickets.map(ticket => `
        <div class="ticket-card" onclick="viewTicket(${ticket.id})">
            <div class="ticket-header">
                <span class="ticket-number">${ticket.ticket_number}</span>
                <div>
                    <span class="badge badge-${ticket.status}">${ticket.status.replace('_', ' ')}</span>
                    <span class="badge badge-${ticket.priority}">${ticket.priority}</span>
                </div>
            </div>
            <h3 class="ticket-title">${ticket.title}</h3>
            <div class="ticket-meta">
                <span>Customer: ${ticket.customer_name}</span>
                ${ticket.assigned_name ? `<span>Assigned: ${ticket.assigned_name}</span>` : ''}
                <span>${formatDate(ticket.created_at)}</span>
            </div>
        </div>
    `).join('');
}

async function viewTicket(ticketId) {
    try {
        const ticket = await api.tickets.get(ticketId);
        const comments = await api.comments.list(ticketId);
        state.currentTicket = ticket;
        
        let agentsSelect = '';
        if (state.user.role !== 'customer') {
            const agents = await api.users.agents();
            agentsSelect = `
                <div class="form-group">
                    <label>Assign to</label>
                    <select id="ticket-assigned">
                        <option value="">Unassigned</option>
                        ${agents.map(a => `
                            <option value="${a.id}" ${ticket.assigned_to === a.id ? 'selected' : ''}>
                                ${a.full_name}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }
        
        const canEdit = state.user.role !== 'customer' || ticket.customer_id === state.user.id;
        
        showModal(`
            <div class="modal-header">
                <h2>${ticket.ticket_number}</h2>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="ticket-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="ticket-title" value="${ticket.title}" ${!canEdit ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="ticket-description" ${!canEdit ? 'readonly' : ''}>${ticket.description}</textarea>
                </div>
                ${state.user.role !== 'customer' ? `
                    <div class="form-group">
                        <label>Status</label>
                        <select id="ticket-status">
                            <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
                            <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                            <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <select id="ticket-priority">
                            <option value="low" ${ticket.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${ticket.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${ticket.priority === 'high' ? 'selected' : ''}>High</option>
                            <option value="urgent" ${ticket.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                        </select>
                    </div>
                    ${agentsSelect}
                ` : ''}
                ${canEdit ? '<button type="submit" class="btn btn-primary">Update Ticket</button>' : ''}
            </form>
            
            <div class="comments-section">
                <h3>Comments</h3>
                <div id="comments-list">
                    ${comments.map(c => `
                        <div class="comment ${c.is_internal ? 'comment-internal' : ''}">
                            <div class="comment-header">
                                <span class="comment-author">${c.user_name} ${c.is_internal ? '(Internal)' : ''}</span>
                                <span class="comment-date">${formatDate(c.created_at)}</span>
                            </div>
                            <p>${c.comment}</p>
                        </div>
                    `).join('')}
                </div>
                
                <form id="comment-form" style="margin-top: 1rem;">
                    <div class="form-group">
                        <textarea id="comment-text" placeholder="Add a comment..." required></textarea>
                    </div>
                    ${state.user.role !== 'customer' ? `
                        <label>
                            <input type="checkbox" id="comment-internal"> Internal note
                        </label>
                    ` : ''}
                    <button type="submit" class="btn btn-primary btn-sm">Add Comment</button>
                </form>
            </div>
        `);
        
        document.getElementById('ticket-form').addEventListener('submit', updateTicket);
        document.getElementById('comment-form').addEventListener('submit', addComment);
    } catch (error) {
        alert('Error loading ticket: ' + error.message);
    }
}

async function updateTicket(e) {
    e.preventDefault();
    try {
        const data = {
            title: document.getElementById('ticket-title').value,
            description: document.getElementById('ticket-description').value
        };
        
        if (state.user.role !== 'customer') {
            data.status = document.getElementById('ticket-status').value;
            data.priority = document.getElementById('ticket-priority').value;
            data.assigned_to = document.getElementById('ticket-assigned').value || null;
        }
        
        await api.tickets.update(state.currentTicket.id, data);
        alert('Ticket updated successfully');
        hideModal();
        loadTickets();
    } catch (error) {
        alert('Error updating ticket: ' + error.message);
    }
}

async function addComment(e) {
    e.preventDefault();
    try {
        const data = {
            ticket_id: state.currentTicket.id,
            comment: document.getElementById('comment-text').value,
            is_internal: document.getElementById('comment-internal')?.checked || false
        };
        
        await api.comments.create(data);
        viewTicket(state.currentTicket.id);
    } catch (error) {
        alert('Error adding comment: ' + error.message);
    }
}

function showNewTicketModal() {
    showModal(`
        <div class="modal-header">
            <h2>New Ticket</h2>
            <button class="modal-close" onclick="hideModal()">&times;</button>
        </div>
        <form id="new-ticket-form">
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="new-ticket-title" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="new-ticket-description" required></textarea>
            </div>
            <div class="form-group">
                <label>Priority</label>
                <select id="new-ticket-priority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Create Ticket</button>
        </form>
    `);
    
    document.getElementById('new-ticket-form').addEventListener('submit', createTicket);
}

async function createTicket(e) {
    e.preventDefault();
    try {
        const data = {
            title: document.getElementById('new-ticket-title').value,
            description: document.getElementById('new-ticket-description').value,
            priority: document.getElementById('new-ticket-priority').value
        };
        
        await api.tickets.create(data);
        alert('Ticket created successfully');
        hideModal();
        loadTickets();
    } catch (error) {
        alert('Error creating ticket: ' + error.message);
    }
}

// Users
async function loadUsers() {
    try {
        state.users = await api.users.list();
        renderUsers();
    } catch (error) {
        console.error('Load users error:', error);
    }
}

function renderUsers() {
    const container = document.getElementById('users-list');
    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                ${state.users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.full_name}</td>
                        <td>${user.email}</td>
                        <td><span class="badge">${user.role}</span></td>
                        <td>${user.is_active ? 'Active' : 'Inactive'}</td>
                        <td>${formatDate(user.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showNewUserModal() {
    showModal(`
        <div class="modal-header">
            <h2>New User</h2>
            <button class="modal-close" onclick="hideModal()">&times;</button>
        </div>
        <form id="new-user-form">
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="new-user-username" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="new-user-password" required>
            </div>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="new-user-fullname" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="new-user-email" required>
            </div>
            <div class="form-group">
                <label>Role</label>
                <select id="new-user-role">
                    <option value="customer">Customer</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Create User</button>
        </form>
    `);
    
    document.getElementById('new-user-form').addEventListener('submit', createUser);
}

async function createUser(e) {
    e.preventDefault();
    try {
        const data = {
            username: document.getElementById('new-user-username').value,
            password: document.getElementById('new-user-password').value,
            full_name: document.getElementById('new-user-fullname').value,
            email: document.getElementById('new-user-email').value,
            role: document.getElementById('new-user-role').value
        };
        
        await api.users.create(data);
        alert('User created successfully');
        hideModal();
        loadUsers();
    } catch (error) {
        alert('Error creating user: ' + error.message);
    }
}

// Event Listeners
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const result = await api.auth.login(username, password);
        state.user = result.user;
        showMainApp();
        loadDashboard();
    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await api.auth.logout();
        state.user = null;
        showLoginPage();
    } catch (error) {
        console.error('Logout error:', error);
    }
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.dataset.page;
        showPage(page);
        
        if (page === 'tickets') loadTickets();
        if (page === 'users') loadUsers();
        if (page === 'dashboard') loadDashboard();
    });
});

document.getElementById('new-ticket-btn').addEventListener('click', showNewTicketModal);
document.getElementById('new-user-btn')?.addEventListener('click', showNewUserModal);

document.getElementById('search-tickets').addEventListener('input', (e) => {
    const filters = {
        search: e.target.value,
        status: document.getElementById('filter-status').value,
        priority: document.getElementById('filter-priority').value
    };
    loadTickets(filters);
});

document.getElementById('filter-status').addEventListener('change', (e) => {
    const filters = {
        search: document.getElementById('search-tickets').value,
        status: e.target.value,
        priority: document.getElementById('filter-priority').value
    };
    loadTickets(filters);
});

document.getElementById('filter-priority').addEventListener('change', (e) => {
    const filters = {
        search: document.getElementById('search-tickets').value,
        status: document.getElementById('filter-status').value,
        priority: e.target.value
    };
    loadTickets(filters);
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') hideModal();
});

// Initialize
init();
