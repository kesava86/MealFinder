document.addEventListener('DOMContentLoaded', () => {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidePanel = document.getElementById('sidePanel');
  const closePanelBtn = document.getElementById('closePanelBtn');
  const overlay = document.getElementById('overlay');

  const panelCategories = document.getElementById('panelCategories');
  const panelLoader = document.getElementById('loader');
  const panelError = document.getElementById('panelError');

  const heroEl = document.querySelector('.hero');
  const categoriesGrid = document.getElementById('categoriesGrid');
  const categoriesLoader = document.getElementById('categoriesLoader');
  const categoriesError = document.getElementById('categoriesError');

  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');

  const CATEGORIES_API = 'https://www.themealdb.com/api/json/v1/1/categories.php';
  const FILTER_BY_CATEGORY_API = (cat) => `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(cat)}`;
  const SEARCH_BY_NAME_API = (q) => `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`;
  const LOOKUP_BY_ID_API = (id) => `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`;

  let categoriesCache = [];
  let mealsCache = {};
  const mealDetailsCache = {};

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function openPanel() {
    if (!sidePanel) return;
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
    if (!panelCategories) return;
    if (panelLoader) panelLoader.hidden = false;
    if (panelError) panelError.hidden = true;
    panelCategories.innerHTML = '';
    try {
      const res = await fetch(CATEGORIES_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const cats = Array.isArray(json.categories) ? json.categories : [];
      categoriesCache = cats;
      if (panelLoader) panelLoader.hidden = true;
      if (!cats.length) {
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
          hideMealsListings();
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
      if (panelError) {
        panelError.hidden = false;
        panelError.textContent = 'Failed to load categories.';
      }
      console.error('fetchPanelCategories:', err);
    }
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
          hideMealsListings();
          await showCategoryDetails(cat.strCategory);
        });
        categoriesGrid.appendChild(card);
      });
      if (categoriesLoader) categoriesLoader.hidden = true;
    } catch (err) {
      if (categoriesLoader) categoriesLoader.hidden = true;
      if (categoriesError) {
        categoriesError.hidden = false;
        categoriesError.textContent = 'Failed to load categories.';
      }
      console.error('loadCategoriesGrid:', err);
    }
  }
  setTimeout(loadCategoriesGrid, 500);

  function hideMealsListings() {
    const searchSec = document.getElementById('mealsSearchResults');
    if (searchSec) searchSec.remove();
    const selSec = document.getElementById('selectedCategorySection');
    if (selSec) selSec.remove();
  }

  function getOrCreateMealsSection() {
    let sec = document.getElementById('mealsSearchResults');
    if (sec) return sec;
    sec = document.createElement('section');
    sec.id = 'mealsSearchResults';
    sec.className = 'selected-category-section';
    if (heroEl && heroEl.parentNode) heroEl.parentNode.insertBefore(sec, heroEl.nextSibling);
    else document.body.appendChild(sec);
    return sec;
  }

  function renderMealsHeader(section) {
    section.innerHTML = `
      <div class="detail-box" style="border:none; box-shadow:none; padding:0; margin-bottom:10px"></div>
      <div class="meals-wrap" style="margin-top:8px;">
        <div class="meals-header-inline">
          <h4 class="meals-title" style="margin:0 0 8px 0;">MEALS</h4>
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

  async function fetchMealsForQuery(query) {
    const section = getOrCreateMealsSection();
    renderMealsHeader(section);
    const container = section.querySelector('#mealsContainer');
    container.innerHTML = '<div class="meals-loader">Searching…</div>';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const res = await fetch(FILTER_BY_CATEGORY_API(query));
      if (!res.ok) throw new Error('Network ' + res.status);
      const json = await res.json();
      let meals = json.meals || [];
      if (meals.length > 0) {
        mealsCache[query] = meals;
        renderMealCardsWithClick(meals);
        return;
      }
      const res2 = await fetch(SEARCH_BY_NAME_API(query));
      if (!res2.ok) throw new Error('Network ' + res2.status);
      const json2 = await res2.json();
      const meals2 = json2.meals || [];
      if (meals2.length > 0) {
        const adapted = meals2.map(m => ({ strMeal: m.strMeal, strMealThumb: m.strMealThumb, idMeal: m.idMeal }));
        renderMealCardsWithClick(adapted);
        return;
      }
      container.innerHTML = `<div class="meals-empty">No meals found for "${escapeHtml(query)}".</div>`;
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="meals-error">Failed to load meals. Try again.</div>`;
    }
  }

  async function getMealIdByName(name) {
    try {
      const res = await fetch(SEARCH_BY_NAME_API(name));
      if (!res.ok) return null;
      const json = await res.json();
      const m = (json.meals && json.meals[0]) || null;
      return m ? m.idMeal : null;
    } catch { return null; }
  }

  function renderMealCardsWithClick(meals) {
    const section = document.getElementById('mealsSearchResults');
    if (!section) return;
    const container = section.querySelector('#mealsContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!meals || meals.length === 0) {
      container.innerHTML = '<div class="meals-empty">No meals found.</div>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'meals-cards-grid';
    meals.forEach(m => {
      const card = document.createElement('div');
      card.className = 'meal-card';
      const id = m.idMeal || m.id || null;
      card.innerHTML = `
        <img src="${escapeHtml(m.strMealThumb)}" alt="${escapeHtml(m.strMeal)}" loading="lazy" />
        <div class="meal-name">${escapeHtml(m.strMeal)}</div>
      `;
      card.addEventListener('click', async () => {
        closePanel();
        hideMealsListings();
        let mealId = id;
        if (!mealId) {
          mealId = await getMealIdByName(m.strMeal);
          if (!mealId) { alert('Unable to find full meal details for: ' + m.strMeal); return; }
        }
        await showMealDetails(mealId);
      });
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const q = (searchInput.value || '').trim();
      if (!q) { alert('Please enter a dish or category name to search.'); searchInput.focus(); return; }
      fetchMealsForQuery(q);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); searchBtn.click(); }
    });
  }

 
  function getOrCreateSelectedSection() {
    let section = document.getElementById('selectedCategorySection');
    if (section) return section;
    section = document.createElement('section');
    section.id = 'selectedCategorySection';
    section.className = 'selected-category-section';
    if (heroEl && heroEl.parentNode) heroEl.parentNode.insertBefore(section, heroEl.nextSibling);
    else document.body.appendChild(section);
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
      renderMealsCardsWithGrid(mealsCache[categoryName], mealsGridEl);
      return;
    }

    try {
      const res = await fetch(FILTER_BY_CATEGORY_API(categoryName));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const meals = Array.isArray(json.meals) ? json.meals : [];
      mealsCache[categoryName] = meals;
      renderMealsCardsWithGrid(meals, mealsGridEl);
    } catch (err) {
      console.error('fetchAndRenderMeals:', err);
      mealsGridEl.innerHTML = `<div class="meals-error">Failed to load meals.</div>`;
    }
  }

  function renderMealsCardsWithGrid(meals, mealsGridEl) {
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
      card.addEventListener('click', async () => {
        closePanel();
        hideMealsListings();
        const id = m.idMeal || m.id || await getMealIdByName(m.strMeal);
        if (!id) { alert('Unable to find meal details'); return; }
        await showMealDetails(id);
      });
      grid.appendChild(card);
    });
    mealsGridEl.appendChild(grid);
  }

  async function showCategoryDetails(categoryName) {
    const cat = categoriesCache.find(c => c.strCategory === categoryName);
    const description = cat ? cat.strCategoryDescription : '';
    const { section, mealsGrid } = (() => {
      const created = renderCategorySummary(categoryName, description);
      return { section: document.getElementById('selectedCategorySection'), mealsGrid: document.getElementById('mealsGrid') };
    })();

    const secEl = document.getElementById('selectedCategorySection');
    if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await fetchAndRenderMeals(categoryName, document.getElementById('mealsGrid'));
  }

  // ---------- MEAL DETAILS ----------
  async function showMealDetails(mealId) {
    if (!mealId) return;
    if (mealDetailsCache[mealId]) {
      renderMealDetailSection(mealDetailsCache[mealId]);
      return;
    }
    try {
      const res = await fetch(LOOKUP_BY_ID_API(mealId));
      if (!res.ok) throw new Error('Network ' + res.status);
      const json = await res.json();
      const meal = (json.meals && json.meals[0]) || null;
      if (!meal) { alert('Meal details not found'); return; }
      mealDetailsCache[mealId] = meal;
      renderMealDetailSection(meal);
    } catch (err) {
      console.error('showMealDetails:', err);
      alert('Failed to load meal details.');
    }
  }

