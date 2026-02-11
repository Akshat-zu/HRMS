const API_BASE = 'http://127.0.0.1:5000/api';

// --- Utils ---
async function apiCall(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        // Handle void responses or errors
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'API Error');
            return result;
        }
        if (!response.ok) throw new Error('API Error ' + response.status);
        return null;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --- Employees ---
async function loadEmployees() {
    const list = document.getElementById('employee-list');
    if (!list) return; // Not on employees page

    list.innerHTML = '<tr><td colspan="5" class="empty-state">Loading...</td></tr>';

    try {
        const employees = await apiCall('/employees');
        renderEmployeeTable(employees);
    } catch (e) {
        list.innerHTML = '<tr><td colspan="5" class="empty-state">Failed to load employees</td></tr>';
    }
}

function renderEmployeeTable(employees) {
    const list = document.getElementById('employee-list');
    list.innerHTML = '';

    if (employees.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="empty-state">No employees found</td></tr>';
        return;
    }

    employees.forEach(emp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${emp.id}</td>
            <td>${emp.name}</td>
            <td>${emp.email}</td>
            <td>${emp.department}</td>
            <td class="flex-row" style="gap: 0.5rem">
                <a href="/employee_history.html?id=${emp.id}" class="btn btn-primary btn-sm">History</a>
                <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${emp.id}')">Delete</button>
            </td>
        `;
        list.appendChild(row);
    });
}

async function addEmployee(event) {
    event.preventDefault();
    const form = event.target;

    const data = {
        employee_id: form.employee_id.value,
        name: form.name.value,
        email: form.email.value,
        department: form.department.value
    };

    try {
        await apiCall('/employees', 'POST', data);
        showToast('Employee added successfully');
        form.reset();
        loadEmployees();
    } catch (e) {
        // Error handled in apiCall
    }
}

async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
        await apiCall(`/employees/${id}`, 'DELETE');
        showToast('Employee deleted');
        loadEmployees();
    } catch (e) {
        // Error handled in apiCall
    }
}

// --- Attendance ---
async function loadAttendance() {
    const list = document.getElementById('attendance-list');
    if (!list) return;

    list.innerHTML = '<tr><td colspan="4" class="empty-state">Loading...</td></tr>';

    try {
        const records = await apiCall('/attendance');
        renderAttendanceTable(records);
    } catch (e) {
        list.innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load attendance</td></tr>';
    }
}

function renderAttendanceTable(records) {
    const list = document.getElementById('attendance-list');
    list.innerHTML = '';

    if (records.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="empty-state">No records found</td></tr>';
        return;
    }

    records.forEach(rec => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rec.date}</td>
            <td>${rec.employee_name || rec.employee_id}</td>
            <td>
                <span class="status-badge status-${rec.status}">${rec.status}</span>
            </td>
            <td>${rec.employee_id}</td>
        `;
        list.appendChild(row);
    });

    // Also Populate Employee Select Dropdown if it exists
    populateEmployeeSelect();
}

async function populateEmployeeSelect() {
    const select = document.getElementById('employee_id');
    if (!select) return;

    try {
        const employees = await apiCall('/employees');
        select.innerHTML = '<option value="">Select Employee</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.name} (${emp.id})`;
            select.appendChild(option);
        });
    } catch (e) {
        console.error("Failed to load employees for dropdown");
    }
}

async function markAttendance(event) {
    event.preventDefault();
    const form = event.target;

    const data = {
        employee_id: form.employee_id.value,
        date: form.date.value,
        status: form.status.value
    };

    try {
        await apiCall('/attendance', 'POST', data);
        showToast('Attendance marked');
        loadAttendance();
    } catch (e) {
        // Error handled in apiCall
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check which page we are on
    if (document.getElementById('employee-list')) {
        loadEmployees();
        document.getElementById('add-employee-form').addEventListener('submit', addEmployee);
    }

    if (document.getElementById('attendance-list')) {
        loadAttendance();
        document.getElementById('mark-attendance-form').addEventListener('submit', markAttendance);
        // Set default date to today
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
    }

    if (document.getElementById('total-employees')) {
        loadDashboardStats();
    }
});

// --- Dashboard ---
async function loadDashboardStats() {
    try {
        const stats = await apiCall('/dashboard-stats');

        document.getElementById('total-employees').textContent = stats.total_employees;
        document.getElementById('present-today').textContent = stats.today_present;
        document.getElementById('absent-today').textContent = stats.today_absent;

        initChart(stats.trend);
    } catch (e) {
        showToast('Failed to load dashboard stats', 'error');
    }
}

function initChart(trendData) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');

    const labels = trendData.map(d => d.date);
    const data = trendData.map(d => d.present_count);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Present Employees',
                data: data,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// --- Records ---
async function loadAttendanceRecords(query = '') {
    const list = document.getElementById('records-list');
    if (!list) return;

    list.innerHTML = '<tr><td colspan="4" class="empty-state">Loading...</td></tr>';

    try {
        const endpoint = query ? `/attendance?search=${encodeURIComponent(query)}` : '/attendance';
        const records = await apiCall(endpoint);

        list.innerHTML = '';
        if (records.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="empty-state">No records found</td></tr>';
            return;
        }

        records.forEach(rec => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rec.date}</td>
                <td>${rec.employee_name || 'N/A'}</td>
                <td>${rec.employee_id}</td>
                <td><span class="status-badge status-${rec.status}">${rec.status}</span></td>
            `;
            list.appendChild(row);
        });
    } catch (e) {
        list.innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load records</td></tr>';
    }
}

// --- History ---
async function loadEmployeeHistory(id) {
    const list = document.getElementById('history-list');
    const title = document.getElementById('history-title');
    const totalPresent = document.getElementById('total-present');
    const totalAbsent = document.getElementById('total-absent');

    if (!list) return;

    list.innerHTML = '<tr><td colspan="2" class="empty-state">Loading...</td></tr>';

    try {
        // Fetch Employee Details
        const employee = await apiCall(`/employees/${id}`);
        if (employee) {
            title.textContent = `Attendance History: ${employee.name}`;
        }

        // Fetch Attendance
        const records = await apiCall(`/attendance/${id}`);

        list.innerHTML = '';
        if (records.length === 0) {
            list.innerHTML = '<tr><td colspan="2" class="empty-state">No history found</td></tr>';
            totalPresent.textContent = '0';
            totalAbsent.textContent = '0';
            return;
        }

        let presentCount = 0;
        let absentCount = 0;

        records.forEach(rec => {
            if (rec.status === 'Present') presentCount++;
            if (rec.status === 'Absent') absentCount++;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rec.date}</td>
                <td><span class="status-badge status-${rec.status}">${rec.status}</span></td>
            `;
            list.appendChild(row);
        });

        totalPresent.textContent = presentCount;
        totalAbsent.textContent = absentCount;

    } catch (e) {
        list.innerHTML = '<tr><td colspan="2" class="empty-state">Failed to load history</td></tr>';
    }
}
