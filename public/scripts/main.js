document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle Logic ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;

    const applyTheme = (theme) => {
        body.setAttribute('data-theme', theme);
        themeToggleButton.innerHTML = theme === 'dark'
            ? '<i data-lucide="sun"></i>'
            : '<i data-lucide="moon"></i>';
        lucide.createIcons();
        localStorage.setItem('theme', theme);
    };

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    applyTheme(currentTheme);

    themeToggleButton.addEventListener('click', () => {
        currentTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
    });


    // --- Scroll-to-Top Button Logic (NOW INSIDE) ---
    const scrollTopBtn = document.getElementById("scrollTopBtn");

    if (scrollTopBtn) { // Check if the button exists
        // When the user scrolls down 20px from the top, show the button
        window.onscroll = function() {
            if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
                scrollTopBtn.style.display = "block";
            } else {
                scrollTopBtn.style.display = "none";
            }
        };

        // When the user clicks on the button, scroll to the top smoothly
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // --- Keyboard Shortcut: Ctrl+K to focus search ---
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-form input[name="query"]');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    // --- Flash Toast Auto-dismiss ---
    const flashToast = document.getElementById('flashToast');
    if (flashToast) {
        setTimeout(() => {
            flashToast.classList.add('flash-fade-out');
            setTimeout(() => flashToast.remove(), 400);
        }, 3000);
    }

    // --- List / Grid View Toggle ---
    const viewToggle = document.getElementById('viewToggle');
    const noteList = document.getElementById('noteList');

    if (viewToggle && noteList) {
        const viewBtns = viewToggle.querySelectorAll('.view-btn');
        const savedView = localStorage.getItem('noteView') || 'list';

        // Apply saved view on load
        const applyView = (view) => {
            if (view === 'grid') {
                noteList.classList.add('grid-view');
            } else {
                noteList.classList.remove('grid-view');
            }
            viewBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });
            localStorage.setItem('noteView', view);
        };

        applyView(savedView);

        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                applyView(btn.dataset.view);
            });
        });
    }

});