$(document).ready(function() {
    loadDashboardStats();
});

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

async function loadDashboardStats() {
    try {
        const stats = await api.getDashboardStats();
        
        $('#statTotalCustomers').text(stats.totalCustomers || 0);
        $('#statActivePolicies').text(stats.activePolicies || 0);
        $('#statTotalOutstanding').text(formatCurrency(stats.totalOutstanding || 0));
        $('#statTodayPayments').text(formatCurrency(stats.todayPayments || 0));
        
        lucide.createIcons();
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}
