import { fetchJSON } from "./api.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  const cartList = document.getElementById("cartList") || document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const clearCartBtn = document.getElementById("clearCart") || document.getElementById("clearCartBtn");
  const confirmBtn = document.getElementById("confirmCart") || document.getElementById("checkoutBtn");
  const messageArea = document.getElementById("cartMsg");
  const ordersContainer = document.getElementById("confirmedOrdersList");
  const noOrdersMsg = document.getElementById("noOrdersMsg");
  const nameInput = document.getElementById("cartName");
  const phoneInput = document.getElementById("cartPhone");
  const methodSelect = document.getElementById("cartMethod");
  const accountInput = document.getElementById("cartAccount");
  const refInput = document.getElementById("cartRef");
  const addressInput = document.getElementById("cartAddress");

  if (!cartList || !cartTotal) return;

  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  let orders = [];

  function showMessage(html) {
    if (!messageArea) return;
    messageArea.innerHTML = html;
  }

  function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
  }

  function requireUid() {
    const uid = sessionStorage.getItem("uid");
    if (!uid) {
      alert("Please login and verify your email first.");
      window.location.href = "login.html";
      throw new Error("No uid");
    }
    return uid;
  }

  async function loadMyOrders() {
    try {
      orders = await fetchJSON("/api/orders/my");
      renderOrders();
    } catch (err) {
      if (String(err.message || "").includes("verify your email")) {
        showMessage(`<div class="alert alert-warning">${escapeHtml(err.message)}</div>`);
      }
    }
  }

  async function postOrderToDB(orderData) {
    return fetchJSON("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: orderData.name,
        phone: orderData.phone,
        method: orderData.method,
        address: orderData.address,
        payment: {
          account: orderData.account,
          reference: orderData.reference
        },
        items: orderData.items,
        total: orderData.total
      })
    });
  }

  async function cancelOrderInDB(dbId) {
    return fetchJSON(`/api/orders/${dbId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" })
    });
  }

  function renderOrders() {
    if (!ordersContainer) return;
    ordersContainer.innerHTML = "";

    if (!orders.length) {
      if (noOrdersMsg) noOrdersMsg.style.display = "block";
      return;
    }

    if (noOrdersMsg) noOrdersMsg.style.display = "none";

    orders.forEach((order) => {
      const div = document.createElement("div");
      div.className = "list-group-item list-group-item-action flex-column align-items-start mb-3 border border-1 rounded p-3 shadow-sm";
      div.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
          <h5 class="mb-1">${escapeHtml(order.customerName)}</h5>
          <small>${escapeHtml(new Date(order.createdAt).toLocaleString())}</small>
        </div>
        <p class="mb-1">📞 ${escapeHtml(order.phone || "N/A")} | 💳 ${escapeHtml(order.method || "N/A")}</p>
        <p class="mb-1">Status: <strong>${escapeHtml(order.status)}</strong></p>
        <p class="mb-1">Total: ₱${Number(order.total || 0).toFixed(2)}</p>
        <p class="mb-2">📍 ${escapeHtml(order.address || "N/A")}</p>
        <p class="mb-2"><small class="text-muted">Order ID: ${escapeHtml(order._id)}</small></p>
        <ul class="mb-2">
          ${(order.items || []).map((i) => `<li>${escapeHtml(i.name)} x${i.qty} — ₱${(Number(i.price) * Number(i.qty)).toFixed(2)}</li>`).join("")}
        </ul>
        ${order.status === "cancelled" || order.status === "completed" ? "" : `<button class="btn btn-sm btn-outline-danger cancel-order" data-id="${order._id}">Cancel Order</button>`}
      `;
      ordersContainer.appendChild(div);
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
        </div>`;
      cartList.appendChild(row);
    });
    cartTotal.textContent = `₱${total.toFixed(2)}`;
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

  ordersContainer?.addEventListener("click", async (evt) => {
    const btn = evt.target.closest(".cancel-order");
    if (!btn) return;
    if (!confirm("Cancel this order?")) return;
    try {
      requireUid();
      const updated = await cancelOrderInDB(btn.dataset.id);
      orders = orders.map((order) => order._id === updated._id ? updated : order);
      renderOrders();
      showMessage('<div class="alert alert-info">Order cancelled.</div>');
    } catch (err) {
      showMessage(`<div class="alert alert-danger">${escapeHtml(err.message || "Unable to cancel order")}</div>`);
    }
  });

  clearCartBtn?.addEventListener("click", () => {
    cart = [];
    saveCart();
    renderCart();
    showMessage('<div class="alert alert-secondary">Cart cleared.</div>');
  });

  confirmBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      requireUid();
    } catch {
      return;
    }

    if (!cart.length) {
      showMessage('<div class="alert alert-warning">Your cart is empty.</div>');
      return;
    }

    const nameVal = nameInput?.value.trim() || "";
    const phoneVal = phoneInput?.value.trim() || "";
    const methodVal = methodSelect?.value || "";
    const accountVal = accountInput?.value.trim() || "";
    const refVal = refInput?.value.trim() || "";
    const addressVal = addressInput?.value.trim() || "";

    if (!nameVal || !phoneVal || !methodVal || !accountVal || !refVal) {
      showMessage('<div class="alert alert-warning">Please fill out all required fields.</div>');
      return;
    }

    if (methodVal === "Delivery" && !addressVal) {
      showMessage('<div class="alert alert-warning">Please provide a delivery address.</div>');
      return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity ?? item.qty ?? 1), 0);
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
      total: totalAmount
    };

    try {
      const saved = await postOrderToDB(orderData);
      cart = [];
      saveCart();
      renderCart();
      nameInput.value = "";
      phoneInput.value = "";
      accountInput.value = "";
      refInput.value = "";
      addressInput.value = "";
      await loadMyOrders();
      showMessage(`<div class="alert alert-success">Order placed successfully. ID: <strong>${escapeHtml(saved._id)}</strong></div>`);
    } catch (err) {
      showMessage(`<div class="alert alert-danger">${escapeHtml(err.message || "Failed to place order")}</div>`);
    }
  });

  renderCart();
  loadMyOrders();
});
