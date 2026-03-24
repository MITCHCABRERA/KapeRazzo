document.addEventListener("DOMContentLoaded", () => {
  const uid = sessionStorage.getItem("uid");
  const role = sessionStorage.getItem("role");

  if (!uid || role !== "admin") {
    alert("Admins only.");
    window.location.replace("../index.html");
  }
});
