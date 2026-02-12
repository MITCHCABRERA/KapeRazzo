document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:5000";

  const resForm = document.getElementById("resForm");
  const resMsg = document.getElementById("resMsg");

  // Form fields
  const nameInput = document.getElementById("rname");
  const dateInput = document.getElementById("rdate");
  const timeInput = document.getElementById("rtime");
  const partyInput = document.getElementById("party");
  const requestsInput = document.getElementById("requests");

  // Optional: if you later add these in your HTML, this code will pick them up
  const phoneInput = document.getElementById("rphone"); // optional
  const emailInput = document.getElementById("remail"); // optional

  if (!resForm || !resMsg || !nameInput || !dateInput || !timeInput || !partyInput) {
    console.error("reservation.js: required elements not found. Check your IDs.");
    return;
  }

  // -------------------------
  // ✅ Firebase identity helpers (login via Firebase, save data in MongoDB)
  // -------------------------
  function requireUid() {
    const uid = sessionStorage.getItem("uid");
    if (!uid) {
      alert("Please login with Google first to reserve a table.");
      window.location.href = "login.html"; // reservation.html and login.html are both in HTML/
      throw new Error("No uid (not logged in)");
    }
    return uid;
  }

  function getUid() {
    return sessionStorage.getItem("uid") || "";
  }

  function getEmailFromSession() {
    // your login.js stores "email"
    const email =
      sessionStorage.getItem("email") ||
      sessionStorage.getItem("userEmail") ||
      sessionStorage.getItem("loggedInUserEmail") ||
      sessionStorage.getItem("loggedInUser") ||
      "";
    return email.includes("@") ? email : "guest@email.com";
  }

  // -------------------------
  // Utility Functions
  // -------------------------
  function highlightField(input) {
    input.style.border = "2px solid #ff7b7b"; // soft red
    input.style.boxShadow = "0 0 5px #ff7b7b";
  }

  function clearHighlights() {
    [nameInput, dateInput, timeInput, partyInput].forEach((input) => {
      input.style.border = "";
      input.style.boxShadow = "";
    });
  }

  function showMessage(text, type = "warning") {
    resMsg.innerHTML = `<div class="alert alert-${type}" role="alert">${text}</div>`;
    setTimeout(() => {
      resMsg.innerHTML = "";
    }, 5000);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // -------------------------
  // Date / Time availability (gray out past slots)
  // -------------------------
  function setMinDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  function updateTimeOptions() {
    const selectedDate = dateInput.value;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const options = Array.from(timeInput.querySelectorAll("option"));

    options.forEach((opt) => {
      if (!opt.value) return; // skip placeholder
      const [h, m = "0"] = opt.value.split(":");
      const optMinutes = Number(h) * 60 + Number(m);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      if (selectedDate === todayStr) {
        if (optMinutes <= nowMinutes) {
          if (!opt.disabled) {
            opt.disabled = true;
            opt.dataset.origText = opt.textContent;
            opt.textContent = `${opt.value} (Unavailable)`;
            opt.classList.add("text-muted");
          }
        } else {
          if (opt.disabled) {
            opt.disabled = false;
            opt.textContent = opt.dataset.origText || opt.value;
            opt.classList.remove("text-muted");
          }
        }
      } else {
        if (opt.disabled) {
          opt.disabled = false;
          opt.textContent = opt.dataset.origText || opt.value;
          opt.classList.remove("text-muted");
        }
      }
    });

    // Clear selection if the chosen option became disabled
    const selectedOpt = timeInput.selectedOptions[0];
    if (selectedOpt && selectedOpt.disabled) {
      timeInput.value = "";
    }
  }

  // Initialize date min and time availability
  setMinDate();
  updateTimeOptions();
  dateInput.addEventListener("change", updateTimeOptions);
  setInterval(updateTimeOptions, 60 * 1000);

  // -------------------------
  // Save reservation data to localStorage (backup / offline)
  // -------------------------
  function saveReservationLocal(data) {
    let reservations = JSON.parse(localStorage.getItem("reservations")) || [];
    reservations.push(data);
    localStorage.setItem("reservations", JSON.stringify(reservations));
  }

  // -------------------------
  // DB Save (MongoDB via API)
  // -------------------------
  async function saveReservationToDB(payload) {
    const res = await fetch(`${API_BASE}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // -------------------------
  // Form Submission
  // -------------------------
  resForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearHighlights();

    // ✅ require Google login (so each reservation has uid)
    try {
      requireUid();
    } catch {
      return;
    }

    let missingFields = [];
    if (nameInput.value.trim() === "") missingFields.push("Full Name");
    if (dateInput.value.trim() === "") missingFields.push("Date");
    if (timeInput.value.trim() === "") missingFields.push("Time Slot");
    if (partyInput.value.trim() === "") missingFields.push("Party Size");

    if (missingFields.length > 0) {
      if (nameInput.value.trim() === "") highlightField(nameInput);
      if (dateInput.value.trim() === "") highlightField(dateInput);
      if (timeInput.value.trim() === "") highlightField(timeInput);
      if (partyInput.value.trim() === "") highlightField(partyInput);

      showMessage(`⚠️ Please fill out the following fields: ${missingFields.join(", ")}`, "warning");
      return;
    }

    // Build reservation data
    const reservationLocal = {
      uid: getUid(), // ✅ store uid locally too (useful)
      name: nameInput.value.trim(),
      date: dateInput.value.trim(),
      time: timeInput.value.trim(),
      partySize: partyInput.value.trim(),
      requests: requestsInput?.value.trim() || "None",
      timestamp: new Date().toLocaleString(),
    };

    // ✅ Payload for MongoDB + uid
    // backend schema expects: name, phone, email, date, time, guests, notes
    const reservationPayload = {
      uid: getUid(), // ✅ NEW: link to Google account
      name: reservationLocal.name,
      phone: phoneInput?.value.trim() || "N/A",
      email: emailInput?.value.trim() || getEmailFromSession(),
      date: reservationLocal.date,
      time: reservationLocal.time,
      guests: Number(reservationLocal.partySize),
      notes: reservationLocal.requests === "None" ? "" : reservationLocal.requests,
    };

    try {
      const saved = await saveReservationToDB(reservationPayload);

      // Keep saving locally too (so your existing UI behavior stays)
      saveReservationLocal({ ...reservationLocal, dbId: saved._id });

      showMessage(
        `✅ Thank you, ${escapeHtml(reservationLocal.name)}! Your reservation is saved ✅<br>
         <small>Reservation ID: <strong>${escapeHtml(saved._id)}</strong></small>`,
        "success"
      );

      resForm.reset();
    } catch (err) {
      console.error("Reservation save failed:", err.message);

      // Fallback: still save locally so user doesn't lose it
      saveReservationLocal({ ...reservationLocal, dbError: err.message });

      showMessage(
        `❌ Failed to save reservation to database.<br>
         <small>${escapeHtml(err.message)}</small><br>
         <small>Saved locally as backup.</small>`,
        "danger"
      );
    }
  });
});
