document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidePanel = document.getElementById('sidePanel');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const overlay = document.getElementById('overlay');

    const categoriesList = document.getElementById('categoriesList') || document.getElementById('panelCategories') || document.getElementById('categoriesContainer');
    const loader = document.getElementById('loader') || document.getElementById('panelLoader') || null;
    const errorMsg = document.getElementById('errorMsg') || document.getElementById('panelError') || null;

    const categoriesGrid = document.getElementById('categoriesGrid');
    const categoriesLoader = document.getElementById('categoriesLoader');
    const categoriesError = document.getElementById('categoriesError');

    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    const CATEGORIES_API = 'https://www.themealdb.com/api/json/v1/1/categories.php';
    let categoriesFetched = false;

    function escapeHtml(s) {
        if (!s) return '';
        return s
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function openPanel() {
        if (!sidePanel) { console.warn('openPanel: no sidePanel element found'); return; }
        sidePanel.hidden = false;
        if (overlay) overlay.hidden = false;

        requestAnimationFrame(() => {
            sidePanel.classList.add('show');
            if (overlay) overlay.classList.add('show');
        });

        if (!categoriesFetched) fetchCategories();
    }

    function closePanel() {
        if (!sidePanel) return;
        sidePanel.classList.remove('show');
        if (overlay) overlay.classList.remove('show');

        setTimeout(() => {
            sidePanel.hidden = true;
            if (overlay) overlay.hidden = true;
        }, 260);
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openPanel);
    else console.warn('No hamburgerBtn found in DOM');

    if (closePanelBtn) closePanelBtn.addEventListener('click', closePanel);
    if (overlay) overlay.addEventListener('click', closePanel);

    async function fetchCategories() {
        if (!categoriesList) {
            console.warn('fetchCategories: no categoriesList/panelCategories element found; skipping side-panel population.');
            categoriesFetched = true;
            return;
        }

        if (loader) loader.hidden = false;
        if (errorMsg) errorMsg.hidden = true;
        categoriesList.innerHTML = '';

        try {
            const res = await fetch(CATEGORIES_API);
            if (!res.ok) throw new Error(`Network error: ${res.status}`);
            const data = await res.json();
            const cats = Array.isArray(data.categories) ? data.categories : [];

            if (loader) loader.hidden = true;
            categoriesFetched = true;

            if (cats.length === 0) {
                categoriesList.innerHTML = '<p>No categories found.</p>';
                return;
            }

            cats.forEach(cat => {
                const card = document.createElement('div');
                card.className = 'category-item';

                card.tabIndex = 0;
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', `Open category ${cat.strCategory}`);

                card.innerHTML = `
          <div class="category-name">${escapeHtml(cat.strCategory)}</div>
        `;

                card.addEventListener('click', () => {
                    alert('Clicked category: ' + cat.strCategory);
                });

                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        card.click();
                    }
                });

                categoriesList.appendChild(card);
            });

        } catch (err) {
            if (loader) loader.hidden = true;
            if (errorMsg) {
                errorMsg.hidden = false;
                errorMsg.textContent = `Could not load categories: ${err.message}`;
            } else {
                console.error('Could not load panel categories:', err);
            }
        }
    }

    async function loadCategoriesGrid() {
        if (!categoriesGrid) {
            console.warn('No categoriesGrid element found; skipping grid load.');
            return;
        }
        if (categoriesLoader) categoriesLoader.hidden = false;
        if (categoriesError) categoriesError.hidden = true;
        categoriesGrid.innerHTML = '';

        try {
            const res = await fetch(CATEGORIES_API);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const cats = json.categories || [];

            cats.forEach(cat => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `
          <img src="${escapeHtml(cat.strCategoryThumb)}" alt="${escapeHtml(cat.strCategory)}" loading="lazy" />
          <div class="category-label">${escapeHtml(cat.strCategory)}</div>
        `;
                card.addEventListener('click', () => alert(`You clicked category: ${cat.strCategory}`));
                categoriesGrid.appendChild(card);
            });

            if (categoriesLoader) categoriesLoader.hidden = true;
        } catch (err) {
            if (categoriesLoader) categoriesLoader.hidden = true;
            if (categoriesError) {
                categoriesError.hidden = false;
                categoriesError.textContent = 'Failed to load categories.';
            } else {
                console.error('Failed to load categories grid:', err);
            }
        }
    }

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const q = String(searchInput.value || '').trim();
            if (!q) return alert('Please enter a recipe name!');
            alert(`Searching for: ${q}`);
        });
    }

    setTimeout(loadCategoriesGrid, 500);
});
