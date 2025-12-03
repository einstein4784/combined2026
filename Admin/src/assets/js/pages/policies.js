let policiesTable;
let editingPolicyId = null;

$(document).ready(function() {
    initPoliciesTable();
    loadPolicies();
    loadCustomers();
});

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
    
    // Load customers for dropdown
    loadCustomers();
};

window.resetPolicyForm = function() {
    $('#policyForm')[0].reset();
    $('#policyId').val('');
    $('#policyNumber').val('');
    $('#policyModalTitle').text('Create Policy');
    editingPolicyId = null;
    // Remove validation classes
    $('#policyForm input, #policyForm select').removeClass('is-invalid');
};

window.editPolicy = async function(id) {
    try {
        const policy = await api.getPolicy(id);
        editingPolicyId = id;
        
        $('#policyId').val(policy.id);
        $('#customerId').val(policy.customer_id);
        $('#policyNumber').val(policy.policy_number);
        $('#totalPremiumDue').val(policy.total_premium_due);
        
        $('#policyModalTitle').text('Edit Policy');
        
        // Load customers and then show modal
        await loadCustomers();
        
        // Show modal
        const modalElement = document.getElementById('policyModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            $('#policyModal').modal('show');
        }
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
};

window.savePolicy = async function() {
    // Validate form
    if (!$('#policyForm')[0].checkValidity()) {
        $('#policyForm')[0].reportValidity();
        return;
    }

    const customerId = $('#customerId').val();
    const totalPremiumDue = parseFloat($('#totalPremiumDue').val());

    if (!customerId || !totalPremiumDue || totalPremiumDue <= 0) {
        Swal.fire('Error', 'Please select a customer and enter a valid premium amount', 'error');
        return;
    }

    const policyData = {
        customerId: customerId,
        totalPremiumDue: totalPremiumDue,
        policyNumber: $('#policyNumber').val().trim() || null
    };

    // Show loading
    const saveBtn = $('#policyModal').find('button[onclick="savePolicy()"]');
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
            // Show success message after a brief delay
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

function initPoliciesTable() {
    policiesTable = $('#policies-table').DataTable({
        responsive: true,
        order: [[0, 'desc']],
        columns: [
            { data: 'policy_number' },
            { data: 'customer_name' },
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
                        <button class="btn btn-sm btn-success" onclick="window.makePayment('${data.id}')" title="Make Payment">
                            <i data-lucide="dollar-sign" class="icon-sm"></i>
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

async function loadCustomers() {
    try {
        const customers = await api.getCustomers();
        const select = $('#customerId');
        
        // Destroy existing Select2 if initialized
        if (select.hasClass('select2-hidden-accessible')) {
            select.select2('destroy');
        }
        
        select.empty().append('<option value="">Search customer...</option>');
        
        customers.forEach(customer => {
            const name = `${customer.first_name} ${customer.middle_name || ''} ${customer.last_name}`.trim();
            // Include multiple searchable fields in the option text
            const searchText = `${name} | ${customer.id_number} | ${customer.email} | ${customer.contact_number}`;
            select.append(`<option value="${customer.id}" data-name="${name}" data-id="${customer.id_number}" data-email="${customer.email}" data-contact="${customer.contact_number}">${name} - ${customer.id_number}</option>`);
        });
        
        // Initialize Select2 with search functionality
        select.select2({
            placeholder: 'Search customer by name, ID number, email, or contact...',
            allowClear: true,
            width: '100%',
            matcher: function(params, data) {
                // Custom matcher to search across all fields
                if (params.term === '') {
                    return data;
                }
                
                const term = params.term.toLowerCase();
                const text = data.text.toLowerCase();
                const idNumber = $(data.element).data('id') || '';
                const email = $(data.element).data('email') || '';
                const contact = $(data.element).data('contact') || '';
                const name = $(data.element).data('name') || '';
                
                if (text.includes(term) || 
                    idNumber.toLowerCase().includes(term) || 
                    email.toLowerCase().includes(term) || 
                    contact.toLowerCase().includes(term) ||
                    name.toLowerCase().includes(term)) {
                    return data;
                }
                
                return null;
            },
            templateResult: function(data) {
                if (!data.id) {
                    return data.text;
                }
                
                const $container = $('<div></div>');
                const name = $(data.element).data('name') || data.text;
                const idNumber = $(data.element).data('id') || '';
                const email = $(data.element).data('email') || '';
                
                $container.append($('<div class="fw-semibold">' + name + '</div>'));
                if (idNumber) {
                    $container.append($('<small class="text-muted">ID: ' + idNumber + '</small>'));
                }
                if (email) {
                    $container.append($('<small class="text-muted ms-2">Email: ' + email + '</small>'));
                }
                
                return $container;
            }
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}


