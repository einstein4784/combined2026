// Reports Page JavaScript
// Access restricted to Admin and Supervisor roles

$(document).ready(function() {
    checkAccess();
    setDefaultDates();
    lucide.createIcons();
});

// Check if user has access to this page
async function checkAccess() {
    try {
        const user = await api.getCurrentUser();
        if (!user) {
            window.location.href = 'pages-login.html';
            return;
        }
        
        if (user.role !== 'Admin' && user.role !== 'Supervisor') {
            Swal.fire({
                title: 'Access Denied',
                text: 'This page is only accessible by Administrators and Supervisors.',
                icon: 'error',
                confirmButtonColor: '#1a365d'
            }).then(() => {
                window.location.href = 'index.html';
            });
        }
    } catch (error) {
        window.location.href = 'pages-login.html';
    }
}

// Set default dates to current month
function setDefaultDates() {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todayStr = formatDate(today);
    const firstStr = formatDate(firstOfMonth);
    
    // Set all date inputs
    $('#cashStartDate, #userStartDate, #policyStartDate, #paymentStartDate, #customerStartDate').val(firstStr);
    $('#cashEndDate, #userEndDate, #policyEndDate, #paymentEndDate, #customerEndDate').val(todayStr);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function getDateRange(period) {
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'today':
            startDate = endDate = today;
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
            endDate = today;
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
            break;
        case 'all':
            startDate = new Date(2000, 0, 1);
            endDate = today;
            break;
        default:
            return null;
    }
    
    return {
        start: formatDate(startDate),
        end: formatDate(endDate),
        display: period === 'all' ? 'All Time' : `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`
    };
}

function formatDisplayDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

