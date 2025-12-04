let policiesTable;
let editingPolicyId = null;
let customersData = [];

$(document).ready(function() {
    initPoliciesTable();
    loadPolicies();
    loadCustomersData();
});

// Load customers data once
async function loadCustomersData() {
    try {
        customersData = await api.getCustomers();
    } catch (error) {
        console.error('Error loading customers:', error);
        customersData = [];
    }
}

// Make functions globally accessible
window.openPolicyModal = function() {
    editingPolicyId = null;
    resetPolicyForm();
    
    // Show modal using Bootstrap 5
    const modalElement = document.getElementById('policyModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else if (modalElement) {
        $('#policyModal').modal('show');
    }
    
    // Initialize Select2 after modal is shown
    setTimeout(() => {
        initCustomerSelect2();
    }, 200);
};

window.resetPolicyForm = function() {
    $('#policyForm')[0].reset();
    $('#policyId').val('');
    $('#policyNumber').val('');
    $('#coverageType').val('');
    $('#coverageStartDate').val('');
    $('#coverageEndDate').val('');
    $('#policyModalTitle').text('Create Policy');
    editingPolicyId = null;
    
    // Clear Select2 selection
    if ($('#customerId').hasClass('select2-hidden-accessible')) {
        $('#customerId').val(null).trigger('change');
    }
    
    // Remove validation classes
    $('#policyForm input, #policyForm select').removeClass('is-invalid');
};

window.editPolicy = async function(id) {
    try {
        const policy = await api.getPolicy(id);
        editingPolicyId = id;
        
        $('#policyId').val(policy.id);
        $('#policyNumber').val(policy.policy_number);
        $('#coverageType').val(policy.coverage_type || 'Third Party');
        $('#coverageStartDate').val(policy.coverage_start_date || '');
        $('#coverageEndDate').val(policy.coverage_end_date || '');
        $('#totalPremiumDue').val(policy.total_premium_due);
        
        $('#policyModalTitle').text('Edit Policy');
        
        // Show modal
        const modalElement = document.getElementById('policyModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            $('#policyModal').modal('show');
        }
        
        // Initialize Select2 after modal is shown and set value
        setTimeout(() => {
            initCustomerSelect2();
            $('#customerId').val(policy.customer_id).trigger('change');
        }, 200);
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
};

function initCustomerSelect2() {
    const select = $('#customerId');
    
    // Destroy existing Select2 if initialized
    if (select.hasClass('select2-hidden-accessible')) {
        select.select2('destroy');
    }
    
    // Clear and populate options
    select.empty().append('<option value="">Search customer...</option>');
    
    customersData.forEach(customer => {
        const name = `${customer.first_name} ${customer.middle_name || ''} ${customer.last_name}`.trim();
        const idNumber = customer.id_number || '';
        const email = customer.email || '';
        const contact = customer.contact_number || '';
        
        select.append(`<option value="${customer.id}" 
            data-name="${escapeHtml(name)}" 
            data-id-number="${escapeHtml(idNumber)}" 
            data-email="${escapeHtml(email)}" 
            data-contact="${escapeHtml(contact)}">${escapeHtml(name)} - ${escapeHtml(idNumber)}</option>`);
    });
    
    // Initialize Select2 with dropdownParent for modal compatibility
    select.select2({
        placeholder: 'Search customer by name, ID number, email, or contact...',
        allowClear: true,
        width: '100%',
        dropdownParent: $('#policyModal .modal-content'),
        matcher: customMatcher,
        templateResult: formatCustomerResult,
        templateSelection: formatCustomerSelection
    });
}

function customMatcher(params, data) {
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
    const name = ($element.data('name') || '').toString().toLowerCase();
    const idNumber = ($element.data('id-number') || '').toString().toLowerCase();
    const email = ($element.data('email') || '').toString().toLowerCase();
    const contact = ($element.data('contact') || '').toString().toLowerCase();
    
    // Check if any field matches
    if (text.indexOf(term) > -1 || 
        name.indexOf(term) > -1 || 
        idNumber.indexOf(term) > -1 || 
        email.indexOf(term) > -1 || 
        contact.indexOf(term) > -1) {
        return data;
    }
    
    return null;
}

function formatCustomerResult(data) {
    if (data.loading) {
        return data.text;
    }
    
    if (!data.element) {
        return data.text;
    }
    
    const $element = $(data.element);
    const name = $element.data('name') || data.text;
    const idNumber = $element.data('id-number') || '';
    const email = $element.data('email') || '';
    const contact = $element.data('contact') || '';
    
    const $container = $('<div class="select2-result-customer"></div>');
    $container.append('<div class="fw-semibold">' + escapeHtml(name) + '</div>');
    
    let details = [];
    if (idNumber) details.push('ID: ' + escapeHtml(idNumber));
    if (email) details.push('Email: ' + escapeHtml(email));
    if (contact) details.push('Tel: ' + escapeHtml(contact));
    
    if (details.length > 0) {
        $container.append('<small class="text-muted">' + details.join(' | ') + '</small>');
    }
    
    return $container;
}

function formatCustomerSelection(data) {
    if (!data.id) {
        return data.text;
    }
    const $element = $(data.element);
    const name = $element.data('name') || data.text;
    return name;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.savePolicy = async function() {
    // Validate form
    if (!$('#policyForm')[0].checkValidity()) {
        $('#policyForm')[0].reportValidity();
        return;
    }

    const customerId = $('#customerId').val();
    const totalPremiumDue = parseFloat($('#totalPremiumDue').val());
    const coverageType = $('#coverageType').val();
    const coverageStartDate = $('#coverageStartDate').val();
    const coverageEndDate = $('#coverageEndDate').val();

    if (!customerId || !totalPremiumDue || totalPremiumDue <= 0) {
        Swal.fire('Error', 'Please select a customer and enter a valid premium amount', 'error');
        return;
    }

    if (!coverageType || !coverageStartDate || !coverageEndDate) {
        Swal.fire('Error', 'Please select coverage type and enter coverage dates', 'error');
        return;
    }

    if (new Date(coverageEndDate) <= new Date(coverageStartDate)) {
        Swal.fire('Error', 'Coverage end date must be after start date', 'error');
        return;
    }

    const policyData = {
        customerId: customerId,
        totalPremiumDue: totalPremiumDue,
        policyNumber: $('#policyNumber').val().trim() || null,
        coverageType: coverageType,
        coverageStartDate: coverageStartDate,
        coverageEndDate: coverageEndDate
    };

    // Show loading
    const saveBtn = $('#savePolicyBtn');
    const originalText = saveBtn.html();
    saveBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

    try {
        let wasEditing = editingPolicyId;
        editingPolicyId = null;
        
        if (wasEditing) {
            await api.updatePolicy(wasEditing, policyData);
        } else {
            await api.createPolicy(policyData);
        }
        
        // Close modal immediately
        const modalElement = document.getElementById('policyModal');
        if (modalElement) {
            if (typeof bootstrap !== 'undefined') {
                const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                modal.hide();
            } else {
                $('#policyModal').modal('hide');
            }
        }
        
        // Reset form
        resetPolicyForm();
        
        // Reload policies list immediately
        loadPolicies().then(() => {
            setTimeout(() => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Success!',
                        text: wasEditing ? 'Policy updated successfully' : 'Policy created successfully',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end'
                    });
                }
            }, 100);
        });
    } catch (error) {
        console.error('Save policy error:', error);
        Swal.fire('Error', error.message || 'Failed to save policy', 'error');
    } finally {
        saveBtn.prop('disabled', false).html(originalText);
    }
};

