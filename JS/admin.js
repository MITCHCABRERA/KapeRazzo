document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:5000";

  // ✅ Add your admin key here (must match backend .env ADMIN_KEY)
  const ADMIN_KEY = "supersecret123";

  // ✅ Current logged in user uid (needed for PATCH/DELETE if your backend requires uid)
  const UID = sessionStorage.getItem("uid") || "";

  const refreshBtn = document.getElementById("refreshBtn") || document.getElementById("viewBtn");
  const exportBtn = document.getElementById("exportBtn");
  const output = document.getElementById("adminOutput");

  const ordersWrap = document.getElementById("ordersWrap");
  const reservationsWrap = document.getElementById("reservationsWrap");

  // New UI elements
  const kpiOrdersToday = document.getElementById("kpiOrdersToday");
  const kpiPending = document.getElementById("kpiPending");
  const kpiResToday = document.getElementById("kpiResToday");
  const kpiRevenue = document.getElementById("kpiRevenue");
  const adminSearch = document.getElementById("adminSearch");
  const statusFilter = document.getElementById("statusFilter");
  const timeframeFilter = document.getElementById("timeframeFilter");
  const timeCustom = document.getElementById("timeCustom");
  const adminToast = document.getElementById("adminToast");
  const detailModal = document.getElementById("detailModal");
  const modalBody = document.getElementById("modalBody");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  let cachedOrders = [];
  let cachedReservations = [];

  // ---------- helpers ----------
  const pretty = (obj) => JSON.stringify(obj, null, 2);

  function showToast(msg, timeout = 3000) {
    if (!adminToast) return;
    adminToast.textContent = msg;
    adminToast.classList.add("show");
    setTimeout(() => adminToast.classList.remove("show"), timeout);
  }

  function openModal(type, item) {
    if (!detailModal || !modalBody) return;
    modalBody.innerHTML = `
      <h4>${type === "order" ? "Order" : "Reservation"} Details</h4>
      <pre class="admin-output">${pretty(item)}</pre>
      <div style="margin-top:10px;">
        ${type === "order" ? `
          <button class="action-btn action-confirm" data-action="order-status" data-id="${item._id}" data-status="confirmed">Confirm</button>
          <button class="action-btn action-complete" data-action="order-status" data-id="${item._id}" data-status="completed">Complete</button>
        ` : `
          <button class="action-btn action-confirm" data-action="res-status" data-id="${item._id}" data-status="confirmed">Confirm</button>
        `}
        <button class="action-btn action-cancel" data-action="${type === "order" ? "order-status" : "res-status"}" data-id="${item._id}" data-status="cancelled">Cancel</button>
        <button class="action-btn action-delete" data-action="${type === "order" ? "order-delete" : "res-delete"}" data-id="${item._id}">Delete</button>
      </div>`;
    detailModal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!detailModal) return;
    detailModal.setAttribute("aria-hidden", "true");
  }

  modalCloseBtn?.addEventListener("click", closeModal);
  detailModal?.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });

  function updateKPIs(orders, reservations) {
    const today = new Date().toISOString().slice(0, 10);
    const ordersToday = orders.filter(o => new Date(o.createdAt).toISOString().slice(0,10) === today).length;
    const pending = orders.filter(o => o.status === "pending").length;
    const resToday = reservations.filter(r => (r.date || "").slice(0,10) === today).length;
    const revenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

    if (kpiOrdersToday) kpiOrdersToday.textContent = ordersToday;
    if (kpiPending) kpiPending.textContent = pending;
    if (kpiResToday) kpiResToday.textContent = resToday;
    if (kpiRevenue) kpiRevenue.textContent = `₱${revenue.toFixed(2)}`;
  }

  function applyFilters() {
    const q = (adminSearch?.value || "").trim().toLowerCase();
    const status = (statusFilter?.value || "").trim();
    const timeframe = (timeframeFilter?.value || "all");
    const customDate = (timeCustom?.value || "");

    let filteredOrders = cachedOrders.slice();
    let filteredReservations = cachedReservations.slice();

    // status filter
    if (status) {
      filteredOrders = filteredOrders.filter(o => o.status === status);
      filteredReservations = filteredReservations.filter(r => r.status === status);
    }

    // text search
    if (q) {
      filteredOrders = filteredOrders.filter(o => ((o.customerName || "") + " " + (o.customerEmail || "")).toLowerCase().includes(q));
      filteredReservations = filteredReservations.filter(r => ((r.name || "") + " " + (r.email || "") + " " + (r.phone || "")).toLowerCase().includes(q));
    }

    // timeframe filter
    function inTimeframe(dateStr) {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      d.setHours(0,0,0,0);
      const now = new Date();
      now.setHours(0,0,0,0);

      if (timeframe === 'today') return d.getTime() === now.getTime();
      if (timeframe === 'week') { const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0,0,0,0); return d >= start && d <= now; }
      if (timeframe === 'month') { const start = new Date(now); start.setMonth(now.getMonth() - 1); start.setHours(0,0,0,0); return d >= start && d <= now; }
      if (timeframe === 'custom') { if (!customDate) return true; const c = new Date(customDate); c.setHours(0,0,0,0); return d.getTime() === c.getTime(); }
      return true;
    }

    if (timeframe && timeframe !== 'all') {
      filteredOrders = filteredOrders.filter(o => inTimeframe(o.createdAt));
      filteredReservations = filteredReservations.filter(r => inTimeframe(r.date || r.createdAt));
    }

    // update UI
    renderOrders(filteredOrders);
    renderReservations(filteredReservations);
    updateKPIs(filteredOrders, filteredReservations);
  }

  adminSearch?.addEventListener("input", applyFilters);
  statusFilter?.addEventListener("change", applyFilters);
  timeframeFilter?.addEventListener("change", (e) => {
    if (timeframeFilter.value === 'custom') timeCustom.style.display = 'inline-block'; else timeCustom.style.display = 'none';
    applyFilters();
  });
  timeCustom?.addEventListener("change", applyFilters);

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
  // ✅ If your backend requires uid for PATCH/DELETE, include it
  const setOrderStatus = (id, status) =>
    fetchJSON(`${API_BASE}/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: UID, status })
    });

  const deleteOrder = (id) =>
    fetchJSON(`${API_BASE}/api/orders/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: UID })
    });

  const setReservationStatus = (id, status) =>
    fetchJSON(`${API_BASE}/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: UID, status })
    });

  const deleteReservation = (id) =>
    fetchJSON(`${API_BASE}/api/reservations/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: UID })
    });

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
          ${orders.map(o => {
            const badgeClass = o.status === 'pending' ? 'badge-pending' : o.status === 'confirmed' ? 'badge-confirmed' : o.status === 'completed' ? 'badge-completed' : 'badge-cancelled';
            return `
            <tr data-type="order" data-id="${o._id}" class="admin-row">
              <td>${new Date(o.createdAt).toLocaleString()}</td>
              <td>${escapeHtml(o.customerName)}</td>
              <td>${escapeHtml(o.customerEmail)}</td>
              <td>₱${Number(o.total).toFixed(2)}</td>
              <td><span class="badge ${badgeClass}">${escapeHtml(o.status)}</span></td>
              <td>${o.items.map(i => `${escapeHtml(i.name)} x${i.qty}`).join(", ")}</td>
              <td>
                <button class="action-btn action-confirm" data-action="order-status" data-id="${o._id}" data-status="confirmed">Confirm</button>
                <button class="action-btn action-complete" data-action="order-status" data-id="${o._id}" data-status="completed">Complete</button>
                <button class="action-btn action-cancel" data-action="order-status" data-id="${o._id}" data-status="cancelled">Cancel</button>
                <button class="action-btn action-delete" data-action="order-delete" data-id="${o._id}">Delete</button>
              </td>
            </tr>`;
          }).join("")}
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
          ${reservations.map(r => {
            const badgeClass = r.status === 'pending' ? 'badge-pending' : r.status === 'confirmed' ? 'badge-confirmed' : r.status === 'completed' ? 'badge-completed' : 'badge-cancelled';
            return `
            <tr data-type="reservation" data-id="${r._id}" class="admin-row">
              <td>${new Date(r.createdAt).toLocaleString()}</td>
              <td>${escapeHtml(r.name)}</td>
              <td>${escapeHtml(r.phone)}</td>
              <td>${escapeHtml(r.date)}</td>
              <td>${escapeHtml(r.time)}</td>
              <td>${r.guests}</td>
              <td><span class="badge ${badgeClass}">${escapeHtml(r.status)}</span></td>
              <td>
                <button class="action-btn action-confirm" data-action="res-status" data-id="${r._id}" data-status="confirmed">Confirm</button>
                <button class="action-btn action-cancel" data-action="res-status" data-id="${r._id}" data-status="cancelled">Cancel</button>
                <button class="action-btn action-delete" data-action="res-delete" data-id="${r._id}">Delete</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  // ---------- load ----------
  async function loadData() {
    try {
      if (output) output.textContent = "Loading data from MongoDB...";

      // ✅ Use secure adminKey
      const [orders, reservations] = await Promise.all([
        fetchJSON(`${API_BASE}/api/orders?adminKey=${encodeURIComponent(ADMIN_KEY)}`),
        fetchJSON(`${API_BASE}/api/reservations?adminKey=${encodeURIComponent(ADMIN_KEY)}`)
      ]);

      cachedOrders = orders;
      cachedReservations = reservations;

      updateKPIs(orders, reservations);
      applyFilters();

      if (output) output.textContent = "✅ Data loaded from MongoDB.";
    } catch (err) {
      console.error(err);
      showToast("Failed to load data");
      if (output) output.textContent = `❌ Failed to load data.\n${err.message}`;
    }
  }

  // ---------- export ----------
  exportBtn?.addEventListener("click", async () => {
    try {
      const [orders, reservations] = await Promise.all([
        fetchJSON(`${API_BASE}/api/orders?adminKey=${encodeURIComponent(ADMIN_KEY)}`),
        fetchJSON(`${API_BASE}/api/reservations?adminKey=${encodeURIComponent(ADMIN_KEY)}`)
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
      showToast("Export complete — JSON saved.");
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  });

  // ---------- actions ----------
  document.addEventListener("click", async (e) => {
    // Row click opens modal (ignore clicks on buttons)
    const row = e.target.closest("tr[data-id]");
    if (row && !e.target.closest("button")) {
      const type = row.dataset.type;
      const id = row.dataset.id;
      let item;
      if (type === "order") item = cachedOrders.find(o => o._id === id);
      else item = cachedReservations.find(r => r._id === id);
      if (item) openModal(type, item);
      return;
    }

    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const { action, id, status } = btn.dataset;

    try {
      if (action === "order-status") {
        await setOrderStatus(id, status);
        showToast("Order updated");
      }
      if (action === "order-delete") {
        if (!confirm("Delete order permanently?")) return;
        await deleteOrder(id);
        showToast("Order deleted");
      }
      if (action === "res-status") {
        await setReservationStatus(id, status);
        showToast("Reservation updated");
      }
      if (action === "res-delete") {
        if (!confirm("Delete reservation permanently?")) return;
        await deleteReservation(id);
        showToast("Reservation deleted");
      }

      closeModal();
      loadData();
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  });

  refreshBtn?.addEventListener("click", loadData);

  // initial load
  loadData();
});
