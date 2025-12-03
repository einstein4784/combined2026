// Admin Settings Page JavaScript
let selectedRole = 'Underwriter';
let systemFunctions = {};
let rolePermissions = {};
let periodsTable;
let auditTable;

$(document).ready(function() {
    loadSystemFunctions();
    loadRolePermissions();
    initPeriodsTable();
    initAuditTable();
    loadFinancialPeriods();
    loadCustomersWithArrears();
    setupEventHandlers();
    setDefaultReportDates();
    lucide.createIcons();
});

function setupEventHandlers() {
    // Role selection
    $('.role-tab').on('click', function() {
        if ($(this).hasClass('disabled')) return;
        
        $('.role-tab').removeClass('active');
        $(this).addClass('active');
        selectedRole = $(this).data('role');
        $('#selectedRoleName').text(selectedRole);
        renderPermissions();
    });
}

function setDefaultReportDates() {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    $('#reportStartDate').val(formatDateForInput(firstOfMonth));
    $('#reportEndDate').val(formatDateForInput(today));
    $('#auditDateFilter').val(formatDateForInput(today));
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// ========== PERMISSIONS MANAGEMENT ==========

async function loadSystemFunctions() {
    try {
        const response = await api.request('/admin/functions');
        systemFunctions = response;
        renderPermissions();
    } catch (error) {
        console.error('Error loading system functions:', error);
        // Use default functions if API fails
        systemFunctions = getDefaultFunctions();
        renderPermissions();
    }
}

function getDefaultFunctions() {
    return {
        create_edit_customer: { id: 'create_edit_customer', name: 'Create/Edit Customer', description: 'Ability to create and edit customers', category: 'Customer Management' },
        create_edit_policy: { id: 'create_edit_policy', name: 'Create/Edit Policy', description: 'Ability to create and edit policies', category: 'Policy Management' },
        receive_payment: { id: 'receive_payment', name: 'Receive Payment', description: 'Ability to receive payments', category: 'Payment Processing' },
        generate_user_report: { id: 'generate_user_report', name: 'Generate User Report', description: 'Ability to generate user reports', category: 'Reporting' },
        generate_cash_statements: { id: 'generate_cash_statements', name: 'Generate Cash Statements', description: 'Ability to generate cash statements', category: 'Reporting' },
        create_edit_delete_user: { id: 'create_edit_delete_user', name: 'Create/Edit/Delete User', description: 'Ability to manage users', category: 'User Management' },
        override_outstanding_balance: { id: 'override_outstanding_balance', name: 'Override Outstanding Balance', description: 'Ability to override arrears rule', category: 'Payment Processing' },
        reset_system: { id: 'reset_system', name: 'Reset System', description: 'Ability to reset all data', category: 'System Administration' },
        close_period: { id: 'close_period', name: 'Close Period', description: 'Ability to close financial periods', category: 'Financial Management' },
        view_dashboard: { id: 'view_dashboard', name: 'View Dashboard', description: 'Ability to view dashboard', category: 'General' },
        manage_permissions: { id: 'manage_permissions', name: 'Manage Permissions', description: 'Ability to manage role permissions', category: 'System Administration' }
    };
}

async function loadRolePermissions() {
    try {
        const response = await api.request('/admin/permissions');
        rolePermissions = {};
        response.forEach(rp => {
            rolePermissions[rp.role] = rp.permissions || [];
        });
        updatePermissionCounts();
        renderPermissions();
    } catch (error) {
        console.error('Error loading role permissions:', error);
    }
}

function updatePermissionCounts() {
    $('#underwriter-count').text(rolePermissions['Underwriter']?.length || 0);
    $('#cashier-count').text(rolePermissions['Cashier']?.length || 0);
    $('#supervisor-count').text(rolePermissions['Supervisor']?.length || 0);
}

function renderPermissions() {
    const container = $('#permissionsContainer');
    container.empty();
    
    const functions = Object.values(systemFunctions);
    const currentPermissions = rolePermissions[selectedRole] || [];
    
    // Group by category
    const categories = {};
    functions.forEach(func => {
        const cat = func.category || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(func);
    });
    
    const categoryColors = {
        'Customer Management': 'customer',
        'Policy Management': 'policy',
        'Payment Processing': 'payment',
        'Reporting': 'reporting',
        'User Management': 'user',
        'System Administration': 'system',
        'Financial Management': 'financial',
        'General': 'general'
    };
    
    for (const [category, funcs] of Object.entries(categories)) {
        const categoryClass = categoryColors[category] || 'general';
        
        container.append(`
            <div class="col-12 mb-3">
                <h6 class="text-muted text-uppercase small">${category}</h6>
            </div>
        `);
        
        funcs.forEach(func => {
            const isChecked = currentPermissions.includes(func.id);
            const isDangerous = func.id === 'reset_system' || func.id === 'manage_permissions';
            
            container.append(`
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card permission-card category-${categoryClass} h-100">
                        <div class="card-body">
                            <div class="form-check form-switch mb-2">
                                <input class="form-check-input permission-checkbox" type="checkbox" 
                                    id="perm_${func.id}" 
                                    data-permission="${func.id}"
                                    ${isChecked ? 'checked' : ''}>
                                <label class="form-check-label fw-semibold ${isDangerous ? 'text-danger' : ''}" for="perm_${func.id}">
                                    ${func.name}
                                    ${isDangerous ? '<i data-lucide="alert-triangle" class="icon-xs ms-1"></i>' : ''}
                                </label>
                            </div>
                            <p class="text-muted small mb-0">${func.description}</p>
                        </div>
                    </div>
                </div>
            `);
        });
    }
    
    lucide.createIcons();
}

window.savePermissions = async function() {
    const permissions = [];
    $('.permission-checkbox:checked').each(function() {
        permissions.push($(this).data('permission'));
    });
    
    try {
        await api.request('/admin/permissions', {
            method: 'POST',
            body: JSON.stringify({
                role: selectedRole,
                permissions: permissions
            })
        });
        
        rolePermissions[selectedRole] = permissions;
        updatePermissionCounts();
        
        Swal.fire({
            title: 'Success!',
            text: `Permissions for ${selectedRole} saved successfully`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to save permissions', 'error');
    }
};

// ========== FINANCIAL PERIODS ==========

function initPeriodsTable() {
    periodsTable = $('#periods-table').DataTable({
        responsive: true,
        order: [[1, 'desc']],
        columns: [
            { data: 'period_name' },
            { 
                data: 'start_date',
                render: function(data) {
                    return new Date(data).toLocaleDateString();
                }
            },
            { 
                data: 'end_date',
                render: function(data) {
                    return new Date(data).toLocaleDateString();
                }
            },
            { 
                data: 'status',
                render: function(data) {
                    const badgeClass = data === 'Open' ? 'bg-success' : 'bg-secondary';
                    return `<span class="badge ${badgeClass}">${data}</span>`;
                }
            },
            { 
                data: 'total_collections',
                render: function(data) {
                    return formatCurrency(data || 0);
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    if (data.status === 'Open') {
                        return `
                            <button class="btn btn-sm btn-warning" onclick="closePeriodById('${data._id}')" title="Close Period">
                                <i data-lucide="lock" class="icon-sm"></i>
                            </button>
                        `;
                    }
                    return '<span class="text-muted">Closed</span>';
                }
            }
        ]
    });
}

async function loadFinancialPeriods() {
    try {
        const periods = await api.request('/admin/periods');
        
        if (periodsTable) {
            periodsTable.clear();
            periodsTable.rows.add(periods);
            periodsTable.draw();
        }
        
        // Find current open period
        const currentPeriod = periods.find(p => p.status === 'Open');
        if (currentPeriod) {
            $('#currentPeriodName').text(currentPeriod.period_name);
            $('#currentPeriodDates').text(
                `${new Date(currentPeriod.start_date).toLocaleDateString()} - ${new Date(currentPeriod.end_date).toLocaleDateString()}`
            );
            $('#currentPeriodStatus').text(currentPeriod.status);
            $('#periodCollections').text(formatCurrency(currentPeriod.total_collections || 0));
            $('#periodPolicies').text(currentPeriod.total_policies_created || 0);
        }
        
        // Load period statistics
        loadPeriodStatistics();
        
        lucide.createIcons();
    } catch (error) {
        console.error('Error loading financial periods:', error);
    }
}

async function loadPeriodStatistics() {
    try {
        const stats = await api.request('/admin/period-stats');
        $('#periodPayments').text(stats.payment_count || 0);
        $('#periodPolicies').text(stats.policy_count || 0);
        $('#periodCollections').text(formatCurrency(stats.total_collections || 0));
    } catch (error) {
        console.error('Error loading period statistics:', error);
    }
}

window.openNewPeriodModal = function() {
    $('#periodForm')[0].reset();
    const modal = new bootstrap.Modal(document.getElementById('periodModal'));
    modal.show();
};

window.savePeriod = async function() {
    const periodData = {
        period_name: $('#periodName').val(),
        start_date: $('#periodStartDate').val(),
        end_date: $('#periodEndDate').val()
    };
    
    if (!periodData.period_name || !periodData.start_date || !periodData.end_date) {
        Swal.fire('Error', 'Please fill in all fields', 'error');
        return;
    }
    
    try {
        await api.request('/admin/periods', {
            method: 'POST',
            body: JSON.stringify(periodData)
        });
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('periodModal'));
        modal.hide();
        
        loadFinancialPeriods();
        
        Swal.fire({
            title: 'Success!',
            text: 'Financial period created successfully',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to create period', 'error');
    }
};

window.closePeriod = async function() {
    const result = await Swal.fire({
        title: 'Close Current Period?',
        text: 'No more transactions can be recorded for a closed period. This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f0ad4e',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, close it!'
    });
    
    if (result.isConfirmed) {
        try {
            await api.request('/admin/periods/close-current', {
                method: 'POST'
            });
            
            loadFinancialPeriods();
            
            Swal.fire('Closed!', 'The financial period has been closed.', 'success');
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to close period', 'error');
        }
    }
};

window.closePeriodById = async function(id) {
    const result = await Swal.fire({
        title: 'Close This Period?',
        text: 'No more transactions can be recorded for a closed period.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f0ad4e',
        confirmButtonText: 'Yes, close it!'
    });
    
    if (result.isConfirmed) {
        try {
            await api.request(`/admin/periods/${id}/close`, {
                method: 'POST'
            });
            
            loadFinancialPeriods();
            
            Swal.fire('Closed!', 'The financial period has been closed.', 'success');
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to close period', 'error');
        }
    }
};

// ========== REPORTS ==========

window.generateUserReport = async function() {
    try {
        Swal.fire({
            title: 'Generating Report...',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const report = await api.request('/admin/reports/users');
        
        if (!report || report.length === 0) {
            Swal.fire('Info', 'No user data to report', 'info');
            return;
        }
        
        // Create downloadable report with activity data
        let csv = 'User Report - Generated: ' + new Date().toLocaleString() + '\n\n';
        csv += 'Username,Full Name,Email,Role,Created At,Total Actions,Customers Created,Policies Created,Payments Received,Last Activity\n';
        
        report.forEach(user => {
            csv += `"${user.username || ''}","${user.full_name || ''}","${user.email || ''}","${user.role || ''}",`;
            csv += `"${user.created_at || ''}","${user.total_actions || 0}","${user.customers_created || 0}",`;
            csv += `"${user.policies_created || 0}","${user.payments_received || 0}","${user.last_activity || 'Never'}"\n`;
        });
        
        downloadCSV(csv, 'user_report_' + new Date().toISOString().split('T')[0] + '.csv');
        
        Swal.fire({
            title: 'Success!',
            text: 'User report downloaded successfully',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Report error:', error);
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
};

window.generateCashStatement = async function() {
    const startDate = $('#reportStartDate').val();
    const endDate = $('#reportEndDate').val();
    
    if (!startDate || !endDate) {
        Swal.fire('Error', 'Please select a date range', 'error');
        return;
    }
    
    try {
        Swal.fire({
            title: 'Generating Cash Statement...',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const report = await api.request(`/admin/reports/cash-statement?startDate=${startDate}&endDate=${endDate}`);
        
        // Create CSV
        let csv = 'Cash Statement Report\n';
        csv += `Date Range: ${startDate} to ${endDate}\n`;
        csv += `Total Collections: ${formatCurrency(report.total || 0)}\n`;
        csv += `Number of Payments: ${report.payments ? report.payments.length : 0}\n\n`;
        
        if (report.payments && report.payments.length > 0) {
            csv += 'Date,Receipt Number,Policy Number,Customer Name,Amount,Payment Method,Received By\n';
            
            report.payments.forEach(payment => {
                const date = payment.date ? new Date(payment.date).toLocaleDateString() : '';
                csv += `"${date}","${payment.receipt_number || ''}","${payment.policy_number || ''}",`;
                csv += `"${payment.customer_name || ''}","${payment.amount || 0}","${payment.payment_method || ''}",`;
                csv += `"${payment.received_by || ''}"\n`;
            });
        } else {
            csv += 'No payments found for this date range.\n';
        }
        
        downloadCSV(csv, `cash_statement_${startDate}_to_${endDate}.csv`);
        
        Swal.fire({
            title: 'Success!',
            text: 'Cash statement downloaded successfully',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Report error:', error);
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
};

window.generatePolicyReport = async function() {
    try {
        Swal.fire({
            title: 'Generating Policy Report...',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const report = await api.request('/admin/reports/policies');
        
        if (!report || report.length === 0) {
            Swal.fire('Info', 'No policy data to report', 'info');
            return;
        }
        
        // Create CSV
        let csv = 'Policy Report - Generated: ' + new Date().toLocaleString() + '\n\n';
        csv += 'Policy Number,Customer Name,Customer ID,Total Premium,Amount Paid,Outstanding Balance,Status,Created At\n';
        
        report.forEach(policy => {
            csv += `"${policy.policy_number || ''}","${policy.customer_name || ''}","${policy.customer_id_number || ''}",`;
            csv += `"${policy.total_premium_due || 0}","${policy.amount_paid || 0}","${policy.outstanding_balance || 0}",`;
            csv += `"${policy.status || ''}","${policy.created_at || ''}"\n`;
        });
        
        downloadCSV(csv, 'policy_report_' + new Date().toISOString().split('T')[0] + '.csv');
        
        Swal.fire({
            title: 'Success!',
            text: 'Policy report downloaded successfully',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Report error:', error);
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
};

function downloadCSV(csvContent, filename) {
    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// ========== AUDIT LOG ==========

function initAuditTable() {
    auditTable = $('#audit-table').DataTable({
        responsive: true,
        order: [[0, 'desc']],
        columns: [
            { 
                data: 'created_at',
                render: function(data) {
                    return new Date(data).toLocaleString();
                }
            },
            { data: 'user_name' },
            { data: 'action' },
            { data: 'entity_type' },
            { 
                data: 'details',
                render: function(data) {
                    if (typeof data === 'object') {
                        return `<small>${JSON.stringify(data).substring(0, 50)}...</small>`;
                    }
                    return data || '-';
                }
            }
        ]
    });
}

async function loadAuditLog() {
    try {
        const date = $('#auditDateFilter').val();
        const logs = await api.request(`/admin/audit-log${date ? '?date=' + date : ''}`);
        
        if (auditTable) {
            auditTable.clear();
            auditTable.rows.add(logs);
            auditTable.draw();
        }
    } catch (error) {
        console.error('Error loading audit log:', error);
    }
}

// ========== SYSTEM FUNCTIONS ==========

async function loadCustomersWithArrears() {
    try {
        const customers = await api.getCustomers();
        const select = $('#overrideCustomerId');
        select.empty().append('<option value="">Select customer with arrears...</option>');
        
        // Filter customers with policies that have outstanding balances
        const policies = await api.getPolicies();
        const customersWithArrears = {};
        
        policies.forEach(policy => {
            if (policy.outstanding_balance > 0) {
                customersWithArrears[policy.customer_id] = {
                    name: policy.customer_name,
                    outstanding: (customersWithArrears[policy.customer_id]?.outstanding || 0) + policy.outstanding_balance
                };
            }
        });
        
        for (const [customerId, info] of Object.entries(customersWithArrears)) {
            select.append(`<option value="${customerId}">${info.name} - Outstanding: ${formatCurrency(info.outstanding)}</option>`);
        }
    } catch (error) {
        console.error('Error loading customers with arrears:', error);
    }
}

window.applyArrearsOverride = async function() {
    const customerId = $('#overrideCustomerId').val();
    const reason = $('#overrideReason').val();
    
    if (!customerId) {
        Swal.fire('Error', 'Please select a customer', 'error');
        return;
    }
    
    if (!reason) {
        Swal.fire('Error', 'Please provide a reason for the override', 'error');
        return;
    }
    
    try {
        await api.request('/admin/override-arrears', {
            method: 'POST',
            body: JSON.stringify({
                customer_id: customerId,
                reason: reason
            })
        });
        
        Swal.fire('Success', 'Arrears override applied successfully. Customer can now make payments.', 'success');
        $('#overrideCustomerId').val('');
        $('#overrideReason').val('');
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to apply override', 'error');
    }
};

window.resetSystem = async function() {
    const result = await Swal.fire({
        title: 'DANGER: Reset System?',
        html: `
            <div class="text-start">
                <p class="text-danger fw-bold">This will permanently delete ALL data:</p>
                <ul>
                    <li>All customers</li>
                    <li>All policies</li>
                    <li>All payments</li>
                    <li>All receipts</li>
                    <li>All financial periods</li>
                </ul>
                <p class="mt-3">Type <strong>RESET</strong> to confirm:</p>
                <input type="text" id="resetConfirmInput" class="form-control">
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Reset System',
        preConfirm: () => {
            const input = document.getElementById('resetConfirmInput').value;
            if (input !== 'RESET') {
                Swal.showValidationMessage('Please type RESET to confirm');
                return false;
            }
            return true;
        }
    });
    
    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Resetting System...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            await api.request('/admin/reset-system', {
                method: 'POST'
            });
            
            Swal.fire('Done', 'System has been reset. All data has been deleted.', 'success').then(() => {
                window.location.reload();
            });
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to reset system', 'error');
        }
    }
};

// ========== UTILITIES ==========

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

