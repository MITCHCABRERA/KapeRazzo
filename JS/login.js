// JS/login.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("login.js loaded");

  const loginForm = document.getElementById("loginForm");
  const loginTitle = document.getElementById("loginTitle");
  const toggleRole = document.getElementById("toggleRole");
  const errorMessage = document.getElementById("errorMessage");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (!loginForm || !toggleRole || !loginTitle || !usernameInput || !passwordInput) {
    console.error("login.js: Missing required elements");
    return;
  }

  // current mode: false = user, true = admin
  let isAdmin = false;

  // Demo credentials
  const adminCred = { username: "admin", password: "admin123" };
  const userCred  = { username: "user",  password: "user123" };

  function updateModeUI() {
    if (isAdmin) {
      loginTitle.textContent = "Admin Login";
      toggleRole.textContent = "Switch to User Login";
      toggleRole.setAttribute("aria-pressed","true");
    } else {
      loginTitle.textContent = "User Login";
      toggleRole.textContent = "Login as Admin";
      toggleRole.setAttribute("aria-pressed","false");
    }

    usernameInput.value = "";
    passwordInput.value = "";
    errorMessage.textContent = "";
  }

  toggleRole.addEventListener("click", () => {
    isAdmin = !isAdmin;
    updateModeUI();
    console.log("login.js: mode changed. isAdmin =", isAdmin);
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    errorMessage.textContent = "";

    const u = usernameInput.value.trim();
    const p = passwordInput.value.trim();

    if (isAdmin) {
      if (u === adminCred.username && p === adminCred.password) {
        // ✅ IMPORTANT: admin.html checks "role"
        sessionStorage.setItem("role", "admin");
        sessionStorage.setItem("loggedInUser", "admin"); // optional (for your old code)

        window.location.href = "admin.html";
        return;
      } else {
        errorMessage.textContent = "Invalid admin username or password.";
        return;
      }
    } else {
      if (u === userCred.username && p === userCred.password) {
        // ✅ Set role for normal users too
        sessionStorage.setItem("role", "customer");
        sessionStorage.setItem("loggedInUser", "user"); // optional

        window.location.href = "../index.html";
        return;
      } else {
        errorMessage.textContent = "Invalid user username or password.";
        return;
      }
    }
  });

  updateModeUI();
});
