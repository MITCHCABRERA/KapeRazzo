import { auth } from "./firebaseConfig.js";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { fetchJSON } from "./api.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("profileForm");
  const msg = document.getElementById("profileMsg");
  const nameInput = document.getElementById("profileDisplayName");
  const photoInput = document.getElementById("profilePhotoURL");
  const emailInput = document.getElementById("profileEmail");
  const roleEl = document.getElementById("profileRole");
  const verifiedEl = document.getElementById("profileVerified");
  const currentPassword = document.getElementById("currentPassword");
  const newPassword = document.getElementById("newPassword");

  function show(message, type="info") {
    msg.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }

  async function loadProfile() {
    try {
      const profile = await fetchJSON("/api/users/me");
      nameInput.value = profile.displayName || sessionStorage.getItem("displayName") || "";
      photoInput.value = profile.photoURL || sessionStorage.getItem("photoURL") || "";
      emailInput.value = profile.email || sessionStorage.getItem("email") || "";
      roleEl.textContent = profile.role || "customer";
      verifiedEl.textContent = profile.emailVerified ? "verified" : "not verified";
    } catch (err) {
      show(escapeHtml(err.message || "Failed to load profile"), "danger");
    }
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = {
        displayName: nameInput.value.trim(),
        photoURL: photoInput.value.trim()
      };
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, payload).catch(() => {});
        if (newPassword.value.trim()) {
          const credential = EmailAuthProvider.credential(user.email, currentPassword.value);
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword.value.trim());
        }
      }
      const updated = await fetchJSON("/api/users/me", { method: "PATCH", body: JSON.stringify(payload) });
      sessionStorage.setItem("displayName", updated.displayName || payload.displayName || "");
      sessionStorage.setItem("photoURL", updated.photoURL || payload.photoURL || "");
      show("Profile updated successfully.", "success");
      currentPassword.value = "";
      newPassword.value = "";
      await loadProfile();
    } catch (err) {
      show(escapeHtml(err.message || "Failed to update profile"), "danger");
    }
  });

  loadProfile();
});
