let paymentsTable;
let selectedPolicyId = null;

$(document).ready(function() {
    initPaymentsTable();
    loadPayments();
    loadPolicies();
    
    // Check if policyId is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const policyId = urlParams.get('policyId');
    if (policyId) {
        selectedPolicyId = policyId;
        setTimeout(() => {
            $('#policyId').val(policyId).trigger('change');
            $('#paymentModal').modal('show');
        }, 500);
    }
});

function initPaymentsTable() {
    paymentsTable = $('#payments-table').DataTable({
        responsive: true,
        order: [[5, 'desc']],
        columns: [
            { data: 'receipt_number' },
            { data: 'policy_number' },
            { data: 'customer_name' },
            { 
                data: 'amount',
                render: function(data) {
                    return formatCurrency(data);
                }
            },
            { data: 'payment_method' },
            { 
                data: 'payment_date',
                render: function(data) {
                    return new Date(data).toLocaleString();
                }
            },
            { data: 'received_by_name' },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    return `
                        <button class="btn btn-sm btn-info" onclick="viewReceipt('${data.receipt_number}')" title="View Receipt">
                            <i data-lucide="receipt" class="icon-sm"></i>
                        </button>
                    `;
                }
            }
        ]
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

async function loadPayments() {
    try {
        const payments = await api.getPayments();
        paymentsTable.clear().rows.add(payments).draw();
        lucide.createIcons();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

async function loadPolicies() {
    try {
        const policies = await api.getPolicies();
        const select = $('#policyId');
        
        // Destroy existing Select2 if initialized
        if (select.hasClass('select2-hidden-accessible')) {
            select.off('change'); // Remove existing change handler
            select.select2('destroy');
        }
        
        select.empty().append('<option value="">Search policy...</option>');
        
        policies.forEach(policy => {
            // Store customer info in data attributes for searching
            const customerName = policy.customer_name || '';
            const customerEmail = policy.customer_email || '';
            const customerContact = policy.customer_contact || '';
            const policyNumber = policy.policy_number || '';
            
            select.append(`<option value="${policy.id}" 
                data-outstanding="${policy.outstanding_balance}" 
                data-policy-number="${policyNumber}"
                data-customer-name="${customerName}"
                data-customer-email="${customerEmail}"
                data-customer-contact="${customerContact}">
                ${policyNumber} - ${customerName} (Outstanding: ${formatCurrency(policy.outstanding_balance)})
            </option>`);
        });
        
        // Initialize Select2 with search functionality
        select.select2({
            placeholder: 'Search policy by customer name, ID number, email, policy number, or contact...',
            allowClear: true,
            width: '100%',
            matcher: function(params, data) {
                // Custom matcher to search across all fields
                if (params.term === '') {
                    return data;
                }
                
                const term = params.term.toLowerCase();
                const text = data.text.toLowerCase();
                const policyNumber = $(data.element).data('policy-number') || '';
                const customerName = $(data.element).data('customer-name') || '';
                const customerEmail = $(data.element).data('customer-email') || '';
                const customerContact = $(data.element).data('customer-contact') || '';
                
                if (text.includes(term) || 
                    policyNumber.toLowerCase().includes(term) || 
                    customerName.toLowerCase().includes(term) ||
                    customerEmail.toLowerCase().includes(term) || 
                    customerContact.toLowerCase().includes(term)) {
                    return data;
                }
                
                return null;
            },
            templateResult: function(data) {
                if (!data.id) {
                    return data.text;
                }
                
                const $container = $('<div></div>');
                const policyNumber = $(data.element).data('policy-number') || '';
                const customerName = $(data.element).data('customer-name') || '';
                const outstanding = $(data.element).data('outstanding') || 0;
                
                $container.append($('<div class="fw-semibold">Policy: ' + policyNumber + '</div>'));
                $container.append($('<div class="text-muted">Customer: ' + customerName + '</div>'));
                $container.append($('<small class="text-danger">Outstanding: ' + formatCurrency(outstanding) + '</small>'));
                
                return $container;
            },
            templateSelection: function(data) {
                if (!data.id) {
                    return data.text;
                }
                const policyNumber = $(data.element).data('policy-number') || '';
                const customerName = $(data.element).data('customer-name') || '';
                return policyNumber + ' - ' + customerName;
            }
        });
        
        // Handle change event to show policy info
        select.on('change', function() {
            const selectedOption = $(this).find('option:selected');
            const outstanding = selectedOption.data('outstanding');
            const policyNumber = selectedOption.data('policy-number');
            const customerName = selectedOption.data('customer-name');
            
            if (outstanding !== undefined && policyNumber) {
                $('#policyInfo').html(`
                    <div class="alert alert-info mb-0">
                        <strong>Policy:</strong> ${policyNumber}<br>
                        <strong>Customer:</strong> ${customerName}<br>
                        <strong>Outstanding Balance:</strong> <span class="text-danger fw-bold">${formatCurrency(outstanding)}</span>
                    </div>
                `);
                $('#amount').attr('max', outstanding);
            } else {
                $('#policyInfo').html('');
            }
        });
        
        // Trigger change if policyId is preselected
        if (selectedPolicyId) {
            select.val(selectedPolicyId).trigger('change');
        }
    } catch (error) {
        console.error('Error loading policies:', error);
    }
}

window.openPaymentModal = function() {
    $('#paymentForm')[0].reset();
    $('#policyId').val(selectedPolicyId || '').trigger('change');
    $('#policyInfo').html('');
    
    // Show modal
    const modalElement = document.getElementById('paymentModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        $('#paymentModal').modal('show');
    }
};

window.savePayment = async function() {
    if (!$('#paymentForm')[0].checkValidity()) {
        $('#paymentForm')[0].reportValidity();
        return;
    }

    const policyId = $('#policyId').val();
    const amount = parseFloat($('#amount').val());

    if (!policyId || !amount || amount <= 0) {
        Swal.fire('Error', 'Please select a policy and enter a valid amount', 'error');
        return;
    }

    const paymentData = {
        policyId: policyId,
        amount: amount,
        paymentMethod: $('#paymentMethod').val(),
        notes: $('#notes').val() || null
    };

    // Show loading
    const saveBtn = $('#savePaymentBtn');
    const originalText = saveBtn.html();
    saveBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

    try {
        const result = await api.createPayment(paymentData);
        
        // Close modal immediately
        const modalElement = document.getElementById('paymentModal');
        if (modalElement) {
            if (typeof bootstrap !== 'undefined') {
                const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                modal.hide();
            } else {
                $('#paymentModal').modal('hide');
            }
        }
        
        // Reset form
        $('#paymentForm')[0].reset();
        $('#policyInfo').html('');
        selectedPolicyId = null;
        
        // Reload payments list
        await loadPayments();
        
        // Show success message
        setTimeout(() => {
            Swal.fire({
                title: 'Payment Recorded!',
                text: `Receipt Number: ${result.receiptNumber}`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'View Receipt',
                cancelButtonText: 'Close',
                timer: 5000
            }).then((swalResult) => {
                if (swalResult.isConfirmed) {
                    viewReceipt(result.receiptNumber);
                }
            });
        }, 300);
    } catch (error) {
        console.error('Save payment error:', error);
        Swal.fire('Error', error.message || 'Failed to record payment', 'error');
    } finally {
        saveBtn.prop('disabled', false).html(originalText);
    }
};

function viewReceipt(receiptNumber) {
    window.open(`receipt.html?receiptNumber=${receiptNumber}`, '_blank');
}


