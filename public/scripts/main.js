document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle Logic ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;

    const applyTheme = (theme) => {
        body.setAttribute('data-theme', theme);
        themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
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
});