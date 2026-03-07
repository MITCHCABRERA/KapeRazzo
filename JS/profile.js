document.addEventListener("DOMContentLoaded", () => {
  const name = sessionStorage.getItem("displayName") || "User";
  const email =
    sessionStorage.getItem("email") ||
    sessionStorage.getItem("userEmail") ||
    sessionStorage.getItem("loggedInUserEmail") ||
    "guest@email.com";

  const photoURL = sessionStorage.getItem("photoURL") || "";

  const userNameEl = document.getElementById("userName");
  const userEmailEl = document.getElementById("userEmail");
  const userPhotoEl = document.getElementById("userPhoto");

  if (userNameEl) userNameEl.textContent = name;
  if (userEmailEl) userEmailEl.textContent = email;

  if (userPhotoEl) {
    userPhotoEl.src =
      photoURL ||
      "https://ui-avatars.com/api/?name=" + encodeURIComponent(name);
  }
});
