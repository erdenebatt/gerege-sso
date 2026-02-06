// Gerege SSO Admin Dashboard JavaScript

const API_KEY = sessionStorage.getItem('admin_key');

// Redirect to login if no API key
if (!API_KEY) {
    window.location.href = '/admin/';
}

// Helper: Fetch with auth header
async function fetchWithAuth(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'X-Admin-Key': API_KEY,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 401) {
        sessionStorage.removeItem('admin_key');
        window.location.href = '/admin/';
        return null;
    }

    return response;
}

// Helper: Format date
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('mn-MN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: Truncate string
function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

// Load Stats
async function loadStats() {
    try {
        const resp = await fetchWithAuth('/api/admin/stats');
        if (!resp) return;

        const data = await resp.json();

        document.getElementById('statClients').textContent = data.clients?.total || 0;
        document.getElementById('statClientsActive').textContent = `${data.clients?.active || 0} идэвхтэй`;

        document.getElementById('statUsers').textContent = data.users?.total || 0;
        document.getElementById('statUsersVerified').textContent = `${data.users?.verified || 0} баталгаажсан`;

        document.getElementById('statLogins').textContent = data.logins_24h || 0;
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// Load Clients
async function loadClients() {
    try {
        const resp = await fetchWithAuth('/api/admin/clients');
        if (!resp) return;

        const data = await resp.json();
        const clients = data.clients || [];

        const tbody = document.getElementById('clientsTable');

        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Клиент бүртгэлгүй байна.</td></tr>';
            return;
        }

        tbody.innerHTML = clients.map(client => `
            <tr data-id="${client.id}">
                <td><strong>${escapeHtml(client.name)}</strong></td>
                <td><code>${truncate(client.client_id, 20)}</code></td>
                <td>${escapeHtml(truncate(client.redirect_uri, 40))}</td>
                <td>
                    <span class="status-badge ${client.is_active ? 'status-active' : 'status-inactive'}">
                        ${client.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                    </span>
                </td>
                <td>
                    <button class="action-btn" onclick="editClient('${client.id}', '${escapeHtml(client.name)}', '${escapeHtml(client.redirect_uri)}', '${(client.allowed_scopes || []).join(', ')}')">Засах</button>
                    <button class="action-btn danger" onclick="deleteClient('${client.id}', '${escapeHtml(client.name)}')">Устгах</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed to load clients:', err);
        document.getElementById('clientsTable').innerHTML =
            '<tr><td colspan="5" class="empty-state">Алдаа гарлаа.</td></tr>';
    }
}

// Load Audit Logs
async function loadAuditLogs() {
    try {
        const resp = await fetchWithAuth('/api/admin/audit-logs');
        if (!resp) return;

        const data = await resp.json();
        const logs = data.logs || [];

        const container = document.getElementById('logsContainer');

        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state">Лог бүртгэл байхгүй байна.</div>';
            return;
        }

        container.innerHTML = logs.map(log => `
            <div class="log-entry">
                <span class="log-time">${formatDate(log.created_at)}</span>
                <span class="log-action">${escapeHtml(log.action)}</span>
                <span class="log-user">${escapeHtml(log.user_email)}</span>
                <span class="log-ip">${escapeHtml(log.ip_address)}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load audit logs:', err);
        document.getElementById('logsContainer').innerHTML =
            '<div class="empty-state">Алдаа гарлаа.</div>';
    }
}

// Tab Navigation
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    document.querySelector(`.tab[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    if (tabName === 'logs') {
        loadAuditLogs();
    }
}

// Create Client Modal
function showCreateModal() {
    document.getElementById('createForm').reset();
    document.getElementById('secretBox').style.display = 'none';
    document.getElementById('createActions').style.display = 'flex';
    document.getElementById('doneActions').style.display = 'none';
    document.getElementById('createModal').classList.add('show');
}

function closeModal() {
    document.getElementById('createModal').classList.remove('show');
    loadClients();
    loadStats();
}

document.getElementById('createForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('clientName').value.trim();
    const redirectUri = document.getElementById('redirectUri').value.trim();
    const scopesStr = document.getElementById('scopes').value.trim();
    const scopes = scopesStr ? scopesStr.split(',').map(s => s.trim()).filter(Boolean) : ['openid', 'profile'];

    try {
        const resp = await fetchWithAuth('/api/admin/clients', {
            method: 'POST',
            body: JSON.stringify({ name, redirect_uri: redirectUri, scopes })
        });

        if (!resp) return;

        if (resp.ok) {
            const data = await resp.json();

            // Show the secret
            document.getElementById('newSecret').textContent = data.client_secret;
            document.getElementById('secretBox').style.display = 'block';
            document.getElementById('createActions').style.display = 'none';
            document.getElementById('doneActions').style.display = 'flex';

            // Disable form inputs
            document.getElementById('clientName').disabled = true;
            document.getElementById('redirectUri').disabled = true;
            document.getElementById('scopes').disabled = true;
        } else {
            const err = await resp.json();
            alert('Алдаа: ' + (err.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Failed to create client:', err);
        alert('Сүлжээний алдаа гарлаа.');
    }
});

// Edit Client
function editClient(id, name, redirectUri, scopes) {
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editRedirectUri').value = redirectUri;
    document.getElementById('editScopes').value = scopes;
    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
}

document.getElementById('editForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const redirectUri = document.getElementById('editRedirectUri').value.trim();
    const scopesStr = document.getElementById('editScopes').value.trim();
    const scopes = scopesStr ? scopesStr.split(',').map(s => s.trim()).filter(Boolean) : null;

    try {
        const resp = await fetchWithAuth(`/api/admin/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, redirect_uri: redirectUri, scopes })
        });

        if (!resp) return;

        if (resp.ok) {
            closeEditModal();
            loadClients();
        } else {
            const err = await resp.json();
            alert('Алдаа: ' + (err.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Failed to update client:', err);
        alert('Сүлжээний алдаа гарлаа.');
    }
});

// Delete Client
async function deleteClient(id, name) {
    if (!confirm(`"${name}" клиентийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) {
        return;
    }

    try {
        const resp = await fetchWithAuth(`/api/admin/clients/${id}`, {
            method: 'DELETE'
        });

        if (!resp) return;

        if (resp.ok) {
            loadClients();
            loadStats();
        } else {
            const err = await resp.json();
            alert('Алдаа: ' + (err.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Failed to delete client:', err);
        alert('Сүлжээний алдаа гарлаа.');
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('admin_key');
    window.location.href = '/admin/';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadClients();
});
