let renewalsTable;
let allPolicies = [];

$(document).ready(function() {
    // Set current month as default
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    $('#searchMonth').val(currentMonth);
    
    // Add Enter key support for search
    $('#searchMonth').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            searchByMonth();
        }
    });
    
    loadAllPolicies();
    initRenewalsTable();
});

async function loadAllPolicies() {
    try {
        allPolicies = await api.getPolicies();
        
        // Populate policy select dropdown
        const select = $('#policySelect');
        select.empty().append('<option value="">Select a policy...</option>');
        
        allPolicies.forEach(policy => {
            if (policy.status === 'Active') {
                const customerName = policy.customer_name || '';
                const endDate = policy.coverage_end_date ? formatDate(policy.coverage_end_date) : '';
                select.append(`<option value="${policy.id}">${policy.policy_number} - ${customerName} (Expires: ${endDate})</option>`);
            }
        });
        
        // Initialize Select2
        if ($('#policySelect').length) {
            $('#policySelect').select2({
                placeholder: 'Select a policy...',
                allowClear: true
            });
            
            $('#policySelect').on('change', function() {
                const policyId = $(this).val();
                if (policyId) {
                    viewRenewalNotice(policyId);
                }
            });
        }
    } catch (error) {
        console.error('Error loading policies:', error);
        Swal.fire('Error', 'Failed to load policies', 'error');
    }
}

function initRenewalsTable() {
    renewalsTable = $('#renewals-table').DataTable({
        responsive: true,
        order: [[3, 'asc']], // Sort by end date
        orderMulti: false,
        columns: [
            { data: 'policy_number' },
            { data: 'customer_name' },
            { 
                data: 'coverage_type',
                render: function(data) {
                    const badgeClass = data === 'Fully Comprehensive' ? 'fully-comp' : 'third-party';
                    return `<span class="badge ${badgeClass}">${data || 'Third Party'}</span>`;
                }
            },
            { 
                data: 'coverage_end_date',
                type: 'date',
                render: function(data) {
                    return formatDate(data);
                }
            },
            { 
                data: 'outstanding_balance',
                render: function(data) {
                    return formatCurrency(data);
                }
            },
            { 
                data: null,
                render: function(data) {
                    if (data.last_payment_amount && data.last_payment_date) {
                        return `${formatCurrency(data.last_payment_amount)}<br><small class="text-muted">${formatDate(data.last_payment_date)}</small>`;
                    }
                    return '<span class="text-muted">No payments</span>';
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    return `
                        <button class="btn btn-sm btn-primary" onclick="viewRenewalNotice('${data.id}')" title="View Notice">
                            <i data-lucide="eye" class="icon-sm"></i> View
                        </button>
                    `;
                }
            }
        ]
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

async function searchByMonth() {
    const monthValue = $('#searchMonth').val();
    if (!monthValue) {
        Swal.fire('Error', 'Please select a month', 'error');
        return;
    }
    
    const [year, month] = monthValue.split('-');
    await loadRenewalsByMonth(parseInt(year), parseInt(month));
}

function searchCurrentMonth() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    $('#searchMonth').val(currentMonth);
    searchByMonth();
}

function searchNextMonth() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    $('#searchMonth').val(monthValue);
    searchByMonth();
}

async function loadRenewalsByMonth(year, month) {
    try {
        const data = await api.getRenewalsByMonth(year, month);
        
        if (data.policies && data.policies.length > 0) {
            renewalsTable.clear();
            renewalsTable.rows.add(data.policies);
            renewalsTable.draw();
            $('#searchResults').removeClass('d-none');
            lucide.createIcons();
            
            Swal.fire({
                title: 'Search Complete',
                text: `Found ${data.count} policy(ies) expiring in ${new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } else {
            $('#searchResults').addClass('d-none');
            Swal.fire({
                title: 'No Results',
                text: `No policies found expiring in ${new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
                icon: 'info',
                timer: 3000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    } catch (error) {
        console.error('Error loading renewals:', error);
        Swal.fire('Error', error.message || 'Failed to load renewal notices', 'error');
    }
}

window.viewRenewalNotice = function(policyId) {
    window.location.href = `renewal-notice.html?policyId=${policyId}`;
};

async function viewAllNotices() {
    try {
        const data = await api.getAllRenewals();
        
        if (data.policies && data.policies.length > 0) {
            renewalsTable.clear();
            renewalsTable.rows.add(data.policies);
            renewalsTable.draw();
            $('#searchResults').removeClass('d-none');
            lucide.createIcons();
            
            Swal.fire({
                title: 'All Renewal Notices',
                text: `Showing ${data.count} active policy(ies)`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } else {
            $('#searchResults').addClass('d-none');
            Swal.fire({
                title: 'No Results',
                text: 'No active policies found',
                icon: 'info',
                timer: 3000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    } catch (error) {
        console.error('Error loading all renewals:', error);
        Swal.fire('Error', error.message || 'Failed to load renewal notices', 'error');
    }
}

async function generateRenewalReport() {
    const monthValue = $('#searchMonth').val();
    if (!monthValue) {
        Swal.fire('Error', 'Please select a month first', 'error');
        return;
    }
    
    const [year, month] = monthValue.split('-');
    
    try {
        const data = await api.getRenewalReport(parseInt(year), parseInt(month));
        
        // Store report data in sessionStorage for report viewer
        sessionStorage.setItem('reportData', JSON.stringify({
            title: 'Renewal Notice Listing',
            dateRange: data.summary,
            summary: [
                { label: 'Total Policies', value: data.count },
                { label: 'Total Premium', value: formatCurrency(data.totalPremium) },
                { label: 'Total Outstanding', value: formatCurrency(data.totalOutstanding) }
            ],
            columns: [
                'Policy Number',
                'Customer Name',
                'Address',
                'Contact',
                'Email',
                'Coverage Type',
                'Start Date',
                'End Date',
                'Total Premium',
                'Amount Paid',
                'Outstanding',
                'Last Payment'
            ],
            rows: data.policies.map(p => [
                p.policy_number,
                p.customer_name,
                p.address,
                p.contact_number,
                p.email,
                p.coverage_type,
                formatDate(p.coverage_start_date),
                formatDate(p.coverage_end_date),
                formatCurrency(p.total_premium_due),
                formatCurrency(p.amount_paid),
                formatCurrency(p.outstanding_balance),
                p.last_payment_amount ? `${formatCurrency(p.last_payment_amount)} (${formatDate(p.last_payment_date)})` : 'No payments'
            ])
        }));
        
        window.open('report-viewer.html', '_blank');
    } catch (error) {
        console.error('Error generating report:', error);
        Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
}

