document.addEventListener("DOMContentLoaded", () => {
  const popup = document.getElementById("addedPopup");
  const menuContainer = document.getElementById("menuSections");
  const filterContainer = document.getElementById("menuCategoryFilters");
  const searchInput = document.getElementById("menuSearch");
  const resultSummary = document.getElementById("menuResultSummary");
  const coffeeModal = document.getElementById("coffeeModal");
  const addToCartBtn = document.getElementById("modalAddToCart");
  const modalSize = document.getElementById("modalSize");
  const modalPrice = document.getElementById("modalPrice");
  const modalTitle = document.getElementById("modalTitle");
  const modalImage = document.getElementById("modalImage");
  const modalDescription = document.getElementById("modalDescription");

  if (!menuContainer) return;

  const menuData = [
    {
      section: "Hot Coffee",
      items: [
        { name: "Coffee Americano", img: "../PICTURES/MENU/HOT_COFFEE.png", desc: "Rich espresso served hot.", sizes: { Small: 60, Medium: 70, Large: 85 } },
        { name: "Coffee Latte", img: "../PICTURES/MENU/HOT_COFFEE_LATTE_01.png", desc: "Smooth espresso with steamed milk.", sizes: { Small: 70, Medium: 80, Large: 95 } },
        { name: "Coffee Matcha", img: "../PICTURES/MENU/HOT_COFFEE_MATCHA.png", desc: "Stone-ground matcha with milk.", sizes: { Small: 75, Medium: 85, Large: 100 } },
        { name: "Hot Choco", img: "../PICTURES/MENU/HOT_CHOCO.png", desc: "Chocolate goodness with steamed milk.", sizes: { Small: 75, Medium: 85, Large: 100 } },
        { name: "Hot Tea", img: "../PICTURES/MENU/HOT_TEA.png", desc: "Aromatic brewed tea.", sizes: { Small: 60, Medium: 70, Large: 85 } }
      ]
    },
    {
      section: "Iced Cold Coffee",
      items: [
        { name: "Iced Americano", img: "../PICTURES/MENU/COLD COFFEE_00.png", desc: "Chilled espresso.", sizes: { Small: 70, Medium: 80, Large: 90 } },
        { name: "Iced Latte", img: "../PICTURES/MENU/COLD COFFEE_01.png", desc: "Espresso with cold milk.", sizes: { Small: 70, Medium: 80, Large: 95 } },
        { name: "Iced Latte Milk", img: "../PICTURES/MENU/COLD COFFEE_02.png", desc: "Creamy iced latte.", sizes: { Small: 75, Medium: 85, Large: 100 } },
        { name: "Iced Matcha", img: "../PICTURES/MENU/COLD COFFEE_03.png", desc: "Refreshing matcha iced drink.", sizes: { Small: 75, Medium: 85, Large: 100 } },
        { name: "Iced Milk", img: "../PICTURES/MENU/COLD COFFEE_04.png", desc: "Cold milk beverage.", sizes: { Small: 60, Medium: 70, Large: 85 } }
      ]
    },
    {
      section: "Iced Cold Drink with Fraff",
      items: [
        { name: "Coffee Fraff", img: "../PICTURES/MENU/FRAFF_01.png", desc: "Blended coffee with ice cream.", sizes: { Small: 75, Medium: 85, Large: 100 } },
        { name: "Choco Fraff", img: "../PICTURES/MENU/FRAFF_02.png", desc: "Chocolate blended drink.", sizes: { Small: 75, Medium: 85, Large: 100 } },
        { name: "Taho Fraff", img: "../PICTURES/MENU/FRAFF_03.png", desc: "Tofu blended dessert drink.", sizes: { Small: 70, Medium: 80, Large: 95 } },
        { name: "Vanilla Fraff", img: "../PICTURES/MENU/FRAFF_04.png", desc: "Vanilla ice blended drink.", sizes: { Small: 75, Medium: 85, Large: 100 } },
        { name: "Ube Vanilla Fraff", img: "../PICTURES/MENU/FRAFF_05.png", desc: "Ube and vanilla blended.", sizes: { Small: 80, Medium: 90, Large: 105 } },
        { name: "Buko Salad Fraff", img: "../PICTURES/MENU/FRAFF_06.png", desc: "Coconut salad blended.", sizes: { Small: 80, Medium: 90, Large: 105 } }
      ]
    },
    {
      section: "Juice",
      items: [
        { name: "Strawberry Juice", img: "../PICTURES/MENU/JUICE_01.png", desc: "Fresh strawberry juice.", sizes: { Small: 70, Medium: 80, Large: 90 } },
        { name: "Sweet Juice", img: "../PICTURES/MENU/JUICE_02.png", desc: "Mixed fruit juice.", sizes: { Small: 70, Medium: 80, Large: 90 } },
        { name: "Iced Tea", img: "../PICTURES/MENU/JUICE_03.png", desc: "Refreshing iced tea.", sizes: { Small: 60, Medium: 70, Large: 80 } }
      ]
    },
    {
      section: "Pastries",
      items: [
        { name: "Croissant", img: "../PICTURES/MENU/PASTRY_01.png", desc: "Flaky croissant.", sizes: { Regular: 80 } },
        { name: "Hopia", img: "../PICTURES/MENU/PASTRY_02.png", desc: "Delicious hopia.", sizes: { Regular: 85 } },
        { name: "Donutso", img: "../PICTURES/MENU/PASTRY_03.png", desc: "Sweet donut pastry.", sizes: { Regular: 85 } },
        { name: "Coffee Bread", img: "../PICTURES/MENU/PASTRY_04.png", desc: "Coffee-flavored bread.", sizes: { Regular: 100 } },
        { name: "Masarap Ito", img: "../PICTURES/MENU/PASTRY_05.png", desc: "Specialty pastry.", sizes: { Regular: 180 } }
      ]
    }
  ];

  let activeSection = "All";
  let currentItem = null;

  function showPopup(message) {
    if (!popup) return;
    popup.textContent = message;
    popup.classList.add("show");
    clearTimeout(showPopup._timer);
    showPopup._timer = setTimeout(() => popup.classList.remove("show"), 2000);
  }

  function getCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem("cart") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function persistCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("kaperazzo:cart-updated", {
      detail: {
        cart: cart.map((item) => ({ ...item }))
      }
    }));
  }

  function formatPriceRange(sizes) {
    const values = Object.values(sizes).map(Number).filter(Number.isFinite);
    if (!values.length) return "₱0";
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? `₱${min}` : `₱${min}–₱${max}`;
  }

  function getSizeLabel(sizes) {
    const count = Object.keys(sizes || {}).length;
    if (!count) return "No sizes";
    return count === 1 ? "1 size" : `${count} sizes`;
  }

  function buildFilters() {
    if (!filterContainer) return;
    const sections = ["All", ...menuData.map((section) => section.section)];
    filterContainer.innerHTML = sections.map((section) => `
      <button type="button" class="menu-filter-btn${section === activeSection ? " active" : ""}" data-section="${section}">${section}</button>
    `).join("");
  }

  function getFilteredSections() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    return menuData
      .filter((section) => activeSection === "All" || section.section === activeSection)
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!query) return true;
          const haystack = `${item.name} ${item.desc} ${section.section}`.toLowerCase();
          return haystack.includes(query);
        })
      }))
      .filter((section) => section.items.length > 0);
  }

  function renderResultSummary(filteredSections) {
    if (!resultSummary) return;
    const itemCount = filteredSections.reduce((sum, section) => sum + section.items.length, 0);
    const scope = activeSection === "All" ? "all menu categories" : activeSection;
    const query = (searchInput?.value || "").trim();
    const prefix = query ? `Showing ${itemCount} result${itemCount === 1 ? "" : "s"} for “${query}” in ${scope}.` : `Showing ${itemCount} item${itemCount === 1 ? "" : "s"} in ${scope}.`;
    resultSummary.textContent = prefix;
  }

  function renderMenu() {
    const filteredSections = getFilteredSections();
    renderResultSummary(filteredSections);

    if (!filteredSections.length) {
      menuContainer.innerHTML = `
        <div class="menu-empty-state">
          <h4 class="mb-2">No menu items found</h4>
          <p class="mb-0">Try a different search term or switch to another category.</p>
        </div>
      `;
      return;
    }

    menuContainer.innerHTML = filteredSections.map((section) => `
      <section class="menu-section-block" data-section="${section.section}">
        <div class="menu-section-title">
          <h3>${section.section}</h3>
          <span>${section.items.length} item${section.items.length === 1 ? "" : "s"}</span>
        </div>
        <div class="menu-items-grid">
          ${section.items.map((item) => `
            <article class="menu-item-card">
              <div class="menu-item-media">
                <img src="${item.img}" alt="${item.name}">
              </div>
              <div>
                <span class="menu-item-tag">${section.section}</span>
              </div>
              <div>
                <h4>${item.name}</h4>
                <p>${item.desc}</p>
              </div>
              <div class="menu-item-meta">
                <span class="menu-item-price">${formatPriceRange(item.sizes)}</span>
                <span class="menu-item-sizes">${getSizeLabel(item.sizes)}</span>
              </div>
              <div class="menu-item-actions">
                <button class="btn btn-dark add-card-btn" data-name="${item.name}" data-sizes='${JSON.stringify(item.sizes)}'>Order</button>
                <button class="btn btn-outline-dark" data-bs-toggle="modal" data-bs-target="#coffeeModal" data-name="${item.name}" data-img="${item.img}" data-desc="${item.desc}" data-sizes='${JSON.stringify(item.sizes)}'>Details</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function addToCartBySelection(name, selectedSize, price) {
    const cart = getCart();
    const itemName = `${name} (${selectedSize})`;
    const existing = cart.find((item) => item.name === itemName);

    if (existing) {
      existing.quantity = Number(existing.quantity ?? existing.qty ?? 1) + 1;
    } else {
      cart.push({ name: itemName, price: Number(price), quantity: 1, size: selectedSize });
    }

    persistCart(cart);
    showPopup(`${itemName} added to cart`);
  }

  filterContainer?.addEventListener("click", (event) => {
    const btn = event.target.closest(".menu-filter-btn");
    if (!btn) return;
    activeSection = btn.dataset.section || "All";
    buildFilters();
    renderMenu();
  });

  searchInput?.addEventListener("input", renderMenu);

  document.addEventListener("click", (event) => {
    const btn = event.target.closest(".add-card-btn");
    if (!btn) return;

    try {
      const sizes = JSON.parse(btn.dataset.sizes || "{}");
      const sizeKeys = Object.keys(sizes);
      if (!sizeKeys.length) return showPopup("No sizes available for this item.");
      const selectedSize = sizeKeys[0];
      addToCartBySelection(btn.dataset.name, selectedSize, Number(sizes[selectedSize]));
    } catch (err) {
      console.error("Add to cart failed", err);
      showPopup("Failed to add item to cart.");
    }
  });

  coffeeModal?.addEventListener("show.bs.modal", (event) => {
    const trigger = event.relatedTarget;
    if (!trigger) return;

    const name = trigger.getAttribute("data-name") || "Item";
    const img = trigger.getAttribute("data-img") || "";
    const desc = trigger.getAttribute("data-desc") || "";
    const sizes = JSON.parse(trigger.getAttribute("data-sizes") || "{}");

    currentItem = { name, sizes };
    modalTitle.textContent = name;
    modalImage.src = img;
    modalDescription.textContent = desc;
    modalSize.innerHTML = "";

    Object.entries(sizes).forEach(([size, price], index) => {
      const option = document.createElement("option");
      option.value = String(price);
      option.textContent = `${size} - ₱${price}`;
      if (index === 0) option.selected = true;
      modalSize.appendChild(option);
    });

    modalPrice.textContent = Number(Object.values(sizes)[0] || 0).toFixed(2);
  });

  modalSize?.addEventListener("change", () => {
    modalPrice.textContent = Number(modalSize.value || 0).toFixed(2);
  });

  addToCartBtn?.addEventListener("click", () => {
    if (!currentItem) return;
    const selectedText = modalSize?.selectedOptions?.[0]?.textContent || "Regular - ₱0";
    const selectedSize = selectedText.split(" - ")[0];
    const price = Number(modalPrice.textContent || 0);
    addToCartBySelection(currentItem.name, selectedSize, price);

    const modalInstance = window.bootstrap?.Modal?.getInstance(coffeeModal);
    modalInstance?.hide();
  });

  buildFilters();
  renderMenu();
});
