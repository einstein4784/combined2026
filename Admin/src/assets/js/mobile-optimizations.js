/**
 * Mobile Optimizations for I&C Insurance Brokers
 * Handles mobile-specific UI improvements and interactions
 */

(function() {
    'use strict';
    
    // Check if mobile device
    function isMobile() {
        return window.innerWidth <= 991 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // Initialize mobile optimizations
    function initMobileOptimizations() {
        if (!isMobile()) return;
        
        // Add mobile class to body
        document.body.classList.add('mobile-device');
        
        // Handle sidebar overlay on mobile
        initMobileSidebar();
        
        // Optimize DataTables for mobile
        optimizeDataTables();
        
        // Handle form inputs to prevent zoom on iOS
        preventIOSZoom();
        
        // Add touch improvements
        addTouchImprovements();
        
        // Optimize modals for mobile
        optimizeModals();
    }
    
    // Mobile sidebar with overlay
    function initMobileSidebar() {
        const menuToggle = document.querySelector('.button-toggle-menu');
        const sidebar = document.querySelector('.sidenav-menu');
        if (!sidebar) return;
        
        let overlay = document.querySelector('.mobile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-overlay';
            overlay.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1039;';
            document.body.appendChild(overlay);
        }
        
        function toggleSidebar() {
            const isOpen = sidebar.classList.contains('show');
            
            if (isOpen) {
                sidebar.classList.remove('show');
                overlay.style.display = 'none';
                document.body.style.overflow = '';
            } else {
                sidebar.classList.add('show');
                overlay.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }
        
        if (menuToggle) {
            menuToggle.addEventListener('click', toggleSidebar);
        }
        
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('show');
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        });
        
        // Close sidebar when clicking a link
        const sidebarLinks = sidebar.querySelectorAll('a');
        sidebarLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                setTimeout(function() {
                    sidebar.classList.remove('show');
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                }, 100);
            });
        });
    }
    
    // Optimize DataTables for mobile
    function optimizeDataTables() {
        if (typeof $ !== 'undefined' && typeof $.fn.DataTable !== 'undefined') {
            // Set default responsive options
            $.extend(true, $.fn.dataTable.defaults, {
                responsive: true,
                scrollX: true,
                scrollCollapse: true,
                pagingType: 'simple_numbers',
                language: {
                    lengthMenu: 'Show _MENU_ entries',
                    info: 'Showing _START_ to _END_ of _TOTAL_ entries',
                    infoEmpty: 'No entries to show',
                    infoFiltered: '(filtered from _MAX_ total entries)',
                    search: 'Search:',
                    paginate: {
                        first: 'First',
                        last: 'Last',
                        next: 'Next',
                        previous: 'Previous'
                    }
                }
            });
        }
    }
    
    // Prevent iOS zoom on input focus
    function preventIOSZoom() {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], input[type="tel"], input[type="password"], input[type="search"], textarea, select');
            
            inputs.forEach(function(input) {
                // Ensure font-size is at least 16px to prevent zoom
                const computedStyle = window.getComputedStyle(input);
                if (parseInt(computedStyle.fontSize) < 16) {
                    input.style.fontSize = '16px';
                }
                
                // Add touch-friendly class
                input.classList.add('touch-friendly');
            });
        }
    }
    
    // Add touch improvements
    function addTouchImprovements() {
        // Improve button touch targets
        const buttons = document.querySelectorAll('.btn, .nav-link, .dropdown-item');
        buttons.forEach(function(btn) {
            if (btn.offsetHeight < 44) {
                btn.style.minHeight = '44px';
                const paddingTop = parseInt(window.getComputedStyle(btn).paddingTop) || 0;
                const paddingBottom = parseInt(window.getComputedStyle(btn).paddingBottom) || 0;
                btn.style.paddingTop = Math.max(paddingTop, 12) + 'px';
                btn.style.paddingBottom = Math.max(paddingBottom, 12) + 'px';
            }
        });
        
        // Add touch feedback
        document.addEventListener('touchstart', function(e) {
            const target = e.target.closest('.btn, .card, .nav-link, .dropdown-item, .table tbody tr');
            if (target) {
                target.classList.add('touch-active');
            }
        }, { passive: true });
        
        document.addEventListener('touchend', function(e) {
            const targets = document.querySelectorAll('.touch-active');
            targets.forEach(function(target) {
                setTimeout(function() {
                    target.classList.remove('touch-active');
                }, 150);
            });
        }, { passive: true });
    }
    
    // Optimize modals for mobile
    function optimizeModals() {
        // Make modals full-screen on mobile
        const modals = document.querySelectorAll('.modal');
        modals.forEach(function(modal) {
            modal.addEventListener('show.bs.modal', function() {
                if (window.innerWidth <= 576) {
                    const modalDialog = modal.querySelector('.modal-dialog');
                    if (modalDialog) {
                        modalDialog.style.margin = '0';
                        modalDialog.style.maxWidth = '100%';
                        modalDialog.style.height = '100vh';
                    }
                }
            });
        });
    }
    
    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            window.scrollTo(0, 0);
            // Recalculate layouts
            if (typeof $ !== 'undefined' && typeof $.fn.DataTable !== 'undefined') {
                $('.dataTable').each(function() {
                    if ($.fn.DataTable.isDataTable(this)) {
                        $(this).DataTable().columns.adjust().responsive.recalc();
                    }
                });
            }
        }, 100);
    });
    
    // Handle resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            // Recalculate DataTables
            if (typeof $ !== 'undefined' && typeof $.fn.DataTable !== 'undefined') {
                $('.dataTable').each(function() {
                    if ($.fn.DataTable.isDataTable(this)) {
                        $(this).DataTable().columns.adjust().responsive.recalc();
                    }
                });
            }
        }, 250);
    });
    
    // Initialize on DOM ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initMobileOptimizations();
    } else {
        document.addEventListener('DOMContentLoaded', initMobileOptimizations);
    }
    
    // Re-initialize after AJAX loads
    if (typeof $ !== 'undefined') {
        $(document).ajaxComplete(function() {
            setTimeout(initMobileOptimizations, 100);
        });
    }
})();
