document.addEventListener("DOMContentLoaded", () => {
  const loginTitle = document.getElementById("loginTitle");
  const toggleRole = document.getElementById("toggleRole");
  const errorMessage = document.getElementById("errorMessage");
  const googleLoginBtn = document.getElementById("googleLoginBtn");

  const API_BASE = "http://localhost:5000";

  if (!toggleRole || !loginTitle || !googleLoginBtn) return;

  let isAdminMode = false;

  function setError(msg) {
    if (errorMessage) errorMessage.textContent = msg || "";
  }

  function updateModeUI() {
    loginTitle.textContent = isAdminMode ? "Admin Login" : "User Login";
    toggleRole.textContent = isAdminMode ? "Switch to User Login" : "Login as Admin";
    toggleRole.setAttribute("aria-pressed", isAdminMode ? "true" : "false");
    setError("");
  }

  function go(url) {
    window.location.replace(url);
    setTimeout(() => {
      window.location.href = url;
    }, 200);
  }

  async function fetchCurrentUser(idToken) {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async function googleSignIn() {
    try {
      setError("");

      const { initializeApp, getApps } = await import(
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
      );
      const {
        getAuth,
        GoogleAuthProvider,
        signInWithPopup,
        signOut
      } = await import(
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"
      );

      const firebaseConfig = {
        apiKey: "AIzaSyBkDAc37SI-MD49AcpGwA6twpknTEu7ZHg",
        authDomain: "kaperazzo.firebaseapp.com",
        projectId: "kaperazzo",
        storageBucket: "kaperazzo.firebasestorage.app",
        messagingSenderId: "291196448354",
        appId: "1:291196448354:web:4ea29dc66458e37c752b3b",
        measurementId: "G-5RGTC1Y494"
      };

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();

      await signOut(auth).catch(() => {});

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const idToken = await user.getIdToken(true);
      const profile = await fetchCurrentUser(idToken);

      sessionStorage.setItem("idToken", idToken);
      sessionStorage.setItem("uid", profile.uid || user.uid);
      sessionStorage.setItem("email", profile.email || user.email || "");
      sessionStorage.setItem("userEmail", profile.email || user.email || "");
      sessionStorage.setItem("displayName", profile.name || user.displayName || "User");
      sessionStorage.setItem("photoURL", user.photoURL || "");
      sessionStorage.setItem("loggedInUser", "google");
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("role", profile.isAdmin ? "admin" : "customer");

      if (isAdminMode && !profile.isAdmin) {
        setError("This Google account is not allowed to login as Admin.");
        await signOut(auth).catch(() => {});
        sessionStorage.clear();
        return;
      }

      if (profile.isAdmin) go("admin.html");
      else go("../index.html");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Google login failed.");
    }
  }

  toggleRole.addEventListener("click", () => {
    isAdminMode = !isAdminMode;
    updateModeUI();
  });

  googleLoginBtn.addEventListener("click", googleSignIn);

  const existingToken = sessionStorage.getItem("idToken");
  const existingRole = sessionStorage.getItem("role");

  if (existingToken) {
    if (existingRole === "admin") go("admin.html");
    else go("../index.html");
    return;
  }

  updateModeUI();
});