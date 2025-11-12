document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidePanel = document.getElementById('sidePanel');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const overlay = document.getElementById('overlay');

    const panelCategories = document.getElementById('panelCategories');
    const panelLoader = document.getElementById('loader'); // panel loader
    const heroEl = document.querySelector('.hero');

    const categoriesGrid = document.getElementById('categoriesGrid');
    const categoriesLoader = document.getElementById('categoriesLoader');
    const categoriesError = document.getElementById('categoriesError');

    const CATEGORIES_API = 'https://www.themealdb.com/api/json/v1/1/categories.php';
    const FILTER_BY_CATEGORY_API = (cat) => `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(cat)}`;

    let categoriesCache = [];
    let mealsCache = {};

    function escapeHtml(s) {
        if (!s) return '';
        return s
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }


        function getOrCreateMealsSection() {
            let sec = document.getElementById('mealsSearchResults');
            if (sec) return sec;

            sec = document.createElement('section');
            sec.id = 'mealsSearchResults';
            sec.className = 'selected-category-section';
            const hero = document.querySelector('.hero');
            if (hero && hero.parentNode) hero.parentNode.insertBefore(sec, hero.nextSibling);
            else document.body.appendChild(sec);
            return sec;
        }

        function renderMealsHeader(section) {
            section.innerHTML = `
      <div class="detail-box" style="border:none; box-shadow:none; padding:0; margin-bottom:10px"></div>
      <div class="meals-wrap" style="margin-top:8px;">
        <div class="meals-header-inline">
          <h4 class="meals-title" style="margin:0 0 8px 0;">Meals</h4>
        </div>
        <div id="mealsContainer" class="meals-grid">
          <div class="meals-loader">Loading meals…</div>
        </div>
      </div>
    `;
            const title = section.querySelector('.meals-title');
            if (title) {
                title.style.position = 'relative';
                const hasAfter = getComputedStyle(title, '::after').content !== 'none';
                if (!hasAfter) {
                    const underline = document.createElement('div');
                    underline.style.width = '80px';
                    underline.style.height = '4px';
                    underline.style.background = 'orangered';
                    underline.style.borderRadius = '2px';
                    underline.style.marginTop = '6px';
                    title.after(underline);
                }
            }
        }

        function renderMealCards(meals) {
            const section = document.getElementById('mealsSearchResults');
            if (!section) return;
            const container = section.querySelector('#mealsContainer');
            if (!container) return;

            // Clear loader
            container.innerHTML = '';

            if (!meals || meals.length === 0) {
                container.innerHTML = '<div class="meals-empty">No meals found.</div>';
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'meals-cards-grid';
            // iterate and create cards
            meals.forEach(m => {
                const card = document.createElement('div');
                card.className = 'meal-card';
                card.innerHTML = `
        <img src="${escapeHtml(m.strMealThumb)}" alt="${escapeHtml(m.strMeal)}" loading="lazy" />
        <div class="meal-name">${escapeHtml(m.strMeal)}</div>
      `;
                // optional click handler - you can replace with fetching meal details
                card.addEventListener('click', () => {
                    // implement meal detail fetching later if you want
                    alert('Selected meal: ' + m.strMeal);
                });
                grid.appendChild(card);
            });

            container.appendChild(grid);
        }

        
        async function fetchMealsForQuery(query) {
            const section = getOrCreateMealsSection();
            renderMealsHeader(section);

            const container = section.querySelector('#mealsContainer');
            container.innerHTML = '<div class="meals-loader">Searching…</div>';
            // scroll into view
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });

            const filterURL = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(query)}`;
            try {
                const res = await fetch(filterURL);
                if (!res.ok) throw new Error('Network ' + res.status);
                const json = await res.json();
                const meals = json.meals || [];

                if (meals.length > 0) {
                    renderMealCards(meals);
                    return;
                }
                // fallback: try search by meal name
                const searchURL = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
                const res2 = await fetch(searchURL);
                if (!res2.ok) throw new Error('Network ' + res2.status);
                const json2 = await res2.json();
                const meals2 = json2.meals || [];
                if (meals2.length > 0) {
                    // the search.php returns full meal objects; adapt to the card format (strMeal, strMealThumb)
                    renderMealCards(meals2.map(m => ({ strMeal: m.strMeal, strMealThumb: m.strMealThumb })));
                    return;
                }

                // nothing found
                container.innerHTML = `<div class="meals-empty">No meals found for "${escapeHtml(query)}".</div>`;
            } catch (err) {
                console.error(err);
                container.innerHTML = `<div class="meals-error">Failed to load meals. Try again.</div>`;
            }
        }

        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                const q = (searchInput.value || '').trim();
                if (!q) {
                    alert('Please enter a dish or category name to search.');
                    searchInput.focus();
                    return;
                }
                fetchMealsForQuery(q);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchBtn.click();
                }
            });
        } else {
            console.warn('searchBtn or searchInput not found; add them or adapt the ids.');
        }


    function openPanel() {
        if (!sidePanel) return console.warn('No sidePanel found');
        sidePanel.hidden = false;
        if (overlay) overlay.hidden = false;
        requestAnimationFrame(() => {
            sidePanel.classList.add('show');
            if (overlay) overlay.classList.add('show');
        });
        if (!categoriesCache.length) fetchPanelCategories();
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
    if (closePanelBtn) closePanelBtn.addEventListener('click', closePanel);
    if (overlay) overlay.addEventListener('click', closePanel);

    async function fetchPanelCategories() {
        if (!panelCategories) {
            console.warn('No panelCategories container found.');
            return;
        }
        if (panelLoader) panelLoader.hidden = false;
        panelCategories.innerHTML = '';

        try {
            const res = await fetch(CATEGORIES_API);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const cats = Array.isArray(json.categories) ? json.categories : [];

            categoriesCache = cats;
            if (panelLoader) panelLoader.hidden = true;

            if (cats.length === 0) {
                panelCategories.innerHTML = '<p style="padding:12px">No categories found.</p>';
                return;
            }

            cats.forEach(cat => {
                const item = document.createElement('div');
                item.className = 'category-item';
                item.tabIndex = 0;
                item.setAttribute('role', 'button');
                item.setAttribute('aria-label', `Open ${cat.strCategory}`);

                item.innerHTML = `
          <div class="category-name">${escapeHtml(cat.strCategory)}</div>
        `;

                item.addEventListener('click', async () => {
                    closePanel();
                    await showCategoryDetails(cat.strCategory);
                });

                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        item.click();
                    }
                });

                panelCategories.appendChild(item);
            });

        } catch (err) {
            if (panelLoader) panelLoader.hidden = true;
            panelCategories.innerHTML = `<p style="padding:12px;color:#b00020">Failed to load categories.</p>`;
            console.error('fetchPanelCategories:', err);
        }
    }


    function getOrCreateSelectedSection() {
        let section = document.getElementById('selectedCategorySection');
        if (section) return section;

        section = document.createElement('section');
        section.id = 'selectedCategorySection';
        section.className = 'selected-category-section';
        if (heroEl && heroEl.parentNode) {
            heroEl.parentNode.insertBefore(section, heroEl.nextSibling);
        } else {
            document.body.appendChild(section);
        }
        return section;
    }

    function renderCategorySummary(name, description) {
        const section = getOrCreateSelectedSection();
        section.innerHTML = '';

        const box = document.createElement('div');
        box.className = 'detail-box';
        box.innerHTML = `
      <div class="detail-title">${escapeHtml(name)}</div>
      <div class="detail-desc">${escapeHtml(description || 'No description available.')}</div>
    `;
        section.appendChild(box);

        const mealsWrap = document.createElement('div');
        mealsWrap.className = 'meals-wrap';
        mealsWrap.innerHTML = `
      <div class="meals-header">
        <h4 class="meals-title">MEALS</h4>
        <div class="meals-underline" aria-hidden="true"></div>
      </div>
      <div class="meals-grid" id="mealsGrid">Loading meals…</div>
    `;
        section.appendChild(mealsWrap);

        return {
            section,
            mealsGrid: section.querySelector('#mealsGrid')
        };
    }

    async function fetchAndRenderMeals(categoryName, mealsGridEl) {
        if (!mealsGridEl) return;
        mealsGridEl.innerHTML = '';
        const loaderNode = document.createElement('div');
        loaderNode.className = 'meals-loader';
        loaderNode.textContent = 'Loading meals…';
        mealsGridEl.appendChild(loaderNode);

        if (mealsCache[categoryName]) {
            renderMealsCards(mealsCache[categoryName], mealsGridEl);
            return;
        }

        try {
            const res = await fetch(FILTER_BY_CATEGORY_API(categoryName));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const meals = Array.isArray(json.meals) ? json.meals : [];

            mealsCache[categoryName] = meals;

            renderMealsCards(meals, mealsGridEl);
        } catch (err) {
            console.error('fetchAndRenderMeals:', err);
            mealsGridEl.innerHTML = `<div class="meals-error">Failed to load meals.</div>`;
        }
    }

    function renderMealsCards(meals, mealsGridEl) {
        mealsGridEl.innerHTML = '';
        if (!meals || meals.length === 0) {
            mealsGridEl.innerHTML = '<div class="meals-empty">No meals found for this category.</div>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'meals-cards-grid';

        meals.forEach(m => {
            const card = document.createElement('div');
            card.className = 'meal-card';
            card.innerHTML = `
        <img src="${escapeHtml(m.strMealThumb)}" alt="${escapeHtml(m.strMeal)}" loading="lazy" />
        <div class="meal-name">${escapeHtml(m.strMeal)}</div>
      `;
            card.addEventListener('click', () => {
                alert('You clicked meal: ' + m.strMeal);
            });
            grid.appendChild(card);
        });

        mealsGridEl.appendChild(grid);
    }


    async function showCategoryDetails(categoryName) {
        const cat = categoriesCache.find(c => c.strCategory === categoryName);

        const description = cat ? cat.strCategoryDescription : '';
        const { section, mealsGrid } = (() => {
            const { section, mealsGrid } = (function () {
                const ret = {};
                const created = renderCategorySummary(categoryName, description);
                ret.section = created.section;
                ret.mealsGrid = created.mealsGrid;
                return ret;
            })();
            return { section, mealsGrid };
        })();

        section.scrollIntoView({ behavior: 'smooth', block: 'start' });

        await fetchAndRenderMeals(categoryName, mealsGrid);
    }

    async function loadCategoriesGrid() {
        if (!categoriesGrid) return;
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
                card.addEventListener('click', async () => {
                    await showCategoryDetails(cat.strCategory);
                });
                categoriesGrid.appendChild(card);
            });

            if (categoriesLoader) categoriesLoader.hidden = true;
        } catch (err) {
            console.error('loadCategoriesGrid:', err);
            if (categoriesLoader) categoriesLoader.hidden = true;
            if (categoriesError) {
                categoriesError.hidden = false;
                categoriesError.textContent = 'Failed to load categories.';
            }
        }
    }

    setTimeout(loadCategoriesGrid, 500);

    window._showCategoryDetails = showCategoryDetails;
});
