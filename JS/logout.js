document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    sessionStorage.clear();

    alert("You have been logged out successfully!");

    window.location.href = new URL("login.html", window.location.href).href;

  });
});