// ========== CASH STATEMENT ==========
window.generateCashStatement = async function(period) {
    let startDate, endDate, dateRange;
    
    if (period === 'custom') {
        startDate = $('#cashStartDate').val();
        endDate = $('#cashEndDate').val();
        if (!startDate || !endDate) {
            Swal.fire('Error', 'Please select both start and end dates', 'error');
            return;
        }
        dateRange = `${formatDisplayDate(new Date(startDate))} to ${formatDisplayDate(new Date(endDate))}`;
    } else {
        const range = getDateRange(period);
        startDate = range.start;
        endDate = range.end;
        dateRange = range.display;
    }
    
    try {
        showLoading('Generating Cash Statement...');
        
        const report = await api.request(`/admin/reports/cash-statement?startDate=${startDate}&endDate=${endDate}`);
        
        // Group by payment method
        const byMethod = {};
        (report.payments || []).forEach(p => {
            const method = p.payment_method || 'Other';
            if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
            byMethod[method].count++;
            byMethod[method].total += parseFloat(p.amount) || 0;
        });
        
        const summary = [
            { value: formatCurrency(report.total || 0), label: 'Total Collected' },
            { value: (report.payments || []).length, label: 'Receipts' }
        ];
        
        Object.entries(byMethod).forEach(([method, data]) => {
            summary.push({ value: formatCurrency(data.total), label: method });
        });
        
        const reportData = {
            title: 'Cash Statement',
            dateRange: dateRange,
            summary: summary,
            headers: ['Receipt #', 'Customer', 'Policy #', 'Method', 'Amount'],
            rows: (report.payments || []).map(p => [
                p.receipt_number || '-',
                p.customer_name || '-',
                p.policy_number || '-',
                p.payment_method || '-',
                formatCurrency(p.amount || 0)
            ]),
            totals: ['', '', '', 'TOTAL', formatCurrency(report.total || 0)]
        };
        
        sessionStorage.setItem('reportData', JSON.stringify(reportData));
        Swal.close();
        window.location.href = 'report-viewer.html';
        
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
};

// ========== USER ACTIVITY REPORT ==========
window.generateUserReport = async function(period) {
    let startDate, endDate, dateRange;
    
    if (period === 'custom') {
        startDate = $('#userStartDate').val();
        endDate = $('#userEndDate').val();
        if (!startDate || !endDate) {
            Swal.fire('Error', 'Please select both start and end dates', 'error');
            return;
        }
        dateRange = `${formatDisplayDate(new Date(startDate))} to ${formatDisplayDate(new Date(endDate))}`;
    } else {
        const range = getDateRange(period);
        startDate = range.start;
        endDate = range.end;
        dateRange = range.display;
    }
    
    try {
        showLoading('Generating User Activity Report...');
        
        const report = await api.request(`/admin/reports/users?startDate=${startDate}&endDate=${endDate}`);
        
        if (!report || report.length === 0) {
            Swal.fire('Info', 'No user activity data for this period', 'info');
            return;
        }
        
        const reportData = {
            title: 'User Activity Report',
            dateRange: dateRange,
            summary: [
                { value: report.length, label: 'Total Users' },
                { value: report.reduce((sum, u) => sum + (u.total_actions || 0), 0), label: 'Total Actions' },
                { value: report.reduce((sum, u) => sum + (u.customers_created || 0), 0), label: 'Customers Created' },
                { value: report.reduce((sum, u) => sum + (u.policies_created || 0), 0), label: 'Policies Created' },
                { value: report.reduce((sum, u) => sum + (u.payments_received || 0), 0), label: 'Payments' }
            ],
            headers: ['Username', 'Full Name', 'Role', 'Actions', 'Customers', 'Policies', 'Payments', 'Last Active'],
            rows: report.map(u => [
                u.username || '',
                u.full_name || '',
                u.role || '',
                u.total_actions || 0,
                u.customers_created || 0,
                u.policies_created || 0,
                u.payments_received || 0,
                u.last_activity ? new Date(u.last_activity).toLocaleDateString() : 'Never'
            ]),
            totals: ['TOTALS', '', '',
                report.reduce((sum, u) => sum + (u.total_actions || 0), 0),
                report.reduce((sum, u) => sum + (u.customers_created || 0), 0),
                report.reduce((sum, u) => sum + (u.policies_created || 0), 0),
                report.reduce((sum, u) => sum + (u.payments_received || 0), 0),
                ''
            ]
        };
        
        sessionStorage.setItem('reportData', JSON.stringify(reportData));
        Swal.close();
        window.location.href = 'report-viewer.html';
        
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
};

// ========== POLICY REPORT ==========
window.generatePolicyReport = async function(period) {
    let startDate, endDate, dateRange;
    
    if (period === 'custom') {
        startDate = $('#policyStartDate').val();
        endDate = $('#policyEndDate').val();
        if (!startDate || !endDate) {
            Swal.fire('Error', 'Please select both start and end dates', 'error');
            return;
        }
        dateRange = `${formatDisplayDate(new Date(startDate))} to ${formatDisplayDate(new Date(endDate))}`;
    } else {
        const range = getDateRange(period);
        startDate = range.start;
        endDate = range.end;
        dateRange = range.display;
    }
    
    try {
        showLoading('Generating Policy Report...');
        
        const report = await api.request(`/admin/reports/policies?startDate=${startDate}&endDate=${endDate}`);
        
        if (!report || report.length === 0) {
            Swal.fire('Info', 'No policies found for this period', 'info');
            return;
        }
        
        const totalPremium = report.reduce((sum, p) => sum + (parseFloat(p.total_premium_due) || 0), 0);
        const totalPaid = report.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
        const totalOutstanding = report.reduce((sum, p) => sum + (parseFloat(p.outstanding_balance) || 0), 0);
        
        const reportData = {
            title: 'Policy Report',
            dateRange: dateRange,
            summary: [
                { value: report.length, label: 'Total Policies' },
                { value: formatCurrency(totalPremium), label: 'Total Premium' },
                { value: formatCurrency(totalPaid), label: 'Amount Paid' },
                { value: formatCurrency(totalOutstanding), label: 'Outstanding' }
            ],
            headers: ['Policy #', 'Customer', 'Premium', 'Paid', 'Outstanding', 'Status', 'Created'],
            rows: report.map(p => [
                p.policy_number || '',
                p.customer_name || '',
                formatCurrency(p.total_premium_due || 0),
                formatCurrency(p.amount_paid || 0),
                formatCurrency(p.outstanding_balance || 0),
                p.status || 'Active',
                p.created_at ? new Date(p.created_at).toLocaleDateString() : ''
            ]),
            totals: ['TOTALS', '', formatCurrency(totalPremium), formatCurrency(totalPaid), formatCurrency(totalOutstanding), '', '']
        };
        
        sessionStorage.setItem('reportData', JSON.stringify(reportData));
        Swal.close();
        window.location.href = 'report-viewer.html';
        
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
};

// ========== PAYMENT REPORT ==========
window.generatePaymentReport = async function(period) {
    let startDate, endDate, dateRange;
    
    if (period === 'custom') {
        startDate = $('#paymentStartDate').val();
        endDate = $('#paymentEndDate').val();
        if (!startDate || !endDate) {
            Swal.fire('Error', 'Please select both start and end dates', 'error');
            return;
        }
        dateRange = `${formatDisplayDate(new Date(startDate))} to ${formatDisplayDate(new Date(endDate))}`;
    } else {
        const range = getDateRange(period);
        startDate = range.start;
        endDate = range.end;
        dateRange = range.display;
    }
    
    try {
        showLoading('Generating Payment Report...');
        
        const report = await api.request(`/admin/reports/payments?startDate=${startDate}&endDate=${endDate}`);
        
        if (!report || !report.payments || report.payments.length === 0) {
            Swal.fire('Info', 'No payments found for this period', 'info');
            return;
        }
        
        // Group by method
        const byMethod = {};
        report.payments.forEach(p => {
            const method = p.payment_method || 'Other';
            if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
            byMethod[method].count++;
            byMethod[method].total += parseFloat(p.amount) || 0;
        });
        
        const summary = [
            { value: formatCurrency(report.total || 0), label: 'Total Payments' },
            { value: report.payments.length, label: 'Transactions' }
        ];
        
        Object.entries(byMethod).forEach(([method, data]) => {
            summary.push({ value: `${data.count} (${formatCurrency(data.total)})`, label: method });
        });
        
        const reportData = {
            title: 'Payment Report',
            dateRange: dateRange,
            summary: summary,
            headers: ['Date', 'Receipt #', 'Customer', 'Policy #', 'Method', 'Amount', 'Received By'],
            rows: report.payments.map(p => [
                p.date ? new Date(p.date).toLocaleDateString() : '-',
                p.receipt_number || '-',
                p.customer_name || '-',
                p.policy_number || '-',
                p.payment_method || '-',
                formatCurrency(p.amount || 0),
                p.received_by || '-'
            ]),
            totals: ['', '', '', '', 'TOTAL', formatCurrency(report.total || 0), '']
        };
        
        sessionStorage.setItem('reportData', JSON.stringify(reportData));
        Swal.close();
        window.location.href = 'report-viewer.html';
        
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
};

// ========== CUSTOMER REPORT ==========
window.generateCustomerReport = async function(period) {
    let params = '';
    let dateRange = 'All Customers';
    
    if (period === 'custom') {
        const startDate = $('#customerStartDate').val();
        const endDate = $('#customerEndDate').val();
        if (!startDate || !endDate) {
            Swal.fire('Error', 'Please select both start and end dates', 'error');
            return;
        }
        params = `?startDate=${startDate}&endDate=${endDate}`;
        dateRange = `${formatDisplayDate(new Date(startDate))} to ${formatDisplayDate(new Date(endDate))}`;
    } else if (period === 'arrears') {
        params = '?filter=arrears';
        dateRange = 'Customers with Arrears';
    } else if (period === 'new') {
        const today = new Date();
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        params = `?startDate=${formatDate(firstOfMonth)}&endDate=${formatDate(today)}`;
        dateRange = 'New This Month';
    }
    
    try {
        showLoading('Generating Customer Report...');
        
        const customers = await api.request(`/admin/reports/customers${params}`);
        
        if (!customers || customers.length === 0) {
            Swal.fire('Info', 'No customers found for this criteria', 'info');
            return;
        }
        
        const totalOutstanding = customers.reduce((sum, c) => sum + (parseFloat(c.total_outstanding) || 0), 0);
        const withArrears = customers.filter(c => (parseFloat(c.total_outstanding) || 0) > 0).length;
        
        const reportData = {
            title: 'Customer Report',
            dateRange: dateRange,
            summary: [
                { value: customers.length, label: 'Total Customers' },
                { value: withArrears, label: 'With Arrears' },
                { value: formatCurrency(totalOutstanding), label: 'Total Outstanding' }
            ],
            headers: ['ID #', 'Name', 'Contact', 'Email', 'Policies', 'Outstanding'],
            rows: customers.map(c => [
                c.id_number || '-',
                `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                c.contact_number || '-',
                c.email || '-',
                c.policy_count || 0,
                formatCurrency(c.total_outstanding || 0)
            ]),
            totals: ['', '', '', '', 'TOTAL', formatCurrency(totalOutstanding)]
        };
        
        sessionStorage.setItem('reportData', JSON.stringify(reportData));
        Swal.close();
        window.location.href = 'report-viewer.html';
        
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
};

function showLoading(message) {
    Swal.fire({
        title: message,
        text: 'Please wait...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
}

