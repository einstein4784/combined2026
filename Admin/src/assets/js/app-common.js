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
    } catch (error) {
        // Not logged in, will be handled by auth.js
    }
});

