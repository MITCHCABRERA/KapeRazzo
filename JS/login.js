// JS/login.js
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginTitle = document.getElementById("loginTitle");
  const toggleRole = document.getElementById("toggleRole");
  const errorMessage = document.getElementById("errorMessage");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const googleLoginBtn = document.getElementById("googleLoginBtn");

  if (!loginForm || !toggleRole || !loginTitle || !usernameInput || !passwordInput) return;

  const ADMIN_EMAILS = ["lr.mcabrera@mmdc.mcl.edu.ph"].map((e) => e.toLowerCase());

  // If already logged in
  const existingUid = sessionStorage.getItem("uid");
  const existingRole = sessionStorage.getItem("role");
  if (existingUid) {
    if (existingRole === "admin") window.location.replace("admin.html");
    else window.location.replace("../index.html");
    return;
  }

  let isAdmin = false;

  const adminCred = { username: "admin", password: "admin123" };
  const userCred = { username: "user", password: "user123" };

  function setError(msg) {
    if (errorMessage) errorMessage.textContent = msg || "";
  }

  function updateModeUI() {
    loginTitle.textContent = isAdmin ? "Admin Login" : "User Login";
    toggleRole.textContent = isAdmin ? "Switch to User Login" : "Login as Admin";
    toggleRole.setAttribute("aria-pressed", isAdmin ? "true" : "false");
    setError("");

    // keep visible in both modes
    if (googleLoginBtn) googleLoginBtn.style.display = "block";
  }

  toggleRole.addEventListener("click", () => {
    isAdmin = !isAdmin;
    updateModeUI();
  });

  function go(url) {
    // Always do both for reliability after popup closes
    window.location.replace(url);
    setTimeout(() => {
      window.location.href = url;
    }, 200);
  }

  async function googleSignIn() {
    try {
      setError("");

      const { initializeApp, getApps } = await import(
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
      );
      const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import(
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"
      );
      const { getFirestore, doc, getDoc, setDoc } = await import(
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
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
      const db = getFirestore(app);

      const provider = new GoogleAuthProvider();

      // ✅ fix "need refresh" cases after popup close
      // (forces clean state + ensures popup result is handled properly)
      await signOut(auth).catch(() => {});

      const result = await signInWithPopup(auth, provider);

      const user = result.user;
      const token = await user.getIdToken(true);
      const email = (user.email || "").toLowerCase();

      const name = user.displayName || "User";
      const photoURL = user.photoURL || "";

      // save for header profile
      sessionStorage.setItem("displayName", name);
      sessionStorage.setItem("photoURL", photoURL);


      // Admin mode must be an allowed email
      if (isAdmin && !ADMIN_EMAILS.includes(email)) {
        await signOut(auth); // prevent “logged in but blocked”
        setError("This Google account is not allowed to login as Admin.");
        return;
      }

      const role = isAdmin ? "admin" : "customer";

      // ✅ Save session FIRST (so redirect works even if Firestore fails)
      sessionStorage.setItem("idToken", token);
      sessionStorage.setItem("uid", user.uid);
      sessionStorage.setItem("email", email);
      sessionStorage.setItem("userEmail", email);
      sessionStorage.setItem("loggedInUserEmail", email);
      sessionStorage.setItem("role", role);
      sessionStorage.setItem("loggedInUser", "google");
      sessionStorage.setItem("isLoggedIn", "true");

      // ✅ Redirect immediately (most reliable)
      if (role === "admin") go("admin.html");
      else go("../index.html");

      // ✅ Firestore profile save AFTER redirect (non-blocking)
      setTimeout(async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              name: user.displayName || "",
              email,
              photoURL: user.photoURL || "",
              role,
              createdAt: Date.now()
            });
          } else {
            await setDoc(userRef, { lastLoginAt: Date.now(), role }, { merge: true });
          }
        } catch (fireErr) {
          console.warn("Firestore user profile save skipped:", fireErr?.message || fireErr);
        }
      }, 0);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Google login failed.");
    }
  }

  if (googleLoginBtn) googleLoginBtn.addEventListener("click", googleSignIn);

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("");

    const u = usernameInput.value.trim();
    const p = passwordInput.value.trim();

    if (isAdmin) {
      if (u === adminCred.username && p === adminCred.password) {
        sessionStorage.setItem("role", "admin");
        sessionStorage.setItem("loggedInUser", "admin");
        sessionStorage.setItem("isLoggedIn", "true");
        go("admin.html");
        return;
      }

      // If typed email → use Google
      const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(u);
      if (looksLikeEmail) {
        await googleSignIn();
        return;
      }

      setError("Admin login failed. Use admin credentials or Admin Google account.");
      return;
    }

    // user mode
    if (u === userCred.username && p === userCred.password) {
      sessionStorage.setItem("role", "customer");
      sessionStorage.setItem("loggedInUser", "user");
      sessionStorage.setItem("isLoggedIn", "true");
      go("../index.html");
      return;
    }

    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(u);
    if (looksLikeEmail) {
      await googleSignIn();
      return;
    }

    setError("Invalid user login. Use Google Sign-in or correct user credentials.");
  });

  updateModeUI();
});
