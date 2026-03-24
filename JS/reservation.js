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
  const resForm = document.getElementById("resForm");
  const resMsg = document.getElementById("resMsg");
  const listWrap = document.getElementById("myReservationsList");
  const nameInput = document.getElementById("rname");
  const dateInput = document.getElementById("rdate");
  const timeInput = document.getElementById("rtime");
  const partyInput = document.getElementById("party");
  const requestsInput = document.getElementById("requests");
  const phoneInput = document.getElementById("rphone");

  if (!resForm || !resMsg || !nameInput || !dateInput || !timeInput || !partyInput) return;

  function showMessage(text, type = "warning") {
    resMsg.innerHTML = `<div class="alert alert-${type}" role="alert">${text}</div>`;
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

  function setMinDate() {
    const today = new Date();
    dateInput.min = today.toISOString().slice(0, 10);
  }

  function updateTimeOptions() {
    const selectedDate = dateInput.value;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    Array.from(timeInput.querySelectorAll("option")).forEach((opt) => {
      if (!opt.value) return;
      const [h, m = "0"] = opt.value.split(":");
      const optMinutes = Number(h) * 60 + Number(m);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const disabled = selectedDate === todayStr && optMinutes <= nowMinutes;
      opt.disabled = disabled;
      opt.textContent = disabled ? `${opt.value} (Unavailable)` : opt.value;
    });
    if (timeInput.selectedOptions[0]?.disabled) timeInput.value = "";
  }

  async function loadMyReservations() {
    if (!listWrap) return;
    try {
      const reservations = await fetchJSON("/api/reservations/my");
      if (!reservations.length) {
        listWrap.innerHTML = '<p class="text-muted">No reservations yet.</p>';
        return;
      }

      listWrap.innerHTML = reservations.map((item) => `
        <div class="border rounded p-3 mb-3 bg-white shadow-sm">
          <div class="d-flex justify-content-between flex-wrap gap-2">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="badge text-bg-secondary">${escapeHtml(item.status)}</span>
          </div>
          <div>${escapeHtml(item.date)} at ${escapeHtml(item.time)} · ${escapeHtml(item.guests)} guest(s)</div>
          <div>Phone: ${escapeHtml(item.phone)}</div>
          <div class="small text-muted">Reservation ID: ${escapeHtml(item._id)}</div>
          ${item.status === "cancelled" ? "" : `<button class="btn btn-sm btn-outline-danger mt-2 cancel-reservation" data-id="${item._id}">Cancel Reservation</button>`}
        </div>
      `).join("");
    } catch (err) {
      listWrap.innerHTML = `<div class="alert alert-warning">${escapeHtml(err.message || "Failed to load reservations")}</div>`;
    }
  }

  setMinDate();
  updateTimeOptions();
  dateInput.addEventListener("change", updateTimeOptions);

  resForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      requireUid();
    } catch {
      return;
    }

    if (!nameInput.value.trim() || !dateInput.value.trim() || !timeInput.value.trim() || !partyInput.value.trim() || !phoneInput.value.trim()) {
      showMessage("Please fill out all required fields.", "warning");
      return;
    }

    try {
      const saved = await fetchJSON("/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          name: nameInput.value.trim(),
          phone: phoneInput.value.trim(),
          date: dateInput.value.trim(),
          time: timeInput.value.trim(),
          guests: Number(partyInput.value.trim()),
          notes: requestsInput?.value.trim() || ""
        })
      });
      showMessage(`Reservation saved. ID: <strong>${escapeHtml(saved._id)}</strong>`, "success");
      resForm.reset();
      setMinDate();
      loadMyReservations();
    } catch (err) {
      showMessage(escapeHtml(err.message || "Failed to save reservation"), "danger");
    }
  });

  listWrap?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".cancel-reservation");
    if (!btn) return;
    if (!confirm("Cancel this reservation?")) return;

    try {
      await fetchJSON(`/api/reservations/${btn.dataset.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" })
      });
      showMessage("Reservation cancelled.", "info");
      loadMyReservations();
    } catch (err) {
      showMessage(escapeHtml(err.message || "Failed to cancel reservation"), "danger");
    }
  });

  loadMyReservations();
});