window.viewPolicy = function(id) {
    window.location.href = `policy-details.html?id=${id}`;
};

window.makePayment = function(id) {
    window.location.href = `payments.html?policyId=${id}`;
};

window.viewPaymentHistory = async function(policyId) {
    try {
        // Show modal
        const modalElement = document.getElementById('paymentHistoryModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            $('#paymentHistoryModal').modal('show');
        }

        // Reset content
        $('#customerDetails p').text('-');
        $('#policyDetails p').text('-');
        $('#paymentHistoryBody').html('<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading...</td></tr>');
        $('#noPaymentsMessage').addClass('d-none');
        $('#totalPaymentsAmount').text('$0.00');

        // Load policy data (includes customer info)
        const policy = await api.getPolicy(policyId);
        
        // Display customer information
        const customerName = `${policy.first_name} ${policy.middle_name || ''} ${policy.last_name}`.trim();
        $('#customerName').text(customerName);
        $('#customerIdNumber').text(policy.id_number || '-');
        $('#customerEmail').text(policy.email || '-');
        $('#customerContact').text(policy.contact_number || '-');
        $('#customerSex').text(policy.sex || '-');
        $('#customerAddress').text(policy.address || '-');

        // Display policy information
        $('#policyNumber').text(policy.policy_number || '-');
        const coverageBadge = policy.coverage_type === 'Fully Comprehensive' 
            ? '<span class="badge bg-primary">Fully Comprehensive</span>' 
            : '<span class="badge bg-warning text-dark">Third Party</span>';
        $('#policyCoverageType').html(coverageBadge);
        
        const startDate = policy.coverage_start_date ? formatDate(policy.coverage_start_date) : '-';
        const endDate = policy.coverage_end_date ? formatDate(policy.coverage_end_date) : '-';
        $('#policyCoveragePeriod').text(`${startDate} to ${endDate}`);
        $('#policyTotalPremium').text(formatCurrency(policy.total_premium_due));
        $('#policyAmountPaid').text(formatCurrency(policy.amount_paid));
        $('#policyOutstanding').text(formatCurrency(policy.outstanding_balance));

        // Load payment history
        const payments = await api.getPaymentsByPolicy(policyId);
        
        if (payments && payments.length > 0) {
            let totalAmount = 0;
            let paymentRows = '';
            
            payments.forEach(payment => {
                totalAmount += parseFloat(payment.amount || 0);
                const paymentDate = payment.payment_date ? formatDate(payment.payment_date) : '-';
                const receiptLink = `<a href="receipt.html?receipt=${payment.receipt_number}" class="text-primary">${payment.receipt_number}</a>`;
                
                paymentRows += `
                    <tr>
                        <td>${paymentDate}</td>
                        <td>${receiptLink}</td>
                        <td class="text-success fw-bold">${formatCurrency(payment.amount)}</td>
                        <td><span class="badge bg-info">${payment.payment_method || 'Cash'}</span></td>
                        <td>${payment.received_by_name || '-'}</td>
                        <td>${payment.notes || '-'}</td>
                    </tr>
                `;
            });
            
            $('#paymentHistoryBody').html(paymentRows);
            $('#totalPaymentsAmount').text(formatCurrency(totalAmount));
            $('#noPaymentsMessage').addClass('d-none');
        } else {
            $('#paymentHistoryBody').html('');
            $('#noPaymentsMessage').removeClass('d-none');
        }

        // Refresh icons
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);

    } catch (error) {
        console.error('Error loading payment history:', error);
        Swal.fire('Error', error.message || 'Failed to load payment history', 'error');
    }
};