function renderMealDetailSection(meal) {
  hideMealsListings();

  const hero = document.querySelector('.hero');
  let section = document.getElementById('mealDetailSection');
  if (!section) {
    section = document.createElement('section');
    section.id = 'mealDetailSection';
    section.className = 'meal-detail-section';
    if (hero && hero.parentNode) hero.parentNode.insertBefore(section, hero.nextSibling);
    else document.body.appendChild(section);
  }

  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`] || '';
    if (ing && ing.trim()) ingredients.push({ ing: ing.trim(), measure: measure.trim() });
  }

  const tags = (meal.strTags || '').split(',').map(t => t.trim()).filter(Boolean);
  const measurements = ingredients.map(it => it.measure).filter(Boolean);

  const rawInstr = meal.strInstructions || '';
  const instParts = rawInstr
    .split(/\r?\n|\.\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  // Ingredients HTML (two-column grid inside orange panel)
  const ingredientsHtml = `
    <div class="ingredients-panel" aria-labelledby="ingredientsHeading">
      <div class="ingredients-heading" id="ingredientsHeading">Ingredients</div>
      <div class="ingredients-grid">
        ${ingredients.map((it, idx) => `
          <div class="ingredient-item">
            <div class="num-badge">${idx + 1}</div>
            <div class="ingredient-text">${escapeHtml(it.ing)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const measurementsHtml = `
    <div class="measurements-box" aria-labelledby="measureHeading">
      <div style="font-weight:700; margin-bottom:8px;" id="measureHeading">Measure:</div>
      <div class="measurements-grid">
        ${measurements.length
          ? measurements.map(m => `<div class="measure-item">🔸 ${escapeHtml(m)}</div>`).join('')
          : `<div>No measurement data.</div>`}
      </div>
    </div>
  `;

section.innerHTML = `

  <!-- 🔶 1. BREADCRUMB BAR -->
  <div class="meal-breadcrumb">
    <i class="fa-solid fa-house"></i>
    <span class="crumb-text">${escapeHtml(meal.strMeal)}</span>
  </div>

  <!-- 🔶 2. MEAL DETAILS HEADING -->
  <div class="meal-heading-wrapper">
    <h2 class="meal-heading-title">MEAL DETAILS</h2>
  </div>

  <!-- 🔶 3. CONTENT CARD -->
  <div class="meal-detail-card">

    <!-- Grid -->
    <div class="meal-detail-grid">

      <!-- LEFT IMAGE -->
      <div class="meal-detail-image">
        <img src="${escapeHtml(meal.strMealThumb)}" alt="${escapeHtml(meal.strMeal)}">
      </div>

      <!-- RIGHT DETAILS -->
      <div class="meal-meta">
        <div class="meta-name">${escapeHtml(meal.strMeal)}</div>

        <div class="meta-sub">
          <div><strong>Category:</strong> ${escapeHtml(meal.strCategory || '—')}</div>
          ${
            meal.strSource 
              ? `<div><strong>Source:</strong> <a href="${escapeHtml(meal.strSource)}" target="_blank">${escapeHtml(meal.strSource)}</a></div>`
              : ''
          }
        </div>

        <!-- TAGS -->
        <div class="tags-area">
          <strong>Tags:</strong>
          <div class="meta-tags">
            ${
              tags.length 
                ? tags.map(t => `<span class="tag-box">${escapeHtml(t)}</span>`).join('')
                : '<span class="no-tags">No tags</span>'
            }
          </div>
        </div>

        <!-- INGREDIENTS PANEL (orange box) -->
        ${ingredientsHtml}

      </div>
    </div>

    <!-- MEASUREMENTS BELOW -->
    ${measurementsHtml}

    <!-- INSTRUCTIONS -->
    <div class="instructions">
      <h3 class="inst-title">Instructions</h3>
      ${instParts.map(step => `
        <div class="inst-item">
          <i class="fa-solid fa-square-check inst-icon"></i>
          <span class="inst-text">${escapeHtml(step)}</span>
        </div>
      `).join('')}
    </div>

  </div>
`;




  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

  window.showMealDetails = showMealDetails;
  window._showCategoryDetails = (n) => showCategoryDetails(n);
});
  