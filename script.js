document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidePanel = document.getElementById('sidePanel');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const overlay = document.getElementById('overlay');
    const loader = document.getElementById('loader');
    const categoriesList = document.getElementById('categoriesList');
    const errorMsg = document.getElementById('errorMsg');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    const CATEGORIES_API = 'https://www.themealdb.com/api/json/v1/1/categories.php';
    let categoriesFetched = false;

    function openPanel() {
        sidePanel.hidden = false;
        overlay.hidden = false;
        requestAnimationFrame(() => {
            sidePanel.classList.add('show');
            overlay.classList.add('show');
        });
        if (!categoriesFetched) fetchCategories();
    }

    function closePanel() {
        sidePanel.classList.remove('show');
        overlay.classList.remove('show');
        setTimeout(() => {
            sidePanel.hidden = true;
            overlay.hidden = true;
        }, 260);
    }

    hamburgerBtn.addEventListener('click', openPanel);
    closePanelBtn.addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);

    async function fetchCategories() {
        loader.hidden = false;
        errorMsg.hidden = true;
        categoriesList.innerHTML = '';

        try {
            const res = await fetch(CATEGORIES_API);
            if (!res.ok) throw new Error(`Network error: ${res.status}`);
            const data = await res.json();

            loader.hidden = true;
            categoriesFetched = true;

            data.categories.forEach(cat => {
                const div = document.createElement('div');
                div.classList.add('category-item');
                div.innerHTML = `
            <div class="category-name">${cat.strCategory}</div>
        `;
                div.addEventListener('click', () => {
                    alert(`Clicked category: ${cat.strCategory}`);
                });
                categoriesList.appendChild(div);
            });
        } catch (err) {
            loader.hidden = true;
            errorMsg.hidden = false;
            errorMsg.textContent = `Could not load categories: ${err.message}`;
        }
    }

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (!query) return alert('Please enter a recipe name!');
        alert(`Searching for: ${query}`);
        
    });
});