function initPoliciesTable() {
    policiesTable = $('#policies-table').DataTable({
        responsive: true,
        order: [[9, 'desc']], // Sort by created_at (hidden column) descending - newest first
        orderMulti: false,
        columns: [
            { data: 'policy_number' },
            { data: 'customer_name' },
            { 
                data: 'coverage_type',
                render: function(data) {
                    const badgeClass = data === 'Fully Comprehensive' ? 'bg-primary' : 'bg-warning text-dark';
                    return `<span class="badge ${badgeClass}">${data || 'Third Party'}</span>`;
                }
            },
            { 
                data: null,
                render: function(data) {
                    const start = data.coverage_start_date ? formatDate(data.coverage_start_date) : '-';
                    const end = data.coverage_end_date ? formatDate(data.coverage_end_date) : '-';
                    return `<small>${start}<br>to ${end}</small>`;
                }
            },
            { 
                data: 'total_premium_due',
                render: function(data) {
                    return formatCurrency(data);
                }
            },
            { 
                data: 'amount_paid',
                render: function(data) {
                    return formatCurrency(data);
                }
            },
            { 
                data: 'outstanding_balance',
                render: function(data) {
                    return `<span class="text-danger fw-bold">${formatCurrency(data)}</span>`;
                }
            },
            { 
                data: 'status',
                render: function(data) {
                    const badgeClass = data === 'Active' ? 'bg-success' : 'bg-secondary';
                    return `<span class="badge ${badgeClass}">${data}</span>`;
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    return `
                        <button class="btn btn-sm btn-info me-1" onclick="window.viewPolicy('${data.id}')" title="View Details">
                            <i data-lucide="eye" class="icon-sm"></i>
                        </button>
                        <button class="btn btn-sm btn-primary me-1" onclick="window.editPolicy('${data.id}')" title="Edit">
                            <i data-lucide="edit" class="icon-sm"></i>
                        </button>
                        <button class="btn btn-sm btn-success me-1" onclick="window.makePayment('${data.id}')" title="Make Payment">
                            <i data-lucide="dollar-sign" class="icon-sm"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.viewPaymentHistory('${data.id}')" title="Payment History">
                            <i data-lucide="history" class="icon-sm"></i>
                        </button>
                    `;
                }
            },
            {
                data: 'created_at',
                visible: false,
                type: 'date'
            }
        ]
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

async function loadPolicies() {
    try {
        const policies = await api.getPolicies();
        if (policiesTable) {
            policiesTable.clear();
            policiesTable.rows.add(policies);
            policiesTable.draw();
        }
        lucide.createIcons();
    } catch (error) {
        console.error('Load policies error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', error.message, 'error');
        }
    }
}
