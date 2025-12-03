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
    loadAuditLog();
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

function getCurrentUserInfo() {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
        try {
            return JSON.parse(userDataStr);
        } catch (e) {
            return { fullName: 'Unknown User', role: 'Unknown' };
        }
    }
    return { fullName: 'Unknown User', role: 'Unknown' };
}

// ========== PERMISSIONS MANAGEMENT ==========

async function loadSystemFunctions() {
    try {
        const response = await api.request('/admin/functions');
        systemFunctions = response;
        renderPermissions();
    } catch (error) {
        console.error('Error loading system functions:', error);
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
                            <button class="btn btn-sm btn-warning" onclick="closePeriodById('${data.id}')" title="Close Period">
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
            await api.request('/admin/periods/close-current', { method: 'POST' });
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
            await api.request(`/admin/periods/${id}/close`, { method: 'POST' });
            loadFinancialPeriods();
            Swal.fire('Closed!', 'The financial period has been closed.', 'success');
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to close period', 'error');
        }
    }
};

// ========== PROFESSIONAL REPORT GENERATION ==========

window.generateUserReport = async function() {
    try {
        Swal.fire({
            title: 'Generating User Report...',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const report = await api.request('/admin/reports/users');
        const user = getCurrentUserInfo();
        const now = new Date();
        
        if (!report || report.length === 0) {
            Swal.fire('Info', 'No user data to report', 'info');
            return;
        }
        
        // Create professional CSV report
        let csv = '';
        csv += '================================================================================\n';
        csv += '                        I&C INSURANCE BROKERS\n';
        csv += '                           USER REPORT\n';
        csv += '================================================================================\n\n';
        csv += `Report Generated: ${now.toLocaleString()}\n`;
        csv += `Generated By: ${user.fullName} (${user.role})\n`;
        csv += `Total Users: ${report.length}\n`;
        csv += '\n================================================================================\n\n';
        csv += 'Username,Full Name,Email,Role,Created At,Total Actions,Customers Created,Policies Created,Payments Received,Last Activity\n';
        
        report.forEach(u => {
            csv += `"${u.username || ''}","${u.full_name || ''}","${u.email || ''}","${u.role || ''}",`;
            csv += `"${formatDateTime(u.created_at)}","${u.total_actions || 0}","${u.customers_created || 0}",`;
            csv += `"${u.policies_created || 0}","${u.payments_received || 0}","${formatDateTime(u.last_activity)}"\n`;
        });
        
        csv += '\n================================================================================\n';
        csv += `                    END OF REPORT - ${now.toLocaleString()}\n`;
        csv += '================================================================================\n';
        
        downloadCSV(csv, `IC_User_Report_${formatDateForFilename(now)}.csv`);
        
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
            title: 'Generating Daily Cash Statement...',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const report = await api.request(`/admin/reports/cash-statement?startDate=${startDate}&endDate=${endDate}`);
        const user = getCurrentUserInfo();
        const now = new Date();
        
        // Create professional daily cash statement
        let csv = '';
        csv += '================================================================================\n';
        csv += '                        I&C INSURANCE BROKERS\n';
        csv += '                       DAILY CASH STATEMENT\n';
        csv += '================================================================================\n\n';
        csv += `Report Period: ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}\n`;
        csv += `Report Generated: ${now.toLocaleString()}\n`;
        csv += `Generated By: ${user.fullName} (${user.role})\n`;
        csv += '\n================================================================================\n';
        csv += '                           SUMMARY\n';
        csv += '================================================================================\n\n';
        csv += `Total Collections: ${formatCurrency(report.total || 0)}\n`;
        csv += `Number of Transactions: ${report.payments ? report.payments.length : 0}\n`;
        csv += '\n================================================================================\n';
        csv += '                    TRANSACTION DETAILS\n';
        csv += '================================================================================\n\n';
        
        if (report.payments && report.payments.length > 0) {
            csv += 'Date,Time,Receipt Number,Policy Number,Customer Name,Amount,Payment Method,Received By\n';
            
            let runningTotal = 0;
            report.payments.forEach(payment => {
                const paymentDate = payment.date ? new Date(payment.date) : new Date();
                runningTotal += parseFloat(payment.amount) || 0;
                
                csv += `"${paymentDate.toLocaleDateString()}","${paymentDate.toLocaleTimeString()}",`;
                csv += `"${payment.receipt_number || ''}","${payment.policy_number || ''}",`;
                csv += `"${payment.customer_name || ''}","${formatCurrency(payment.amount || 0)}",`;
                csv += `"${payment.payment_method || ''}","${payment.received_by || ''}"\n`;
            });
            
            csv += '\n================================================================================\n';
            csv += `RUNNING TOTAL: ${formatCurrency(runningTotal)}\n`;
        } else {
            csv += 'No transactions found for this date range.\n';
        }
        
        csv += '\n================================================================================\n';
        csv += '                         CERTIFICATION\n';
        csv += '================================================================================\n\n';
        csv += `I certify that this cash statement is accurate and complete.\n\n`;
        csv += `Prepared By: ${user.fullName}\n`;
        csv += `Date: ${now.toLocaleDateString()}\n`;
        csv += `Time: ${now.toLocaleTimeString()}\n`;
        csv += '\n\n_______________________________     _______________________________\n';
        csv += '        Cashier Signature                 Supervisor Signature\n';
        csv += '\n================================================================================\n';
        csv += `                    END OF STATEMENT - ${now.toLocaleString()}\n`;
        csv += '================================================================================\n';
        
        downloadCSV(csv, `IC_Cash_Statement_${startDate}_to_${endDate}.csv`);
        
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
        const user = getCurrentUserInfo();
        const now = new Date();
        
        if (!report || report.length === 0) {
            Swal.fire('Info', 'No policy data to report', 'info');
            return;
        }
        
        // Calculate summary stats
        const totalPremium = report.reduce((sum, p) => sum + (parseFloat(p.total_premium_due) || 0), 0);
        const totalPaid = report.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
        const totalOutstanding = report.reduce((sum, p) => sum + (parseFloat(p.outstanding_balance) || 0), 0);
        const activePolicies = report.filter(p => p.status === 'Active').length;
        
        // Create professional CSV report
        let csv = '';
        csv += '================================================================================\n';
        csv += '                        I&C INSURANCE BROKERS\n';
        csv += '                          POLICY REPORT\n';
        csv += '================================================================================\n\n';
        csv += `Report Generated: ${now.toLocaleString()}\n`;
        csv += `Generated By: ${user.fullName} (${user.role})\n`;
        csv += '\n================================================================================\n';
        csv += '                           SUMMARY\n';
        csv += '================================================================================\n\n';
        csv += `Total Policies: ${report.length}\n`;
        csv += `Active Policies: ${activePolicies}\n`;
        csv += `Total Premium Due: ${formatCurrency(totalPremium)}\n`;
        csv += `Total Amount Paid: ${formatCurrency(totalPaid)}\n`;
        csv += `Total Outstanding: ${formatCurrency(totalOutstanding)}\n`;
        csv += '\n================================================================================\n';
        csv += '                       POLICY DETAILS\n';
        csv += '================================================================================\n\n';
        csv += 'Policy Number,Customer Name,Customer ID,Total Premium,Amount Paid,Outstanding Balance,Status,Created Date\n';
        
        report.forEach(policy => {
            csv += `"${policy.policy_number || ''}","${policy.customer_name || ''}","${policy.customer_id_number || ''}",`;
            csv += `"${formatCurrency(policy.total_premium_due || 0)}","${formatCurrency(policy.amount_paid || 0)}",`;
            csv += `"${formatCurrency(policy.outstanding_balance || 0)}","${policy.status || ''}",`;
            csv += `"${formatDateTime(policy.created_at)}"\n`;
        });
        
        csv += '\n================================================================================\n';
        csv += `                    END OF REPORT - ${now.toLocaleString()}\n`;
        csv += '================================================================================\n';
        
        downloadCSV(csv, `IC_Policy_Report_${formatDateForFilename(now)}.csv`);
        
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

// ========== DATA EXPORT/IMPORT ==========

window.exportAllData = async function() {
    const selectedTypes = [];
    $('.export-check:checked').each(function() {
        selectedTypes.push($(this).val());
    });
    
    if (selectedTypes.length === 0) {
        Swal.fire('Error', 'Please select at least one data type to export', 'error');
        return;
    }
    
    try {
        Swal.fire({
            title: 'Exporting Data...',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const user = getCurrentUserInfo();
        const now = new Date();
        const exportData = {};
        
        // Fetch all selected data
        for (const type of selectedTypes) {
            try {
                exportData[type] = await api.request(`/admin/export/${type}`);
            } catch (e) {
                console.error(`Error exporting ${type}:`, e);
                exportData[type] = [];
            }
        }
        
        // Create combined CSV
        let csv = '';
        csv += '================================================================================\n';
        csv += '                        I&C INSURANCE BROKERS\n';
        csv += '                         DATA EXPORT BACKUP\n';
        csv += '================================================================================\n\n';
        csv += `Export Date: ${now.toLocaleString()}\n`;
        csv += `Exported By: ${user.fullName} (${user.role})\n`;
        csv += `Data Types: ${selectedTypes.join(', ')}\n`;
        csv += '\n';
        
        for (const [type, data] of Object.entries(exportData)) {
            if (data && data.length > 0) {
                csv += `\n================================================================================\n`;
                csv += `                         ${type.toUpperCase()}\n`;
                csv += `================================================================================\n\n`;
                
                const headers = Object.keys(data[0]);
                csv += headers.join(',') + '\n';
                
                data.forEach(row => {
                    const values = headers.map(h => {
                        let val = row[h];
                        if (val === null || val === undefined) val = '';
                        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                            val = '"' + val.replace(/"/g, '""') + '"';
                        }
                        return val;
                    });
                    csv += values.join(',') + '\n';
                });
                
                csv += `\nTotal ${type} records: ${data.length}\n`;
            }
        }
        
        csv += '\n================================================================================\n';
        csv += `                    END OF EXPORT - ${now.toLocaleString()}\n`;
        csv += '================================================================================\n';
        
        downloadCSV(csv, `IC_Data_Backup_${formatDateForFilename(now)}.csv`);
        
        Swal.fire({
            title: 'Success!',
            text: 'Data exported successfully',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Export error:', error);
        Swal.fire('Error', error.message || 'Failed to export data', 'error');
    }
};

window.importData = async function() {
    const importType = $('#importType').val();
    const fileInput = document.getElementById('importFile');
    
    if (!importType) {
        Swal.fire('Error', 'Please select a data type to import', 'error');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        Swal.fire('Error', 'Please select a CSV file to import', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    
    try {
        Swal.fire({
            title: 'Importing Data...',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('=') && !line.includes('I&C INSURANCE'));
        
        // Find the header line (first line with commas that looks like headers)
        let headerIndex = lines.findIndex(line => {
            const lower = line.toLowerCase();
            return lower.includes('name') || lower.includes('email') || lower.includes('policy') || lower.includes('customer');
        });
        
        if (headerIndex === -1) headerIndex = 0;
        
        const headers = lines[headerIndex].split(',').map(h => h.trim().replace(/"/g, ''));
        const dataLines = lines.slice(headerIndex + 1);
        
        const records = [];
        dataLines.forEach(line => {
            if (!line.trim()) return;
            
            // Parse CSV line (handle quoted values)
            const values = parseCSVLine(line);
            if (values.length === headers.length) {
                const record = {};
                headers.forEach((h, i) => {
                    record[h] = values[i];
                });
                records.push(record);
            }
        });
        
        if (records.length === 0) {
            Swal.fire('Error', 'No valid records found in file', 'error');
            return;
        }
        
        // Send to server
        const result = await api.request(`/admin/import/${importType}`, {
            method: 'POST',
            body: JSON.stringify({ records })
        });
        
        Swal.fire({
            title: 'Import Complete!',
            html: `<p>Successfully imported: ${result.imported || 0}</p><p>Skipped (duplicates): ${result.skipped || 0}</p>`,
            icon: 'success'
        });
        
        // Clear form
        $('#importType').val('');
        fileInput.value = '';
        
    } catch (error) {
        console.error('Import error:', error);
        Swal.fire('Error', error.message || 'Failed to import data', 'error');
    }
};

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    
    return result;
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
                    if (typeof data === 'object' && data !== null) {
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
            body: JSON.stringify({ customer_id: customerId, reason: reason })
        });
        
        Swal.fire('Success', 'Arrears override applied successfully.', 'success');
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
            
            await api.request('/admin/reset-system', { method: 'POST' });
            
            Swal.fire('Done', 'System has been reset.', 'success').then(() => {
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

function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleString();
    } catch (e) {
        return dateStr;
    }
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateStr;
    }
}

function formatDateForFilename(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

function downloadCSV(csvContent, filename) {
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
