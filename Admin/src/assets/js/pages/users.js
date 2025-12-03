let usersTable;
let editingUserId = null;

$(document).ready(function() {
    initUsersTable();
    loadUsers();
});

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
                        <button class="btn btn-sm btn-primary me-1" onclick="editUser(${data.id})">
                            <i data-lucide="edit" class="icon-sm"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser(${data.id})">
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
        usersTable.clear().rows.add(users).draw();
        lucide.createIcons();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

function openUserModal() {
    editingUserId = null;
    $('#userForm')[0].reset();
    $('#userId').val('');
    $('#password').attr('required', true);
    $('#passwordLabel').html('Password <span class="text-danger">*</span>');
    $('#passwordHint').hide();
    $('#userModalTitle').text('Add User');
}

async function editUser(id) {
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
        $('#userModal').modal('show');
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

async function saveUser() {
    if (!$('#userForm')[0].checkValidity()) {
        $('#userForm')[0].reportValidity();
        return;
    }

    const userData = {
        username: $('#username').val(),
        fullName: $('#fullName').val(),
        email: $('#email').val(),
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

    try {
        if (editingUserId) {
            await api.updateUser(editingUserId, userData);
            Swal.fire('Success', 'User updated successfully', 'success');
        } else {
            await api.createUser(userData);
            Swal.fire('Success', 'User created successfully', 'success');
        }
        
        $('#userModal').modal('hide');
        loadUsers();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

async function deleteUser(id) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            await api.deleteUser(id);
            Swal.fire('Deleted!', 'User has been deleted.', 'success');
            loadUsers();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
}


