let customersTable;
let editingCustomerId = null;

$(document).ready(function() {
    initCustomersTable();
    loadCustomers();
    
    // Initialize Bootstrap modal if needed
    if (typeof bootstrap !== 'undefined') {
        // Bootstrap 5 is available
    }
});

// Make functions globally accessible
window.openCustomerModal = function() {
    editingCustomerId = null;
    resetCustomerForm();
    
    // Show modal using Bootstrap 5
    const modalElement = document.getElementById('customerModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else if (modalElement) {
        // Fallback to jQuery if Bootstrap JS not available
        $('#customerModal').modal('show');
    }
};

window.resetCustomerForm = function() {
    $('#customerForm')[0].reset();
    $('#customerId').val('');
    $('#customerModalTitle').text('Add Customer');
    clearIDPreview();
    editingCustomerId = null;
    // Remove validation classes
    $('#customerForm input, #customerForm textarea, #customerForm select').removeClass('is-invalid');
};

window.saveCustomer = async function() {
    // Validate form
    if (!$('#customerForm')[0].checkValidity()) {
        $('#customerForm')[0].reportValidity();
        return;
    }

    const customerData = {
        firstName: $('#firstName').val().trim(),
        middleName: $('#middleName').val().trim() || null,
        lastName: $('#lastName').val().trim(),
        email: $('#email').val().trim(),
        contactNumber: $('#contactNumber').val().trim(),
        address: $('#address').val().trim(),
        idNumber: $('#idNumber').val().trim(),
        sex: $('#sex').val() || null
    };

    // Validate required fields
    if (!customerData.firstName || !customerData.lastName || !customerData.email || 
        !customerData.contactNumber || !customerData.address || !customerData.idNumber) {
        Swal.fire('Error', 'Please fill in all required fields', 'error');
        return;
    }

    // Show loading
    const saveBtn = $('#customerModal').find('button[onclick="saveCustomer()"]');
    const originalText = saveBtn.html();
    saveBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

    try {
        let result;
        if (editingCustomerId) {
            result = await api.updateCustomer(editingCustomerId, customerData);
        } else {
            result = await api.createCustomer(customerData);
        }
        
        // Close modal immediately
        const modalElement = document.getElementById('customerModal');
        let wasEditing = editingCustomerId;
        editingCustomerId = null;
        
        if (modalElement) {
            if (typeof bootstrap !== 'undefined') {
                const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                modal.hide();
            } else {
                $('#customerModal').modal('hide');
            }
        }
        
        // Reset form
        resetCustomerForm();
        
        // Reload customers list immediately
        loadCustomers().then(() => {
            // Show success message after a brief delay
            setTimeout(() => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Success!',
                        text: wasEditing ? 'Customer updated successfully' : 'Customer created successfully',
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
        console.error('Save customer error:', error);
        Swal.fire('Error', error.message || 'Failed to save customer', 'error');
    } finally {
        saveBtn.prop('disabled', false).html(originalText);
    }
};

window.deleteCustomer = async function(id) {
    // Check if SweetAlert2 is available
    if (typeof Swal === 'undefined') {
        // Fallback to native confirm
        if (!confirm('Are you sure you want to delete this customer? This action cannot be undone!')) {
            return;
        }
        
        try {
            await api.deleteCustomer(id);
            alert('Customer deleted successfully!');
            loadCustomers();
        } catch (error) {
            alert('Error: ' + (error.message || 'Failed to delete customer'));
        }
        return;
    }
    
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            // Show loading
            Swal.fire({
                title: 'Deleting...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            await api.deleteCustomer(id);
            
            Swal.fire({
                title: 'Deleted!',
                text: 'Customer has been deleted.',
                icon: 'success',
                confirmButtonText: 'OK'
            });
            
            loadCustomers();
        }
    } catch (error) {
        console.error('Delete error:', error);
        Swal.fire({
            title: 'Error',
            text: error.message || 'Failed to delete customer',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
};

window.editCustomer = async function(id) {
    try {
        const customer = await api.getCustomer(id);
        editingCustomerId = id;
        
        $('#customerId').val(customer.id);
        $('#firstName').val(customer.first_name);
        $('#middleName').val(customer.middle_name || '');
        $('#lastName').val(customer.last_name);
        $('#email').val(customer.email);
        $('#contactNumber').val(customer.contact_number);
        $('#address').val(customer.address);
        $('#idNumber').val(customer.id_number);
        $('#sex').val(customer.sex || '');
        
        clearIDPreview();
        $('#customerModalTitle').text('Edit Customer');
        
        // Show modal
        const modalElement = document.getElementById('customerModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            $('#customerModal').modal('show');
        }
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
};

window.handleIDUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        Swal.fire('Error', 'Please upload an image file', 'error');
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        $('#idPreviewImage').attr('src', e.target.result);
        $('#idPreview').show();
    };
    reader.readAsDataURL(file);

    // Show loading
    Swal.fire({
        title: 'Scanning ID...',
        text: 'Please wait while we extract information from the ID',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // Use Tesseract.js to perform OCR
        const { data: { text } } = await Tesseract.recognize(file, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    Swal.update({
                        text: `Processing: ${Math.round(m.progress * 100)}%`
                    });
                }
            }
        });

        // Parse the extracted text
        const parsedData = parseIDText(text);
        
        // Auto-fill form fields
        if (parsedData.firstName) $('#firstName').val(parsedData.firstName);
        if (parsedData.middleName) $('#middleName').val(parsedData.middleName);
        if (parsedData.lastName) $('#lastName').val(parsedData.lastName);
        if (parsedData.idNumber) $('#idNumber').val(parsedData.idNumber);
        if (parsedData.sex) $('#sex').val(parsedData.sex);
        if (parsedData.address) $('#address').val(parsedData.address);
        if (parsedData.email) $('#email').val(parsedData.email);
        if (parsedData.contactNumber) $('#contactNumber').val(parsedData.contactNumber);

        Swal.fire({
            title: 'ID Scanned Successfully!',
            text: 'Information has been extracted and filled in. Please review and complete any missing fields.',
            icon: 'success',
            confirmButtonText: 'OK'
        });

        lucide.createIcons();
    } catch (error) {
        console.error('OCR Error:', error);
        Swal.fire({
            title: 'Scanning Failed',
            text: 'Could not extract information from the ID. Please enter the information manually.',
            icon: 'error'
        });
    }
};

window.clearIDPreview = function() {
    $('#idPreview').hide();
    $('#idPreviewImage').attr('src', '');
    $('#idFileInput').val('');
};

function initCustomersTable() {
    customersTable = $('#customers-table').DataTable({
        responsive: true,
        order: [[0, 'desc']],
        columns: [
            { data: 'id' },
            { 
                data: null,
                render: function(data) {
                    return `${data.first_name} ${data.middle_name || ''} ${data.last_name}`.trim();
                }
            },
            { data: 'email' },
            { data: 'contact_number' },
            { data: 'id_number' },
            { data: 'sex' },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    return `
                        <button class="btn btn-sm btn-primary me-1" onclick="window.editCustomer(${data.id})" title="Edit Customer">
                            <i data-lucide="edit" class="icon-sm"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteCustomer(${data.id})" title="Delete Customer">
                            <i data-lucide="trash" class="icon-sm"></i>
                        </button>
                    `;
                }
            }
        ]
    });
}

async function loadCustomers() {
    try {
        const customers = await api.getCustomers();
        if (customersTable) {
            customersTable.clear();
            customersTable.rows.add(customers);
            customersTable.draw();
        }
        lucide.createIcons();
    } catch (error) {
        console.error('Load customers error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

// ID Scanning Functions - parseIDText function
function parseIDText(text) {
    const data = {};
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Common patterns for ID cards
    const fullNamePattern = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([A-Z][a-z]+)$/;
    const idNumberPattern = /\b\d{6,20}\b/;
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;
    
    // Try to find name (usually first few lines)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        
        // Check for full name pattern
        const nameMatch = line.match(/^([A-Z][A-Z\s]+)$/);
        if (nameMatch && line.split(' ').length >= 2 && line.split(' ').length <= 4) {
            const nameParts = line.split(/\s+/);
            if (nameParts.length >= 2) {
                data.firstName = nameParts[0];
                if (nameParts.length === 3) {
                    data.middleName = nameParts[1];
                    data.lastName = nameParts[2];
                } else {
                    data.lastName = nameParts.slice(1).join(' ');
                }
                break;
            }
        }
    }
    
    // Find ID number
    for (const line of lines) {
        const idMatch = line.match(idNumberPattern);
        if (idMatch && idMatch[0].length >= 6) {
            data.idNumber = idMatch[0];
            break;
        }
    }
    
    // Find email
    for (const line of lines) {
        const emailMatch = line.match(emailPattern);
        if (emailMatch) {
            data.email = emailMatch[0];
            break;
        }
    }
    
    // Find phone number
    for (const line of lines) {
        const phoneMatch = line.match(phonePattern);
        if (phoneMatch) {
            data.contactNumber = phoneMatch[0].replace(/[-.\s()]/g, '');
            break;
        }
    }
    
    // Find sex/gender (look for M/F, Male/Female, etc.)
    const sexKeywords = {
        'male': 'Male',
        'm': 'Male',
        'female': 'Female',
        'f': 'Female'
    };
    
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(sexKeywords)) {
        if (lowerText.includes(key)) {
            data.sex = value;
            break;
        }
    }
    
    // Try to find address (usually contains street, city, state, etc.)
    const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr', 'lane', 'ln', 'boulevard', 'blvd'];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (addressKeywords.some(keyword => line.includes(keyword)) || /\d+\s+[a-z]+\s+(street|st|avenue|ave|road|rd)/i.test(lines[i])) {
            // Collect address lines (usually 2-3 lines)
            const addressLines = [];
            for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                if (lines[j].length > 5 && !lines[j].match(emailPattern) && !lines[j].match(phonePattern)) {
                    addressLines.push(lines[j]);
                }
            }
            if (addressLines.length > 0) {
                data.address = addressLines.join(', ');
                break;
            }
        }
    }
    
    return data;
}

