document.addEventListener("DOMContentLoaded", () => {
  const uid = sessionStorage.getItem("uid");
  const role = sessionStorage.getItem("role");

  if (!uid || role !== "admin") {
    window.location.replace("/login.html?next=/admin.html");
  }
});
