/**
 * Dashboard JavaScript - I&C Insurance Brokers
 * Handles live data fetching and chart rendering
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

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format time ago
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return formatDate(dateString);
}

// Chart instances
let collectionsChart = null;
let coverageChart = null;

// Initialize dashboard
$(document).ready(function() {
    // Set today's date
    const today = new Date();
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
    loadChartData();
    
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
        const user = await api.getCurrentUser();
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
        const stats = await api.getDashboardStats();
        
        // Update stats with animation
        animateValue('statTotalCustomers', parseInt($('#statTotalCustomers').text().replace(/\D/g, '') || 0), stats.totalCustomers || 0, 500);
        animateValue('statActivePolicies', parseInt($('#statActivePolicies').text().replace(/\D/g, '') || 0), stats.activePolicies || 0, 500);
        
        $('#statTotalOutstanding').text(formatCurrency(stats.totalOutstanding || 0));
        $('#statTodayPayments').text(formatCurrency(stats.todayPayments || 0));
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Animate number value
function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + range * progress);
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Load recent customers
async function loadRecentCustomers() {
    try {
        const customers = await api.getCustomers();
        const recent = customers.slice(0, 5);
        
        let html = '';
        if (recent.length === 0) {
            html = '<div class="text-center py-4 text-muted">No customers yet</div>';
        } else {
            recent.forEach(function(customer) {
                const initials = ((customer.first_name || '').charAt(0) + (customer.last_name || '').charAt(0)).toUpperCase();
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
        const policies = await api.getPolicies();
        const recent = policies.slice(0, 5);
        
        let html = '';
        if (recent.length === 0) {
            html = '<div class="text-center py-4 text-muted">No policies yet</div>';
        } else {
            recent.forEach(function(policy) {
                const badgeClass = policy.coverage_type === 'Fully Comp' ? 'bg-success' : 'bg-warning text-dark';
                const statusBadge = policy.status === 'Active' ? 'bg-success' : 'bg-secondary';
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
        const payments = await api.getPayments();
        const recent = payments.slice(0, 5);
        
        let html = '';
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

// Load chart data
async function loadChartData() {
    try {
        const payments = await api.getPayments();
        const policies = await api.getPolicies();
        
        // Process and render charts
        const monthlyData = processMonthlyPayments(payments);
        renderCollectionsChart(monthlyData);
        
        const coverageData = processCoverageTypes(policies);
        renderCoverageChart(coverageData);
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

// Process monthly payments
function processMonthlyPayments(payments) {
    var months = [];
    var amounts = [];
    var counts = [];
    
    for (var i = 5; i >= 0; i--) {
        var date = new Date();
        date.setMonth(date.getMonth() - i);
        var monthKey = date.toISOString().slice(0, 7);
        var monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        months.push(monthLabel);
        
        var monthPayments = payments.filter(function(p) {
            var paymentDate = new Date(p.payment_date);
            return paymentDate.toISOString().slice(0, 7) === monthKey;
        });
        
        var total = 0;
        monthPayments.forEach(function(p) { total += (p.amount || 0); });
        amounts.push(total);
        counts.push(monthPayments.length);
    }
    
    return { months: months, amounts: amounts, counts: counts };
}

// Process coverage types
function processCoverageTypes(policies) {
    var thirdParty = policies.filter(function(p) { return p.coverage_type === 'Third Party'; }).length;
    var fullyComp = policies.filter(function(p) { return p.coverage_type === 'Fully Comp'; }).length;
    var other = policies.filter(function(p) { return !p.coverage_type || (p.coverage_type !== 'Third Party' && p.coverage_type !== 'Fully Comp'); }).length;
    
    $('#thirdPartyCount').text(thirdParty);
    $('#fullyCompCount').text(fullyComp);
    
    return { thirdParty: thirdParty, fullyComp: fullyComp, other: other };
}

// Render collections chart
function renderCollectionsChart(data) {
    var ctx = document.getElementById('collectionsChart');
    if (!ctx) return;
    
    if (collectionsChart) {
        collectionsChart.destroy();
    }
    
    collectionsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.months,
            datasets: [{
                label: 'Collections',
                data: data.amounts,
                backgroundColor: 'rgba(79, 168, 150, 0.8)',
                borderColor: 'rgba(79, 168, 150, 1)',
                borderWidth: 2,
                borderRadius: 8,
                barThickness: 40
            }, {
                label: 'Transactions',
                data: data.counts,
                type: 'line',
                borderColor: '#c9a962',
                backgroundColor: 'rgba(201, 169, 98, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#c9a962',
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: function(value) {
                            return '$' + (value >= 1000 ? (value/1000).toFixed(0) + 'k' : value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: { stepSize: 1 }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Render coverage chart
function renderCoverageChart(data) {
    var ctx = document.getElementById('coverageChart');
    if (!ctx) return;
    
    if (coverageChart) {
        coverageChart.destroy();
    }
    
    coverageChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Third Party', 'Fully Comp', 'Other'],
            datasets: [{
                data: [data.thirdParty, data.fullyComp, data.other],
                backgroundColor: ['#c9a962', '#4fa896', '#6c757d'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 15 }
                }
            }
        }
    });
}
