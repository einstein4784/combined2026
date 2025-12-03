let usersTable;
let editingUserId = null;

$(document).ready(function() {
    initUsersTable();
    loadUsers();
});

// Make functions globally accessible
window.openUserModal = function() {
    editingUserId = null;
    resetUserForm();
    
    // Show modal using Bootstrap 5
    const modalElement = document.getElementById('userModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else if (modalElement) {
        $('#userModal').modal('show');
    }
};

window.resetUserForm = function() {
    $('#userForm')[0].reset();
    $('#userId').val('');
    $('#password').attr('required', true);
    $('#passwordLabel').html('Password <span class="text-danger">*</span>');
    $('#passwordHint').hide();
    $('#userModalTitle').text('Add User');
    editingUserId = null;
    // Remove validation classes
    $('#userForm input, #userForm select').removeClass('is-invalid');
};

function initUsersTable() {
    usersTable = $('#users-table').DataTable({
        responsive: true,
        order: [[4, 'desc']],
        columns: [
            { data: 'username' },
            { data: 'full_name' },
            { data: 'email' },
            { 
                data: 'role',
                render: function(data) {
                    const colors = {
                        'Admin': 'bg-danger',
                        'Supervisor': 'bg-warning',
                        'Cashier': 'bg-info',
                        'Underwriter': 'bg-success'
                    };
                    return `<span class="badge ${colors[data] || 'bg-secondary'}">${data}</span>`;
                }
            },
            { 
                data: 'created_at',
                render: function(data) {
                    return new Date(data).toLocaleDateString();
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    return `
                        <button class="btn btn-sm btn-primary me-1" onclick="window.editUser('${data.id}')" title="Edit User">
                            <i data-lucide="edit" class="icon-sm"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteUser('${data.id}')" title="Delete User">
                            <i data-lucide="trash" class="icon-sm"></i>
                        </button>
                    `;
                }
            }
        ]
    });
}

async function loadUsers() {
    try {
        const users = await api.getUsers();
        if (usersTable) {
            usersTable.clear();
            usersTable.rows.add(users);
            usersTable.draw();
        }
        lucide.createIcons();
    } catch (error) {
        console.error('Load users error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

window.editUser = async function(id) {
    try {
        const users = await api.getUsers();
        const user = users.find(u => u.id === id);
        
        if (!user) {
            Swal.fire('Error', 'User not found', 'error');
            return;
        }
        
        editingUserId = id;
        
        $('#userId').val(user.id);
        $('#username').val(user.username);
        $('#fullName').val(user.full_name);
        $('#email').val(user.email);
        $('#role').val(user.role);
        $('#password').val('');
        $('#password').removeAttr('required');
        $('#passwordLabel').html('Password');
        $('#passwordHint').show();
        
        $('#userModalTitle').text('Edit User');
        
        // Show modal
        const modalElement = document.getElementById('userModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            $('#userModal').modal('show');
        }
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
};

window.saveUser = async function() {
    // Validate form
    if (!$('#userForm')[0].checkValidity()) {
        $('#userForm')[0].reportValidity();
        return;
    }

    const userData = {
        username: $('#username').val().trim(),
        fullName: $('#fullName').val().trim(),
        email: $('#email').val().trim(),
        role: $('#role').val()
    };

    const password = $('#password').val();
    if (password || !editingUserId) {
        if (!password) {
            Swal.fire('Error', 'Password is required for new users', 'error');
            return;
        }
        userData.password = password;
    }

    // Validate required fields
    if (!userData.username || !userData.fullName || !userData.email || !userData.role) {
        Swal.fire('Error', 'Please fill in all required fields', 'error');
        return;
    }

    // Show loading
    const saveBtn = $('#saveUserBtn');
    const originalText = saveBtn.html();
    saveBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

    try {
        let wasEditing = editingUserId;
        editingUserId = null;
        
        if (wasEditing) {
            await api.updateUser(wasEditing, userData);
        } else {
            await api.createUser(userData);
        }
        
        // Close modal immediately
        const modalElement = document.getElementById('userModal');
        if (modalElement) {
            if (typeof bootstrap !== 'undefined') {
                const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                modal.hide();
            } else {
                $('#userModal').modal('hide');
            }
        }
        
        // Reset form
        resetUserForm();
        
        // Reload users list immediately
        loadUsers().then(() => {
            // Show success message after a brief delay
            setTimeout(() => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Success!',
                        text: wasEditing ? 'User updated successfully' : 'User created successfully',
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
        console.error('Save user error:', error);
        Swal.fire('Error', error.message || 'Failed to save user', 'error');
    } finally {
        saveBtn.prop('disabled', false).html(originalText);
    }
};

window.deleteUser = async function(id) {
    // Check if SweetAlert2 is available
    if (typeof Swal === 'undefined') {
        // Fallback to native confirm
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone!')) {
            return;
        }
        
        try {
            await api.deleteUser(id);
            alert('User deleted successfully!');
            loadUsers();
        } catch (error) {
            alert('Error: ' + (error.message || 'Failed to delete user'));
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
            
            await api.deleteUser(id);
            
            Swal.fire({
                title: 'Deleted!',
                text: 'User has been deleted.',
                icon: 'success',
                confirmButtonText: 'OK'
            });
            
            loadUsers();
        }
    } catch (error) {
        console.error('Delete error:', error);
        Swal.fire({
            title: 'Error',
            text: error.message || 'Failed to delete user',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
};


