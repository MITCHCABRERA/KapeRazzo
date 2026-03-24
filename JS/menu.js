document.addEventListener("DOMContentLoaded", () => {
  const popup = document.getElementById("addedPopup");
  const menuContainer = document.getElementById("menuSections");

  // Show popup message
  function showPopup(message) {
    if (!popup) return;
    popup.textContent = message;
    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), 2000);
  }

  // Menu Data
  const menuData = [
    {
      section: "Hot Coffee",
      items: [
        { name: "Coffee Americano", img: "../PICTURES/MENU/HOT_COFFEE.png", desc: "Rich espresso served hot.", sizes: { "Small": 60, "Medium": 70, "Large": 85 } },
        { name: "Coffee Latte", img: "../PICTURES/MENU/HOT_COFFEE_LATTE_01.png", desc: "Smooth espresso with steamed milk.", sizes: { "Small": 70, "Medium": 80, "Large": 95 } },
        { name: "Coffee Matcha", img: "../PICTURES/MENU/HOT_COFFEE_MATCHA.png", desc: "Stone-ground matcha with milk.", sizes: { "Small": 75, "Medium": 85, "Large": 100 } },
        { name: "Hot Choco", img: "../PICTURES/MENU/HOT_CHOCO.png", desc: "Chocolate goodness with steamed milk.", sizes: { "Small": 75, "Medium": 85, "Large": 100 } },
        { name: "Hot Tea", img: "../PICTURES/MENU/HOT_TEA.png", desc: "Aromatic brewed tea.", sizes: { "Small": 60, "Medium": 70, "Large": 85 } }
      ]
    },
    {
      section: "Iced Cold Coffee",
      items: [
        { name: "Iced Americano", img: "../PICTURES/MENU/COLD COFFEE_00.png", desc: "Chilled espresso.", sizes: { "Small": 70, "Medium": 80, "Large": 90 } },
        { name: "Iced Latte", img: "../PICTURES/MENU/COLD COFFEE_01.png", desc: "Espresso with cold milk.", sizes: { "Small": 70, "Medium": 80, "Large": 95 } },
        { name: "Iced Latte Milk", img: "../PICTURES/MENU/COLD COFFEE_02.png", desc: "Creamy iced latte.", sizes: { "Small": 75, "Medium": 85, "Large": 100 } },
        { name: "Iced Matcha", img: "../PICTURES/MENU/COLD COFFEE_03.png", desc: "Refreshing matcha iced drink.", sizes: { "Small": 75, "Medium": 85, "Large": 100 } },
        { name: "Iced Milk", img: "../PICTURES/MENU/COLD COFFEE_04.png", desc: "Cold milk beverage.", sizes: { "Small": 60, "Medium": 70, "Large": 85 } }
      ]
    },
    {
      section: "Iced Cold Drink with Fraff",
      items: [
        { name: "Coffee Fraff", img: "../PICTURES/MENU/FRAFF_01.png", desc: "Blended coffee with ice cream.", sizes: { "Small": 75, "Medium": 85, "Large": 100 } },
        { name: "Choco Fraff", img: "../PICTURES/MENU/FRAFF_02.png", desc: "Chocolate blended drink.", sizes: { "Small": 75, "Medium": 85, "Large": 100 } },
        { name: "Taho Fraff", img: "../PICTURES/MENU/FRAFF_03.png", desc: "Tofu blended dessert drink.", sizes: { "Small": 70, "Medium": 80, "Large": 95 } },
        { name: "Vanilla Fraff", img: "../PICTURES/MENU/FRAFF_04.png", desc: "Vanilla ice blended drink.", sizes: { "Small": 75, "Medium": 85, "Large": 100 } },
        { name: "Ube Vanilla Fraff", img: "../PICTURES/MENU/FRAFF_05.png", desc: "Ube and vanilla blended.", sizes: { "Small": 80, "Medium": 90, "Large": 105 } },
        { name: "Buko Salad Fraff", img: "../PICTURES/MENU/FRAFF_06.png", desc: "Coconut salad blended.", sizes: { "Small": 80, "Medium": 90, "Large": 105 } }
      ]
    },
    {
      section: "Juice",
      items: [
        { name: "Strawberry Juice", img: "../PICTURES/MENU/JUICE_01.png", desc: "Fresh strawberry juice.", sizes: { "Small": 70, "Medium": 80, "Large": 90 } },
        { name: "Sweet Juice", img: "../PICTURES/MENU/JUICE_02.png", desc: "Mixed fruit juice.", sizes: { "Small": 70, "Medium": 80, "Large": 90 } },
        { name: "Iced Tea", img: "../PICTURES/MENU/JUICE_03.png", desc: "Refreshing iced tea.", sizes: { "Small": 60, "Medium": 70, "Large": 80 } }
      ]
    },
    {
      section: "Pastries",
      items: [
        { name: "Croissant", img: "../PICTURES/MENU/PASTRY_01.png", desc: "Flaky croissant.", sizes: { "Regular": 80 } },
        { name: "Hopia", img: "../PICTURES/MENU/PASTRY_02.png", desc: "Delicious hopia.", sizes: { "Regular": 85 } },
        { name: "Donutso", img: "../PICTURES/MENU/PASTRY_03.png", desc: "Sweet donut pastry.", sizes: { "Regular": 85 } },
        { name: "Coffee Bread", img: "../PICTURES/MENU/PASTRY_04.png", desc: "Coffee-flavored bread.", sizes: { "Regular": 100 } },
        { name: "Masarap Ito", img: "../PICTURES/MENU/PASTRY_05.png", desc: "Specialty pastry.", sizes: { "Regular": 180 } }
      ]
    }
  ];

  // Render cards dynamically
  menuData.forEach(section => {
    const sectionTitle = document.createElement("h3");
    sectionTitle.textContent = section.section;
    sectionTitle.classList.add("mt-4");
    menuContainer.appendChild(sectionTitle);

    const row = document.createElement("div");
    row.classList.add("row", "row-cols-1", "row-cols-md-3", "g-4", "mb-4");

    section.items.forEach(item => {
      const col = document.createElement("div");
      col.classList.add("col");

      col.innerHTML = `
        <div class="card h-100">
          <img src="${item.img}" class="card-img-top" alt="${item.name}">
          <div class="card-body">
            <h5 class="card-title">${item.name}</h5>
            <p class="card-text">${item.desc}</p>
          </div>
          <div class="card-footer d-flex justify-content-between align-items-center">
            <span class="badge bg-success">&#8369; ${Object.values(item.sizes)[0]}</span>
            <div>
              <button class="btn btn-sm btn-outline-success add-card-btn" data-name="${item.name}" data-sizes='${JSON.stringify(item.sizes)}'>Add</button>
              <button class="btn btn-sm btn-dark" 
                      data-bs-toggle="modal" 
                      data-bs-target="#coffeeModal" 
                      data-name="${item.name}" 
                      data-img="${item.img}"
                      data-desc="${item.desc}" 
                      data-sizes='${JSON.stringify(item.sizes)}'>
                Details
              </button>
            </div>
          </div>
        </div>
      `;
      row.appendChild(col);
    });

    menuContainer.appendChild(row);
  });

  // Modal dynamic content
  const coffeeModal = document.getElementById("coffeeModal");
  const addToCartBtn = coffeeModal.querySelector(".btn-primary");
  let currentItem = {};

  coffeeModal.addEventListener("show.bs.modal", event => {
    const button = event.relatedTarget;
    const name = button.getAttribute("data-name");
    const img = button.getAttribute("data-img");
    const desc = button.getAttribute("data-desc");
    const sizes = JSON.parse(button.getAttribute("data-sizes"));

    document.getElementById("modalTitle").textContent = name;
    document.getElementById("modalDescription").textContent = desc;
    document.getElementById("modalImage").src = img;

    const sizeSelect = document.getElementById("modalSize");
    sizeSelect.innerHTML = "";
    for (let size in sizes) {
      const option = document.createElement("option");
      option.value = sizes[size];
      option.textContent = `${size} - ₱${sizes[size]}`;
      sizeSelect.appendChild(option);
    }

    document.getElementById("modalPrice").textContent = parseFloat(Object.values(sizes)[0]).toFixed(2);

    // Store current item
    currentItem = { name, sizes };
  });

  // Update price dynamically
  document.getElementById("modalSize").addEventListener("change", function () {
    document.getElementById("modalPrice").textContent = parseFloat(this.value).toFixed(2);
  });

  // ✅ Add to cart logic (from your old code)
  addToCartBtn.addEventListener("click", () => {
    const selectedOption = document.getElementById("modalSize").selectedOptions[0].textContent;
    const selectedSize = selectedOption.split(" - ")[0];
    const price = parseFloat(document.getElementById("modalPrice").textContent);
    const name = currentItem.name + ` (${selectedSize})`;

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingItem = cart.find(i => i.name === name);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ name, price, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    showPopup(`${name} added to cart ✅`);

    const modal = bootstrap.Modal.getInstance(coffeeModal);
    modal.hide();
  });

  // Add to cart directly from card (uses first/default size)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-card-btn');
    if (!btn) return;

    try {
      const name = btn.dataset.name;
      const sizes = JSON.parse(btn.dataset.sizes || '{}');
      const sizeKeys = Object.keys(sizes);
      if (!sizeKeys.length) return showPopup('No sizes available');
      const sizeName = sizeKeys[0];
      const price = Number(sizes[sizeName]);
      const itemName = `${name} (${sizeName})`;

      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const existing = cart.find(i => i.name === itemName);
      if (existing) existing.quantity += 1; else cart.push({ name: itemName, price, quantity: 1 });
      localStorage.setItem('cart', JSON.stringify(cart));
      showPopup(`${itemName} added to cart ✅`);
    } catch (err) {
      console.error('Add to cart failed', err);
      showPopup('Failed to add to cart');
    }
  });
});
