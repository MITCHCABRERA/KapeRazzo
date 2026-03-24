import { auth } from "./firebaseConfig.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { fetchJSON } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const CURRENT_UID = sessionStorage.getItem("uid") || "";

  const output = document.getElementById("adminMsg");
  const ordersWrap = document.getElementById("ordersWrap");
  const reservationsWrap = document.getElementById("reservationsWrap");
  const usersWrap = document.getElementById("usersWrap");
  const adminSearch = document.getElementById("adminSearch");
  const userSearch = document.getElementById("userSearch");
  const statusFilter = document.getElementById("statusFilter");
  const timeframeFilter = document.getElementById("timeframeFilter");
  const timeCustom = document.getElementById("timeCustom");
  const refreshBtn = document.getElementById("refreshBtn");
  const refreshUsersBtn = document.getElementById("refreshUsersBtn");
  const exportBtn = document.getElementById("exportBtn");
  const adminToast = document.getElementById("adminToast");
  const detailModal = document.getElementById("detailModal");
  const modalBody = document.getElementById("modalBody");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  const kpiOrdersToday = document.getElementById("kpiOrdersToday");
  const kpiPending = document.getElementById("kpiPending");
  const kpiResToday = document.getElementById("kpiResToday");
  const kpiRevenue = document.getElementById("kpiRevenue");
  const kpiUsersTotal = document.getElementById("kpiUsersTotal");

  let cachedOrders = [];
  let cachedReservations = [];
  let cachedUsers = [];


  const pretty = (obj) => JSON.stringify(obj, null, 2);

  function showToast(msg, timeout = 3000) {
    if (!adminToast) return;
    adminToast.textContent = msg;
    adminToast.classList.add("show");
    setTimeout(() => adminToast.classList.remove("show"), timeout);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? escapeHtml(value) : d.toLocaleString();
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


  const setOrderStatus = (id, status) =>
    fetchJSON(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

  const deleteOrder = (id) =>
    fetchJSON(`/api/orders/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

  const setReservationStatus = (id, status) =>
    fetchJSON(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

  const deleteReservation = (id) =>
    fetchJSON(`/api/reservations/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

  const setUserDisabled = (uid, disabled) =>
    fetchJSON(`/api/users/${uid}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled })
    });

  const setUserRole = (uid, role) =>
    fetchJSON(`/api/users/${uid}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });

  const deleteUser = (uid) =>
    fetchJSON(`/api/users/${uid}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

  async function sendResetEmail(email) {
    await sendPasswordResetEmail(auth, email);
  }

  function updateKPIs(orders, reservations, users) {
    const today = new Date().toISOString().slice(0, 10);
    const ordersToday = orders.filter(o => new Date(o.createdAt).toISOString().slice(0, 10) === today).length;
    const pending = orders.filter(o => o.status === "pending").length;
    const resToday = reservations.filter(r => (r.date || "").slice(0, 10) === today).length;
    const revenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

    if (kpiOrdersToday) kpiOrdersToday.textContent = ordersToday;
    if (kpiPending) kpiPending.textContent = pending;
    if (kpiResToday) kpiResToday.textContent = resToday;
    if (kpiRevenue) kpiRevenue.textContent = `₱${revenue.toFixed(2)}`;
    if (kpiUsersTotal) kpiUsersTotal.textContent = users.length;
  }

  function inTimeframe(dateStr, timeframe, customDate) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (timeframe === "today") return d.getTime() === now.getTime();

    if (timeframe === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return d >= start && d <= now;
    }

    if (timeframe === "month") {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return d >= start && d <= now;
    }

    if (timeframe === "custom") {
      if (!customDate) return true;
      const c = new Date(customDate);
      c.setHours(0, 0, 0, 0);
      return d.getTime() === c.getTime();
    }

    return true;
  }

  function renderOrders(orders) {
    if (!ordersWrap) {
      if (output) output.textContent = pretty(orders);
      return;
    }

    if (!orders.length) {
      ordersWrap.innerHTML = "<p>No orders found.</p>";
      return;
    }

    ordersWrap.innerHTML = `
      <div class="table-wrap">
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
              const badgeClass =
                o.status === "pending"
                  ? "badge-pending"
                  : o.status === "confirmed"
                  ? "badge-confirmed"
                  : o.status === "completed"
                  ? "badge-completed"
                  : "badge-cancelled";

              return `
              <tr data-type="order" data-id="${o._id}" class="admin-row">
                <td>${new Date(o.createdAt).toLocaleString()}</td>
                <td>${escapeHtml(o.customerName)}</td>
                <td>${escapeHtml(o.customerEmail)}</td>
                <td>₱${Number(o.total).toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(o.status)}</span></td>
                <td>${Array.isArray(o.items) ? o.items.map(i => `${escapeHtml(i.name)} x${i.qty}`).join(", ") : "—"}</td>
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
      </div>
    `;
  }

  function renderReservations(reservations) {
    if (!reservationsWrap) return;

    if (!reservations.length) {
      reservationsWrap.innerHTML = "<p>No reservations found.</p>";
      return;
    }

    reservationsWrap.innerHTML = `
      <div class="table-wrap">
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
              const badgeClass =
                r.status === "pending"
                  ? "badge-pending"
                  : r.status === "confirmed"
                  ? "badge-confirmed"
                  : r.status === "completed"
                  ? "badge-completed"
                  : "badge-cancelled";

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
      </div>
    `;
  }

  function renderUsers(users) {
    if (!usersWrap) return;

    if (!users.length) {
      usersWrap.innerHTML = "<p>No users found.</p>";
      return;
    }

    usersWrap.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Providers</th>
              <th>Verified</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Sign-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((user) => {
              const canManage = user.uid !== CURRENT_UID;
              return `
                <tr>
                  <td>${escapeHtml(user.displayName || "—")}</td>
                  <td>${escapeHtml(user.email || "—")}</td>
                  <td><span class="badge ${user.isAdmin ? "badge-admin" : "badge-customer"}">${escapeHtml(user.role)}${user.isSuperAdmin ? " (super)" : ""}</span></td>
                  <td>${escapeHtml((user.providers || []).join(", ") || "password")}</td>
                  <td><span class="badge ${user.emailVerified ? "badge-verified" : "badge-unverified"}">${user.emailVerified ? "verified" : "unverified"}</span></td>
                  <td><span class="badge ${user.disabled ? "badge-disabled" : "badge-enabled"}">${user.disabled ? "disabled" : "enabled"}</span></td>
                  <td>${formatDateTime(user.createdAt)}</td>
                  <td>${formatDateTime(user.lastSignInAt)}</td>
                  <td>
                    <button class="action-btn action-neutral" data-action="user-reset" data-email="${escapeHtml(user.email)}" ${!user.email ? "disabled" : ""}>Reset Email</button>
                    <button class="action-btn action-confirm" data-action="user-role" data-id="${user.uid}" data-role="${user.isAdmin ? "customer" : "admin"}" ${(!canManage && !user.isAdmin) || user.isSuperAdmin ? "disabled" : ""}>${user.isAdmin ? "Demote" : "Promote"}</button>
                    <button class="action-btn action-warning" data-action="user-toggle" data-id="${user.uid}" data-disabled="${user.disabled ? "false" : "true"}" ${!canManage ? "disabled" : ""}>${user.disabled ? "Enable" : "Disable"}</button>
                    <button class="action-btn action-delete" data-action="user-delete" data-id="${user.uid}" ${!canManage ? "disabled" : ""}>Delete</button>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function applyRecordFilters() {
    const q = (adminSearch?.value || "").trim().toLowerCase();
    const status = (statusFilter?.value || "").trim();
    const timeframe = (timeframeFilter?.value || "all");
    const customDate = (timeCustom?.value || "");

    let filteredOrders = cachedOrders.slice();
    let filteredReservations = cachedReservations.slice();

    if (status) {
      filteredOrders = filteredOrders.filter(o => o.status === status);
      filteredReservations = filteredReservations.filter(r => r.status === status);
    }

    if (q) {
      filteredOrders = filteredOrders.filter(o =>
        ((o.customerName || "") + " " + (o.customerEmail || "")).toLowerCase().includes(q)
      );
      filteredReservations = filteredReservations.filter(r =>
        ((r.name || "") + " " + (r.email || "") + " " + (r.phone || "")).toLowerCase().includes(q)
      );
    }

    if (timeframe && timeframe !== "all") {
      filteredOrders = filteredOrders.filter(o => inTimeframe(o.createdAt, timeframe, customDate));
      filteredReservations = filteredReservations.filter(r => inTimeframe(r.date || r.createdAt, timeframe, customDate));
    }

    renderOrders(filteredOrders);
    renderReservations(filteredReservations);
    updateKPIs(filteredOrders, filteredReservations, cachedUsers);
  }

  function applyUserFilter() {
    const q = (userSearch?.value || "").trim().toLowerCase();
    const users = !q
      ? cachedUsers.slice()
      : cachedUsers.filter((user) =>
          [user.displayName, user.email, user.role, user.uid]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q))
        );

    renderUsers(users);
  }

  adminSearch?.addEventListener("input", applyRecordFilters);
  statusFilter?.addEventListener("change", applyRecordFilters);
  timeframeFilter?.addEventListener("change", () => {
    if (timeframeFilter.value === "custom") {
      timeCustom.style.display = "inline-block";
    } else {
      timeCustom.style.display = "none";
    }
    applyRecordFilters();
  });
  timeCustom?.addEventListener("change", applyRecordFilters);
  userSearch?.addEventListener("input", applyUserFilter);

  async function loadData() {
    try {
      if (output) output.textContent = "Loading admin data...";

      const [orders, reservations, users] = await Promise.all([
        fetchJSON(`/api/orders`),
        fetchJSON(`/api/reservations`),
        fetchJSON(`/api/users`)
      ]);

      cachedOrders = orders;
      cachedReservations = reservations;
      cachedUsers = users;

      updateKPIs(orders, reservations, users);
      applyRecordFilters();
      applyUserFilter();

      if (output) output.textContent = "✅ Orders, reservations, and users loaded.";
    } catch (err) {
      console.error(err);
      showToast("Failed to load admin data");
      if (output) output.textContent = `❌ Failed to load data.\n${err.message}`;
    }
  }

  async function loadUsersOnly() {
    try {
      const users = await fetchJSON(`/api/users`);
      cachedUsers = users;
      if (kpiUsersTotal) kpiUsersTotal.textContent = users.length;
      applyUserFilter();
      showToast("Users refreshed");
    } catch (err) {
      console.error(err);
      alert("Failed to load users: " + err.message);
    }
  }

  exportBtn?.addEventListener("click", async () => {
    try {
      const [orders, reservations, users] = await Promise.all([
        fetchJSON(`/api/orders`),
        fetchJSON(`/api/reservations`),
        fetchJSON(`/api/users`)
      ]);

      const blob = new Blob(
        [JSON.stringify({ orders, reservations, users }, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "KapeRazzo_AdminData.json";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Export complete — JSON saved.");
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  });

  document.addEventListener("click", async (e) => {
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

    const { action, id, status, email, disabled } = btn.dataset;

    try {
      if (action === "order-status") {
        await setOrderStatus(id, status);
        showToast("Order updated");
        closeModal();
        await loadData();
        return;
      }

      if (action === "order-delete") {
        if (!confirm("Delete order permanently?")) return;
        await deleteOrder(id);
        showToast("Order deleted");
        closeModal();
        await loadData();
        return;
      }

      if (action === "res-status") {
        await setReservationStatus(id, status);
        showToast("Reservation updated");
        closeModal();
        await loadData();
        return;
      }

      if (action === "res-delete") {
        if (!confirm("Delete reservation permanently?")) return;
        await deleteReservation(id);
        showToast("Reservation deleted");
        closeModal();
        await loadData();
        return;
      }

      if (action === "user-reset") {
        if (!email) {
          alert("This user does not have an email address.");
          return;
        }
        await sendResetEmail(email);
        showToast(`Reset email sent to ${email}`);
        return;
      }

      if (action === "user-role") {
        const nextRole = btn.dataset.role === "admin" ? "admin" : "customer";
        await setUserRole(id, nextRole);
        showToast(nextRole === "admin" ? "User promoted to admin. They need to sign in again." : "User demoted to customer. They need to sign in again.");
        await loadUsersOnly();
        return;
      }

      if (action === "user-toggle") {
        const nextDisabled = disabled === "true";
        await setUserDisabled(id, nextDisabled);
        showToast(nextDisabled ? "User disabled" : "User enabled");
        await loadUsersOnly();
        return;
      }

      if (action === "user-delete") {
        if (!confirm("Delete this Firebase user permanently?")) return;
        await deleteUser(id);
        showToast("User deleted");
        await loadUsersOnly();
      }
    } catch (err) {
      console.error(err);
      alert("Action failed: " + err.message);
    }
  });

  refreshBtn?.addEventListener("click", loadData);
  refreshUsersBtn?.addEventListener("click", loadUsersOnly);

  loadData();
});
