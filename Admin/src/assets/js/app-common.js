// Make handleLogout globally accessible - define it early
window.handleLogout = async function() {
    try {
        // Clear local data first
        window.currentUser = null;
        
        // Try to logout from server
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout API error:', error);
            // Continue with logout even if API call fails
        }
        
        // Force redirect to login page
        window.location.replace('pages-login.html');
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even on error
        window.currentUser = null;
        window.location.replace('pages-login.html');
    }
};

// Common app functionality
$(document).ready(async function() {
    // Load user info in topbar
    try {
        const user = await api.getCurrentUser();
        window.currentUser = user;
        
        $('#userNameDisplay').html(`${user.full_name || user.username} <i class="mdi mdi-chevron-down"></i>`);
        $('#userWelcome').text(`Welcome, ${user.full_name || user.username}!`);
        $('#userRole').text(user.role);
        $('#loggedInUser').text(user.full_name || user.username);
        
        // Role-based menu visibility
        setupRoleBasedMenu(user.role);
        
        // Role-based page access control
        checkPageAccess(user.role);
    } catch (error) {
        // Not logged in, will be handled by auth.js
    }
});

// Setup role-based menu visibility
function setupRoleBasedMenu(userRole) {
    // Reports menu - Admin and Supervisor only
    if (userRole !== 'Admin' && userRole !== 'Supervisor') {
        $('#reportsMenu').hide();
    } else {
        $('#reportsMenu').show();
    }
    
    // Admin Settings menu - Admin only
    if (userRole !== 'Admin') {
        $('#adminSettingsMenu').hide();
    } else {
        $('#adminSettingsMenu').show();
    }
    
    // User Management - Admin and Supervisor only
    if (userRole !== 'Admin' && userRole !== 'Supervisor') {
        $('a[href="users.html"]').closest('.menu-item').hide();
    } else {
        $('a[href="users.html"]').closest('.menu-item').show();
    }
}

// Check page access based on role
function checkPageAccess(userRole) {
    const currentPage = window.location.pathname.split('/').pop() || window.location.pathname;
    
    // Reports page - Admin and Supervisor only
    if (currentPage === 'reports.html' && userRole !== 'Admin' && userRole !== 'Supervisor') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to access this page.',
                icon: 'error',
                confirmButtonColor: '#1a365d'
            }).then(() => {
                window.location.href = 'index.html';
            });
        } else {
            alert('Access Denied: You do not have permission to access this page.');
            window.location.href = 'index.html';
        }
        return;
    }
    
    // Admin Settings page - Admin only
    if (currentPage === 'admin-settings.html' && userRole !== 'Admin') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Access Denied',
                text: 'Admin access required to view this page.',
                icon: 'error',
                confirmButtonColor: '#1a365d'
            }).then(() => {
                window.location.href = 'index.html';
            });
        } else {
            alert('Access Denied: Admin access required.');
            window.location.href = 'index.html';
        }
        return;
    }
    
    // User Management page - Admin and Supervisor only
    if (currentPage === 'users.html' && userRole !== 'Admin' && userRole !== 'Supervisor') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to access this page.',
                icon: 'error',
                confirmButtonColor: '#1a365d'
            }).then(() => {
                window.location.href = 'index.html';
            });
        } else {
            alert('Access Denied: You do not have permission to access this page.');
            window.location.href = 'index.html';
        }
        return;
    }
}

