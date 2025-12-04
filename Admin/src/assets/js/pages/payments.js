let paymentsTable;
let selectedPolicyId = null;
let policiesData = [];

$(document).ready(function() {
    initPaymentsTable();
    loadPayments();
    loadPoliciesData();
    
    // Check if policyId is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const policyId = urlParams.get('policyId');
    if (policyId) {
        selectedPolicyId = policyId;
        setTimeout(() => {
            openPaymentModal();
        }, 500);
    }
});

// Load policies data once
async function loadPoliciesData() {
    try {
        policiesData = await api.getPolicies();
    } catch (error) {
        console.error('Error loading policies:', error);
        policiesData = [];
    }
}

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
        console.error('Error loading payments:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

window.openPaymentModal = function() {
    $('#paymentForm')[0].reset();
    $('#policyInfo').html('');
    
    // Show modal
    const modalElement = document.getElementById('paymentModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        $('#paymentModal').modal('show');
    }
    
    // Initialize Select2 after modal is shown
    setTimeout(() => {
        initPolicySelect2();
        // Set selected policy if provided
        if (selectedPolicyId) {
            $('#policyId').val(selectedPolicyId).trigger('change');
        }
    }, 200);
};

function initPolicySelect2() {
    const select = $('#policyId');
    
    // Destroy existing Select2 if initialized
    if (select.hasClass('select2-hidden-accessible')) {
        select.off('change');
        select.select2('destroy');
    }
    
    // Clear and populate options
    select.empty().append('<option value="">Search policy...</option>');
    
    policiesData.forEach(policy => {
        const customerName = policy.customer_name || '';
        const customerEmail = policy.customer_email || '';
        const customerContact = policy.customer_contact || '';
        const policyNumber = policy.policy_number || '';
        const outstanding = policy.outstanding_balance || 0;
        
        select.append(`<option value="${policy.id}" 
            data-outstanding="${outstanding}" 
            data-policy-number="${escapeHtml(policyNumber)}"
            data-customer-name="${escapeHtml(customerName)}"
            data-customer-email="${escapeHtml(customerEmail)}"
            data-customer-contact="${escapeHtml(customerContact)}">${escapeHtml(policyNumber)} - ${escapeHtml(customerName)} (Outstanding: ${formatCurrency(outstanding)})</option>`);
    });
    
    // Initialize Select2 with dropdownParent for modal compatibility
    select.select2({
        placeholder: 'Search policy by customer name, policy number, email, or contact...',
        allowClear: true,
        width: '100%',
        dropdownParent: $('#paymentModal .modal-content'),
        matcher: policyMatcher,
        templateResult: formatPolicyResult,
        templateSelection: formatPolicySelection
    });
    
    // Handle change event to show policy info
    select.on('change', function() {
        const selectedOption = $(this).find('option:selected');
        const outstanding = selectedOption.data('outstanding');
        const policyNumber = selectedOption.data('policy-number');
        const customerName = selectedOption.data('customer-name');
        
        if (outstanding !== undefined && policyNumber) {
            $('#policyInfo').html(`
                <div class="alert alert-info mb-0 mt-2">
                    <strong>Policy:</strong> ${escapeHtml(policyNumber)}<br>
                    <strong>Customer:</strong> ${escapeHtml(customerName)}<br>
                    <strong>Outstanding Balance:</strong> <span class="text-danger fw-bold">${formatCurrency(outstanding)}</span>
                </div>
            `);
            $('#amount').attr('max', outstanding);
        } else {
            $('#policyInfo').html('');
        }
    });
}

function policyMatcher(params, data) {
    // If there is no search term, return all
    if ($.trim(params.term) === '') {
        return data;
    }
    
    // Skip if no element
    if (!data.element) {
        return null;
    }
    
    const term = params.term.toLowerCase();
    const $element = $(data.element);
    
    // Get all searchable fields
    const text = (data.text || '').toLowerCase();
    const policyNumber = ($element.data('policy-number') || '').toString().toLowerCase();
    const customerName = ($element.data('customer-name') || '').toString().toLowerCase();
    const customerEmail = ($element.data('customer-email') || '').toString().toLowerCase();
    const customerContact = ($element.data('customer-contact') || '').toString().toLowerCase();
    
    // Check if any field matches
    if (text.indexOf(term) > -1 || 
        policyNumber.indexOf(term) > -1 || 
        customerName.indexOf(term) > -1 ||
        customerEmail.indexOf(term) > -1 || 
        customerContact.indexOf(term) > -1) {
        return data;
    }
    
    return null;
}

function formatPolicyResult(data) {
    if (data.loading) {
        return data.text;
    }
    
    if (!data.element) {
        return data.text;
    }
    
    const $element = $(data.element);
    const policyNumber = $element.data('policy-number') || '';
    const customerName = $element.data('customer-name') || '';
    const outstanding = $element.data('outstanding') || 0;
    
    const $container = $('<div class="select2-result-policy"></div>');
    $container.append('<div class="fw-semibold">Policy: ' + escapeHtml(policyNumber) + '</div>');
    $container.append('<div class="text-muted">Customer: ' + escapeHtml(customerName) + '</div>');
    $container.append('<small class="text-danger">Outstanding: ' + formatCurrency(outstanding) + '</small>');
    
    return $container;
}

function formatPolicySelection(data) {
    if (!data.id) {
        return data.text;
    }
    const $element = $(data.element);
    const policyNumber = $element.data('policy-number') || '';
    const customerName = $element.data('customer-name') || '';
    return policyNumber + ' - ' + customerName;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

    // Get selected payment methods
    const selectedMethods = [];
    $('.payment-method-check:checked').each(function() {
        selectedMethods.push($(this).val());
    });

    if (selectedMethods.length === 0) {
        Swal.fire('Error', 'Please select at least one payment method', 'error');
        return;
    }

    const paymentData = {
        policyId: policyId,
        amount: amount,
        paymentMethods: selectedMethods,
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
        
        // Reload payments and policies data
        await loadPayments();
        await loadPoliciesData();
        
        // Redirect directly to receipt page
        window.location.href = `receipt.html?receipt=${result.receiptNumber}`;
    } catch (error) {
        console.error('Save payment error:', error);
        Swal.fire('Error', error.message || 'Failed to record payment', 'error');
    } finally {
        saveBtn.prop('disabled', false).html(originalText);
    }
};

window.viewReceipt = function(receiptNumber) {
    window.open(`receipt.html?receipt=${receiptNumber}`, '_blank');
};
