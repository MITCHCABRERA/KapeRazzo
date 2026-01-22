document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:5000";

  const refreshBtn = document.getElementById("refreshBtn") || document.getElementById("viewBtn");
  const exportBtn = document.getElementById("exportBtn");
  const output = document.getElementById("adminOutput");

  const ordersWrap = document.getElementById("ordersWrap");
  const reservationsWrap = document.getElementById("reservationsWrap");

  // ---------- helpers ----------
  const pretty = (obj) => JSON.stringify(obj, null, 2);

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ---------- API actions ----------
  const setOrderStatus = (id, status) =>
    fetchJSON(`${API_BASE}/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

  const deleteOrder = (id) =>
    fetchJSON(`${API_BASE}/api/orders/${id}`, { method: "DELETE" });

  const setReservationStatus = (id, status) =>
    fetchJSON(`${API_BASE}/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

  const deleteReservation = (id) =>
    fetchJSON(`${API_BASE}/api/reservations/${id}`, { method: "DELETE" });

  // ---------- render ----------
  function renderOrders(orders) {
    if (!ordersWrap) {
      output.textContent = pretty(orders);
      return;
    }

    if (!orders.length) {
      ordersWrap.innerHTML = "<p>No orders found.</p>";
      return;
    }

    ordersWrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Email</th>
            <th>Total</th>
            <th>Status</th>
            <th>Items</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td>${new Date(o.createdAt).toLocaleString()}</td>
              <td>${escapeHtml(o.customerName)}</td>
              <td>${escapeHtml(o.customerEmail)}</td>
              <td>₱${Number(o.total).toFixed(2)}</td>
              <td>${escapeHtml(o.status)}</td>
              <td>${o.items.map(i => `${i.name} x${i.qty}`).join(", ")}</td>
              <td>
                <button data-action="order-status" data-id="${o._id}" data-status="confirmed">Confirm</button>
                <button data-action="order-status" data-id="${o._id}" data-status="completed">Complete</button>
                <button data-action="order-status" data-id="${o._id}" data-status="cancelled">Cancel</button>
                <button data-action="order-delete" data-id="${o._id}">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderReservations(reservations) {
    if (!reservationsWrap) return;

    if (!reservations.length) {
      reservationsWrap.innerHTML = "<p>No reservations found.</p>";
      return;
    }

    reservationsWrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Date Reserved</th>
            <th>Time</th>
            <th>Guests</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${reservations.map(r => `
            <tr>
              <td>${new Date(r.createdAt).toLocaleString()}</td>
              <td>${escapeHtml(r.name)}</td>
              <td>${escapeHtml(r.phone)}</td>
              <td>${escapeHtml(r.date)}</td>
              <td>${escapeHtml(r.time)}</td>
              <td>${r.guests}</td>
              <td>${escapeHtml(r.status)}</td>
              <td>
                <button data-action="res-status" data-id="${r._id}" data-status="confirmed">Confirm</button>
                <button data-action="res-status" data-id="${r._id}" data-status="cancelled">Cancel</button>
                <button data-action="res-delete" data-id="${r._id}">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // ---------- load ----------
  async function loadData() {
    try {
      if (output) output.textContent = "Loading data from MongoDB...";

      const [orders, reservations] = await Promise.all([
        fetchJSON(`${API_BASE}/api/orders`),
        fetchJSON(`${API_BASE}/api/reservations`)
      ]);

      renderOrders(orders);
      renderReservations(reservations);

      if (output) output.textContent = "✅ Data loaded from MongoDB.";
    } catch (err) {
      console.error(err);
      if (output) output.textContent = `❌ Failed to load data.\n${err.message}`;
    }
  }

  // ---------- export ----------
  exportBtn?.addEventListener("click", async () => {
    try {
      const [orders, reservations] = await Promise.all([
        fetchJSON(`${API_BASE}/api/orders`),
        fetchJSON(`${API_BASE}/api/reservations`)
      ]);

      const blob = new Blob(
        [JSON.stringify({ orders, reservations }, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "KapeRazzo_AdminData_MongoDB.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  });

  // ---------- actions ----------
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const { action, id, status } = btn.dataset;

    try {
      if (action === "order-status") await setOrderStatus(id, status);
      if (action === "order-delete") {
        if (!confirm("Delete order permanently?")) return;
        await deleteOrder(id);
      }
      if (action === "res-status") await setReservationStatus(id, status);
      if (action === "res-delete") {
        if (!confirm("Delete reservation permanently?")) return;
        await deleteReservation(id);
      }

      loadData();
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  });

  refreshBtn?.addEventListener("click", loadData);

  // initial load
  loadData();
});
