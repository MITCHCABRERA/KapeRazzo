(function () {
  console.log("order.js: script loaded");

  document.addEventListener("DOMContentLoaded", () => {
    console.log("order.js: DOMContentLoaded");

    const API_BASE = "http://localhost:5000";

    const cartList = document.getElementById("cartList") || document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");
    const clearCartBtn = document.getElementById("clearCart") || document.getElementById("clearCartBtn");
    const confirmBtn = document.getElementById("confirmCart") || document.getElementById("checkoutBtn");
    const messageArea = document.getElementById("cartMsg");

    const ordersContainer = document.getElementById("confirmedOrdersList");
    const noOrdersMsg = document.getElementById("noOrdersMsg");

    if (!cartList || !cartTotal) {
      console.error("order.js: Required elements (#cartList or #cartTotal) not found in the DOM.");
      return;
    }

    const nameInput = document.getElementById("cartName");
    const phoneInput = document.getElementById("cartPhone");
    const methodSelect = document.getElementById("cartMethod");
    const accountInput = document.getElementById("cartAccount");
    const refInput = document.getElementById("cartRef");
    const addressInput = document.getElementById("cartAddress");

    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let orders = JSON.parse(localStorage.getItem("orders")) || [];

    function saveCart() {
      localStorage.setItem("cart", JSON.stringify(cart));
    }

    function saveOrders() {
      localStorage.setItem("orders", JSON.stringify(orders));
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function showMessage(html) {
      if (!messageArea) return;
      messageArea.innerHTML = html;
      messageArea.style.opacity = "1";

      setTimeout(() => {
        messageArea.style.transition = "opacity 0.5s ease";
        messageArea.style.opacity = "0";
      }, 3500);

      setTimeout(() => {
        messageArea.innerHTML = "";
        messageArea.style.opacity = "1";
      }, 4000);
    }

    function requireUid() {
      const uid = sessionStorage.getItem("uid");
      if (!uid) {
        alert("Please login with Google first to continue.");
        window.location.href = "login.html";
        throw new Error("No uid (not logged in)");
      }
      return uid;
    }

    function getCustomerEmail() {
      const email =
        sessionStorage.getItem("email") ||
        sessionStorage.getItem("userEmail") ||
        sessionStorage.getItem("loggedInUserEmail") ||
        sessionStorage.getItem("loggedInUser") ||
        "";

      return email.includes("@") ? email : "guest@email.com";
    }

    async function postOrderToDB(orderData) {
      const payload = {
        customerName: orderData.name,
        customerEmail: getCustomerEmail(),
        phone: orderData.phone,
        method: orderData.method,
        address: orderData.address,
        payment: {
          account: orderData.account,
          reference: orderData.reference
        },
        items: orderData.items.map((i) => ({
          productId: i.productId || i._id || undefined,
          name: i.name,
          price: Number(i.price),
          qty: Number(i.qty),
          size: i.size || "Regular"
        })),
        total: Number(orderData.total)
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      return res.json();
    }

    async function cancelOrderInDB(dbId) {
      const payload = { status: "cancelled" };

      const res = await fetch(`${API_BASE}/api/orders/${dbId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      return res.json();
    }

    function renderOrders() {
      if (!ordersContainer) return;

      ordersContainer.innerHTML = "";
      if (orders.length === 0) {
        if (noOrdersMsg) noOrdersMsg.style.display = "block";
        return;
      }
      if (noOrdersMsg) noOrdersMsg.style.display = "none";

      orders.forEach((order, index) => {
        const div = document.createElement("div");
        div.className =
          "list-group-item list-group-item-action flex-column align-items-start mb-3 border border-1 rounded p-3 shadow-sm";

        div.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <h5 class="mb-1">${escapeHtml(order.name)}</h5>
            <small>${escapeHtml(order.createdAt)}</small>
          </div>
          <p class="mb-1">📞 ${escapeHtml(order.phone)} | 💳 ${escapeHtml(order.method)}</p>
          <p class="mb-1">Total: ₱${Number(order.total).toFixed(2)}</p>
          <p class="mb-2">📍 ${escapeHtml(order.address || "N/A")}</p>
          ${order.dbId ? `<p class="mb-2"><small class="text-muted">DB Order ID: ${escapeHtml(order.dbId)}</small></p>` : ""}
          <ul class="mb-2">
            ${order.items
              .map((i) => `<li>${escapeHtml(i.name)} x${i.qty} — ₱${(i.price * i.qty).toFixed(2)}</li>`)
              .join("")}
          </ul>
          <button class="btn btn-sm btn-outline-danger cancel-order" data-index="${index}">Cancel Order</button>
        `;

        ordersContainer.appendChild(div);
      });
    }

    if (ordersContainer) {
      ordersContainer.addEventListener("click", async (e) => {
        const btn = e.target.closest(".cancel-order");
        if (!btn) return;

        try {
          requireUid();
        } catch {
          return;
        }

        const idx = parseInt(btn.dataset.index, 10);
        if (isNaN(idx)) return;

        if (!confirm("Are you sure you want to cancel this order?")) return;

        const order = orders[idx];

        if (order?.dbId) {
          try {
            await cancelOrderInDB(order.dbId);
          } catch (err) {
            console.error("DB cancel failed:", err.message);
            showMessage(`<div class="alert alert-danger">❌ DB cancel failed: ${escapeHtml(err.message)}</div>`);
            return;
          }
        }

        orders.splice(idx, 1);
        saveOrders();
        renderOrders();

        showMessage(`<div class="alert alert-danger">❌ Order canceled successfully.</div>`);
      });
    }

    function renderCart() {
      cartList.innerHTML = "";

      if (cart.length === 0) {
        cartList.innerHTML = "<p>Your cart is empty.</p>";
        cartTotal.textContent = "₱0.00";
        return;
      }

      let total = 0;

      cart.forEach((item, index) => {
        const qty = Number(item.quantity ?? item.qty ?? 1);
        total += Number(item.price) * qty;

        const row = document.createElement("div");
        row.className = "cart-item d-flex justify-content-between align-items-center";
        row.innerHTML = `
          <div>${escapeHtml(item.name)} x${qty}</div>
          <div>
            ₱${(Number(item.price) * qty).toFixed(2)}
            <button type="button" class="btn btn-sm btn-outline-danger ms-2 remove-btn" data-index="${index}">×</button>
          </div>
        `;
        cartList.appendChild(row);
      });

      cartTotal.textContent = "₱" + total.toFixed(2);
      saveCart();
    }

    cartList.addEventListener("click", (evt) => {
      const btn = evt.target.closest(".remove-btn");
      if (!btn) return;

      const index = Number(btn.dataset.index);
      if (!Number.isInteger(index)) return;

      cart.splice(index, 1);
      renderCart();
    });

    if (clearCartBtn) {
      clearCartBtn.addEventListener("click", () => {
        cart = [];
        saveCart();
        renderCart();
        showMessage(`<div class="alert alert-secondary">🧹 Cart cleared.</div>`);
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        try {
          requireUid();
        } catch {
          return;
        }

        if (cart.length === 0) {
          showMessage(`<div class="alert alert-warning">🛒 Your cart is empty.</div>`);
          return;
        }

        const nameVal = nameInput?.value.trim() || "";
        const phoneVal = phoneInput?.value.trim() || "";
        const methodVal = methodSelect?.value || "";
        const accountVal = accountInput?.value.trim() || "";
        const refVal = refInput?.value.trim() || "";
        const addressVal = addressInput?.value.trim() || "";

        if (!nameVal || !phoneVal || !methodVal || !accountVal || !refVal) {
          showMessage(`<div class="alert alert-warning">⚠️ Please fill out all required fields.</div>`);
          return;
        }

        if (methodVal === "Delivery" && !addressVal) {
          showMessage(`<div class="alert alert-warning">⚠️ Please provide a delivery address.</div>`);
          return;
        }

        const totalAmount = cart.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity ?? item.qty ?? 1),
          0
        );

        const orderData = {
          name: nameVal,
          phone: phoneVal,
          method: methodVal,
          account: accountVal,
          reference: refVal,
          address: addressVal || "N/A",
          items: cart.map((i) => ({
            productId: i._id || i.productId || undefined,
            name: i.name,
            qty: Number(i.quantity ?? i.qty ?? 1),
            price: Number(i.price),
            size: i.size || "Regular"
          })),
          total: totalAmount,
          createdAt: new Date().toLocaleString()
        };

        try {
          const saved = await postOrderToDB(orderData);

          orders.push({ ...orderData, dbId: saved._id });
          saveOrders();

          cart = [];
          saveCart();
          renderCart();
          renderOrders();

          showMessage(`<div class="alert alert-success">
            ✅ Order saved to database ✅<br>
            Order ID: <strong>${escapeHtml(saved._id)}</strong><br>
            <small>Saved under your account.</small>
          </div>`);
        } catch (err) {
          console.error("Order save failed:", err.message);
          showMessage(`<div class="alert alert-danger">
            ❌ Failed to save order to database.<br>
            <small>${escapeHtml(err.message)}</small>
          </div>`);
        }
      });
    }

    renderCart();
    renderOrders();
  });
})();