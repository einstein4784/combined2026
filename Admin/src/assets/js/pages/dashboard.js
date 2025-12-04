/**
 * Dashboard JavaScript - I&C Insurance Brokers
 * Handles live data fetching
 */

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
}

// Format time ago
function timeAgo(dateString) {
    var date = new Date(dateString);
    var now = new Date();
    var diffMs = now - date;
    var diffMins = Math.floor(diffMs / 60000);
    var diffHours = Math.floor(diffMs / 3600000);
    var diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Initialize dashboard
$(document).ready(function() {
    // Set today's date
    var today = new Date();
    $('#todayDate').text(today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }));
    
    // Load all dashboard data
    loadUserInfo();
    loadDashboardStats();
    loadRecentCustomers();
    loadRecentPolicies();
    loadRecentPayments();
    
    // Refresh data every 30 seconds
    setInterval(function() {
        loadDashboardStats();
        loadRecentCustomers();
        loadRecentPolicies();
        loadRecentPayments();
    }, 30000);
    
    // Reinitialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Load user info
async function loadUserInfo() {
    try {
        var user = await api.getCurrentUser();
        if (user) {
            $('#welcomeUserName').text(user.full_name || user.username || 'User');
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        var stats = await api.getDashboardStats();
        
        $('#statTotalCustomers').text((stats.totalCustomers || 0).toLocaleString());
        $('#statActivePolicies').text((stats.activePolicies || 0).toLocaleString());
        $('#statTotalOutstanding').text(formatCurrency(stats.totalOutstanding || 0));
        $('#statTodayPayments').text(formatCurrency(stats.todayPayments || 0));
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load recent customers
async function loadRecentCustomers() {
    try {
        var customers = await api.getCustomers();
        var recent = customers.slice(0, 5);
        
        var html = '';
        if (recent.length === 0) {
            html = '<div class="text-center py-4 text-muted">No customers yet</div>';
        } else {
            recent.forEach(function(customer) {
                var initials = ((customer.first_name || '').charAt(0) + (customer.last_name || '').charAt(0)).toUpperCase();
                html += '<div class="activity-item d-flex align-items-center">' +
                    '<div class="activity-icon bg-primary bg-opacity-10 text-primary me-3">' + initials + '</div>' +
                    '<div class="flex-grow-1">' +
                        '<h6 class="mb-0">' + customer.first_name + ' ' + customer.last_name + '</h6>' +
                        '<small class="text-muted">' + (customer.email || customer.contact_number || 'No contact') + '</small>' +
                    '</div>' +
                    '<small class="text-muted">' + timeAgo(customer.created_at) + '</small>' +
                '</div>';
            });
        }
        
        $('#recentCustomersList').html(html);
    } catch (error) {
        console.error('Error loading customers:', error);
        $('#recentCustomersList').html('<div class="text-center py-4 text-danger">Error loading data</div>');
    }
}

// Load recent policies
async function loadRecentPolicies() {
    try {
        var policies = await api.getPolicies();
        var recent = policies.slice(0, 5);
        
        var html = '';
        if (recent.length === 0) {
            html = '<div class="text-center py-4 text-muted">No policies yet</div>';
        } else {
            recent.forEach(function(policy) {
                var badgeClass = policy.coverage_type === 'Fully Comp' ? 'bg-success' : 'bg-warning text-dark';
                var statusBadge = policy.status === 'Active' ? 'bg-success' : 'bg-secondary';
                html += '<div class="activity-item">' +
                    '<div class="d-flex justify-content-between align-items-start mb-1">' +
                        '<h6 class="mb-0">' + policy.policy_number + '</h6>' +
                        '<span class="badge ' + statusBadge + '">' + policy.status + '</span>' +
                    '</div>' +
                    '<div class="d-flex justify-content-between align-items-center">' +
                        '<div>' +
                            '<small class="text-muted d-block">' + policy.customer_name + '</small>' +
                            '<span class="badge coverage-badge ' + badgeClass + '">' + (policy.coverage_type || 'N/A') + '</span>' +
                        '</div>' +
                        '<div class="text-end">' +
                            '<span class="fw-bold">' + formatCurrency(policy.total_premium_due) + '</span>' +
                            '<small class="text-danger d-block">Bal: ' + formatCurrency(policy.outstanding_balance) + '</small>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            });
        }
        
        $('#recentPoliciesList').html(html);
    } catch (error) {
        console.error('Error loading policies:', error);
        $('#recentPoliciesList').html('<div class="text-center py-4 text-danger">Error loading data</div>');
    }
}

// Load recent payments
async function loadRecentPayments() {
    try {
        var payments = await api.getPayments();
        var recent = payments.slice(0, 5);
        
        var html = '';
        if (recent.length === 0) {
            html = '<div class="text-center py-4 text-muted">No payments yet</div>';
        } else {
            recent.forEach(function(payment) {
                html += '<div class="activity-item d-flex align-items-center">' +
                    '<div class="activity-icon bg-success bg-opacity-10 text-success me-3">' +
                        '<i data-lucide="check-circle" style="width:20px;height:20px;"></i>' +
                    '</div>' +
                    '<div class="flex-grow-1">' +
                        '<h6 class="mb-0">' + payment.customer_name + '</h6>' +
                        '<small class="text-muted">' + payment.policy_number + ' &bull; ' + payment.payment_method + '</small>' +
                    '</div>' +
                    '<div class="text-end">' +
                        '<span class="fw-bold text-success">' + formatCurrency(payment.amount) + '</span>' +
                        '<small class="text-muted d-block">' + timeAgo(payment.payment_date) + '</small>' +
                    '</div>' +
                '</div>';
            });
        }
        
        $('#recentPaymentsList').html(html);
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        $('#recentPaymentsList').html('<div class="text-center py-4 text-danger">Error loading data</div>');
    }
}

// Generate all customers report
window.generateAllCustomersReport = async function() {
    try {
        if (typeof Swal === 'undefined') {
            console.error('SweetAlert2 is not loaded');
            return;
        }
        
        Swal.fire({
            title: 'Generating Customer Report...',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        // Get all customers
        const customers = await api.request('/admin/reports/customers');
        
        if (!customers || customers.length === 0) {
            Swal.fire('Info', 'No customers found', 'info');
            return;
        }
        
        const totalOutstanding = customers.reduce((sum, c) => sum + (parseFloat(c.total_outstanding) || 0), 0);
        const withArrears = customers.filter(c => (parseFloat(c.total_outstanding) || 0) > 0).length;
        
        const reportData = {
            title: 'Customer Report',
            dateRange: 'All Customers',
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
        console.error('Report error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', error.message || 'Failed to generate report', 'error');
        } else {
            alert('Error: ' + (error.message || 'Failed to generate report'));
        }
    }
};

// Generate today's cash statement
window.generateTodaysCashStatement = async function() {
    try {
        console.log('generateTodaysCashStatement called');
        
        // Wait a bit for libraries to load if needed
        if (typeof Swal === 'undefined') {
            console.warn('SweetAlert2 not loaded, using native alert');
            if (!confirm('Generate Today\'s Cash Statement?')) return;
        }
        
        if (typeof api === 'undefined') {
            console.error('API client is not loaded');
            alert('API client not available. Please refresh the page.');
            return;
        }
        
        // Use SweetAlert if available, otherwise proceed without it
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Generating Today\'s Cash Statement...',
                text: 'Please wait...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
        } else {
            console.log('Generating Today\'s Cash Statement...');
        }
        
        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        console.log('Requesting cash statement for:', todayStr);
        const report = await api.request(`/admin/reports/cash-statement?startDate=${todayStr}&endDate=${todayStr}`);
        console.log('Cash statement received:', report);
        
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
            title: 'Daily Cash Statement',
            dateRange: `Today - ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
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
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
        window.location.href = 'report-viewer.html';
        
    } catch (error) {
        console.error('Today\'s cash statement error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', error.message || 'Failed to generate report', 'error');
        } else {
            alert('Error: ' + (error.message || 'Failed to generate report'));
        }
    }
};

// Generate outstanding balance report (from dashboard - always shows all)
// Use a unique name to avoid conflicts with reports.js
window.generateOutstandingBalanceReportFromDashboard = async function() {
    try {
        console.log('generateOutstandingBalanceReportFromDashboard called');
        
        // Wait a bit for libraries to load if needed
        if (typeof Swal === 'undefined') {
            console.warn('SweetAlert2 not loaded, using native alert');
            if (!confirm('Generate Outstanding Balance Report?')) return;
        }
        
        if (typeof api === 'undefined') {
            console.error('API client is not loaded');
            alert('API client not available. Please refresh the page.');
            return;
        }
        
        // Use SweetAlert if available, otherwise proceed without it
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Generating Outstanding Balance Report...',
                text: 'Please wait...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
        } else {
            console.log('Generating Outstanding Balance Report...');
        }
        
        // Call without date parameters to get all outstanding balances
        console.log('Requesting outstanding balances');
        const report = await api.request('/admin/reports/outstanding-balances');
        console.log('Outstanding balances received:', report);
        
        if (!report || report.length === 0) {
            Swal.fire('Info', 'No policies with outstanding balances found', 'info');
            return;
        }
        
        // Calculate summary stats
        const totalOutstanding = report.reduce((sum, p) => sum + (parseFloat(p.outstanding_balance) || 0), 0);
        const totalPremium = report.reduce((sum, p) => sum + (parseFloat(p.total_premium_due) || 0), 0);
        const totalPaid = report.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
        const activePolicies = report.filter(p => p.status === 'Active').length;
        
        // Prepare report data for viewer
        const reportData = {
            title: 'Outstanding Balance Report',
            dateRange: 'All Policies with Outstanding Balances',
            summary: [
                { value: report.length, label: 'Policies with Balances' },
                { value: activePolicies, label: 'Active Policies' },
                { value: formatCurrency(totalPremium), label: 'Total Premium Due' },
                { value: formatCurrency(totalPaid), label: 'Amount Paid' },
                { value: formatCurrency(totalOutstanding), label: 'Total Outstanding' }
            ],
            headers: ['Policy #', 'Customer', 'Customer ID', 'Contact', 'Coverage Type', 'Premium Due', 'Amount Paid', 'Outstanding Balance', 'Status'],
            rows: report.map(p => [
                p.policy_number || '',
                p.customer_name || '',
                p.customer_id_number || '',
                (p.contact_number || p.email || 'N/A'),
                p.coverage_type || 'N/A',
                formatCurrency(p.total_premium_due || 0),
                formatCurrency(p.amount_paid || 0),
                formatCurrency(p.outstanding_balance || 0),
                p.status || 'Active'
            ]),
            totals: ['TOTALS', '', '', '', '', formatCurrency(totalPremium), formatCurrency(totalPaid), formatCurrency(totalOutstanding), '']
        };
        
        // Store in session and navigate to viewer
        sessionStorage.setItem('reportData', JSON.stringify(reportData));
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
        window.location.href = 'report-viewer.html';
        
    } catch (error) {
        console.error('Outstanding balance report error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', error.message || 'Failed to generate report', 'error');
        } else {
            alert('Error: ' + (error.message || 'Failed to generate report'));
        }
    }
};

// Expose as the standard name for dashboard use
// This will be used on dashboard page (reports.js is not loaded there)
if (typeof window.generateOutstandingBalanceReport === 'undefined') {
    window.generateOutstandingBalanceReport = window.generateOutstandingBalanceReportFromDashboard;
}
