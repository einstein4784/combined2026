$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const policyId = urlParams.get('policyId');
    
    if (policyId) {
        loadRenewalNotice(policyId);
    } else {
        $('#noticeContent').html('<div class="alert alert-danger text-center p-5"><h4>No Policy Specified</h4><p>Please provide a policy ID in the URL</p></div>');
    }
});

async function loadRenewalNotice(policyId) {
    try {
        // Show loading
        $('#noticeContent').css('opacity', '0.3');
        
        const data = await api.getRenewalNotice(policyId);
        displayRenewalNotice(data);
        
        // Restore opacity
        $('#noticeContent').css('opacity', '1');
    } catch (error) {
        console.error('Error loading renewal notice:', error);
        $('#noticeContent').html(`
            <div class="alert alert-danger text-center p-5">
                <h4>Error Loading Renewal Notice</h4>
                <p>${error.message || 'Could not load renewal notice'}</p>
                <button class="btn btn-primary mt-3" onclick="window.history.back()">Go Back</button>
            </div>
        `);
    }
}

function displayRenewalNotice(data) {
    // Set notice date
    const noticeDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    $('#noticeDate').text(noticeDate);
    
    // Customer information
    const customerName = `${data.first_name} ${data.middle_name || ''} ${data.last_name}`.trim();
    $('#customerName').text(customerName);
    $('#customerIdNumber').text(data.id_number || '-');
    $('#customerAddress').text(data.address || '-');
    $('#customerContact').text(data.contact_number || '-');
    $('#customerEmail').text(data.email || '-');
    
    // Policy information
    $('#policyNumber').text(data.policy_number || '-');
    
    // Coverage type with badge
    const coverageType = data.coverage_type || 'Third Party';
    const badgeClass = coverageType === 'Fully Comprehensive' ? 'fully-comp' : 'third-party';
    $('#coverageType').html(`<span class="coverage-badge ${badgeClass}">${coverageType}</span>`);
    
    // Coverage dates
    $('#coverageStart').text(formatDate(data.coverage_start_date));
    $('#coverageEnd').text(formatDate(data.coverage_end_date));
    $('#expiryDate').text(formatDate(data.coverage_end_date));
    
    // Payment information
    $('#totalPremium').text(formatCurrency(data.total_premium_due || 0));
    $('#amountPaid').text(formatCurrency(data.amount_paid || 0));
    $('#outstandingBalance').text(formatCurrency(data.outstanding_balance || 0));
    
    // Last payment
    if (data.last_payment_amount) {
        $('#lastPaymentAmount').text(formatCurrency(data.last_payment_amount));
        $('#lastPaymentDate').text(formatDate(data.last_payment_date));
    } else {
        $('#lastPaymentAmount').text('No payments');
        $('#lastPaymentDate').text('-');
    }
    
    // Initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

// PDF Export function
async function exportToPDF() {
    try {
        // Check if html2pdf library is available
        if (typeof html2pdf !== 'undefined') {
            const element = document.getElementById('noticeContent');
            const opt = {
                margin: 0.5,
                filename: `Renewal_Notice_${$('#policyNumber').text() || 'notice'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            await html2pdf().set(opt).from(element).save();
        } else {
            // Fallback: Use browser's print to PDF
            Swal.fire({
                title: 'Export to PDF',
                text: 'Please use the Print button and select "Save as PDF" as the destination.',
                icon: 'info',
                confirmButtonText: 'Print',
                showCancelButton: true,
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.print();
                }
            });
        }
    } catch (error) {
        console.error('PDF export error:', error);
        // Fallback to print
        Swal.fire({
            title: 'Export to PDF',
            text: 'Please use the Print button and select "Save as PDF" as the destination.',
            icon: 'info',
            confirmButtonText: 'Print',
            showCancelButton: true,
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                window.print();
            }
        });
    }
}

