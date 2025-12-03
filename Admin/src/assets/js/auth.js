// Authentication check for protected pages
$(document).ready(async function() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || currentPath;
    
    // Skip auth check for login/register pages
    if (currentPage === 'pages-login.html' || 
        currentPage === 'pages-register.html' ||
        currentPage === 'pages-recoverpw.html' ||
        currentPath.includes('pages-login.html') || 
        currentPath.includes('pages-register.html') ||
        currentPath.includes('pages-recoverpw.html')) {
        // If already logged in, redirect to dashboard
        try {
            const user = await api.getCurrentUser();
            if (user && currentPage === 'pages-login.html') {
                window.location.href = 'index.html';
            }
        } catch (error) {
            // Not logged in, stay on login page
        }
        return;
    }

    // For all other pages, require authentication
    try {
        const user = await api.getCurrentUser();
        // User is authenticated, continue
        if (window.currentUser === undefined) {
            window.currentUser = user;
        }
    } catch (error) {
        // Not authenticated, redirect to login
        console.log('Not authenticated, redirecting to login');
        window.location.href = 'pages-login.html';
    }
});

