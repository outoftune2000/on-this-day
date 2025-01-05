(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const icon = themeToggleBtn.querySelector('i');
    const loadingContainer = document.querySelector('.loading-container');
    const contentContainer = document.querySelector('.content-container');
    const timeline = document.getElementById('timeline');
    const dateForm = document.getElementById('dateForm');
    function updateIcon(isDark) {
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
            icon.style.transform = '';
        }, 200);
    }
    updateIcon(htmlElement.getAttribute('data-theme') === 'dark');
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateIcon(theme === 'dark');
    }
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
    function showLoading() {
        contentContainer.classList.add('loading');
        loadingContainer.classList.add('active');
    }

    function hideLoading() {
        loadingContainer.classList.remove('active');
        contentContainer.classList.remove('loading');
    }
    async function updateTimeline(data) {
        const timelineHTML = data.events.map(event => {
            const year = event.year;
            const displayYear = year < 0 ? `${Math.abs(year)} BC` : year;
            
            return `
                <div class="timeline-item">
                    <div class="timeline-badge">
                        ${displayYear}
                    </div>
                    <div class="timeline-content">
                        <p>${event.text}</p>
                    </div>
                </div>
            `;
        }).join('');

        timeline.style.opacity = '0';
        requestAnimationFrame(() => {
            timeline.innerHTML = timelineHTML;
            document.querySelector('h2').textContent = `Events on ${data.formattedDate}`;
            requestAnimationFrame(() => {
                timeline.style.opacity = '1';
            });
        });
    }
    dateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateInput = document.getElementById('date');
        const selectedDate = dateInput.value;

        showLoading();

        try {
            const response = await fetch(`/api/events?date=${selectedDate}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            await updateTimeline(data);
        } catch (error) {
            console.error('Error fetching events:', error);
            timeline.innerHTML = '<div class="alert alert-danger">Error loading events. Please try again.</div>';
        } finally {
            hideLoading();
        }
    });
});
