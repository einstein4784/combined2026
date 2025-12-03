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
