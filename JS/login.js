import { auth, googleProvider } from "./firebaseConfig.js";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { API_BASE, discoverApiBase, fetchJSON, normalizeBase, saveApiBase } from "./api.js";
import { createErrorPresenter, getFriendlyErrorMessage } from "./error-handler.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginTitle = document.getElementById("loginTitle");
  const errorMessage = document.getElementById("errorMessage");
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const usernameLabel = document.getElementById("usernameLabel");
  const passwordLabel = document.getElementById("passwordLabel");
  const submitBtn = document.getElementById("passwordAuthBtn");
  const toggleAuthModeBtn = document.getElementById("toggleAuthMode");
  const authModeHint = document.getElementById("authModeHint");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const resendVerificationBtn = document.getElementById("resendVerificationBtn");
  const roleHint = document.getElementById("roleHint");
  const customerRoleBtn = document.getElementById("customerRoleBtn");
  const adminRoleBtn = document.getElementById("adminRoleBtn");
  const apiBaseStatus = document.getElementById("apiBaseStatus");
  const configureApiBaseBtn = document.getElementById("configureApiBaseBtn");
  const testApiBaseBtn = document.getElementById("testApiBaseBtn");

  let isAdminMode = false;
  let isRegisterMode = false;

  function currentBaseLabel() {
    return normalizeBase(localStorage.getItem("KAPERAZZO_API_BASE") || sessionStorage.getItem("KAPERAZZO_API_BASE_ACTIVE") || API_BASE);
  }

  const presentError = createErrorPresenter(errorMessage);

  function setError(msg) {
    if (errorMessage) errorMessage.textContent = msg || "";
  }

  function setRoleHint(msg) {
    if (roleHint) roleHint.textContent = msg || "";
  }

  function setApiStatus(msg, isError = false) {
    if (!apiBaseStatus) return;
    apiBaseStatus.textContent = msg || "";
    apiBaseStatus.classList.toggle("error", Boolean(isError));
  }

  function describeBackendError(err) {
    const attempted = err?.attemptedBases?.length ? ` Tried: ${err.attemptedBases.join(", ")}.` : "";
    return `Cannot reach backend server.${attempted} Make sure the backend is running at http://127.0.0.1:5000, then try again. If needed, open Backend Settings and enter the correct backend URL.`;
  }

  async function refreshBackendStatus() {
    setApiStatus(`Backend target: ${currentBaseLabel() || "not set"}`);
    try {
      const base = await discoverApiBase(true);
      setApiStatus(`Backend connected: ${base}`);
      return base;
    } catch (err) {
      setApiStatus(describeBackendError(err), true);
      return null;
    }
  }

  async function promptForApiBase() {
    const value = window.prompt("Enter backend URL", currentBaseLabel() || "http://127.0.0.1:5000");
    if (value === null) return;
    const normalized = normalizeBase(value);
    if (!normalized) return;
    saveApiBase(normalized);
    await refreshBackendStatus();
  }

  function setRoleMode(isAdmin) {
    isAdminMode = Boolean(isAdmin);
    customerRoleBtn?.classList.toggle("active", !isAdminMode);
    adminRoleBtn?.classList.toggle("active", isAdminMode);
    updateModeUI();
  }

  function updateModeUI() {
    const roleLabel = isAdminMode ? "Admin" : "Customer";
    loginTitle.textContent = isRegisterMode ? `${roleLabel} Password Signup` : `${roleLabel} Login`;
    if (usernameLabel) usernameLabel.textContent = "Email";
    if (passwordLabel) passwordLabel.textContent = "Password";
    if (emailInput) emailInput.placeholder = isAdminMode ? "Admin email" : "Email address";
    if (passwordInput) passwordInput.placeholder = isRegisterMode ? "Create a password" : "Enter your password";
    if (submitBtn) submitBtn.textContent = isRegisterMode ? `Create ${roleLabel} Account` : "Login with Password";
    if (toggleAuthModeBtn) toggleAuthModeBtn.textContent = isRegisterMode ? "Already have an account? Login" : `Create ${roleLabel.toLowerCase()} password account`;
    if (authModeHint) {
      authModeHint.textContent = isRegisterMode
        ? "Password signup sends a verification email before full access is allowed."
        : "Email/password users must verify their email before they can place orders or reservations.";
    }
    if (isAdminMode && !isRegisterMode) setRoleHint("Admin access is granted by verified email and admin role, not by a separate hardcoded password.");
    else setRoleHint("");
    setError("");
  }

  async function fetchCurrentUser(idToken) {
    return fetchJSON("/api/auth/me", { method: "GET", headers: { Authorization: `Bearer ${idToken}` } });
  }

  async function checkEmailRole(email) {
    return fetchJSON(`/api/auth/check-email-role?email=${encodeURIComponent(email)}`);
  }

  function fallbackNameFromEmail(email) {
    return (email || "User").split("@")[0] || "User";
  }

  async function persistSession(firebaseUser) {
    const idToken = await firebaseUser.getIdToken(true);
    const profile = await fetchCurrentUser(idToken);
    sessionStorage.setItem("idToken", idToken);
    sessionStorage.setItem("uid", profile.uid || firebaseUser.uid);
    sessionStorage.setItem("email", profile.email || firebaseUser.email || "");
    sessionStorage.setItem("userEmail", profile.email || firebaseUser.email || "");
    sessionStorage.setItem("loggedInUser", profile.email || firebaseUser.email || "");
    sessionStorage.setItem("displayName", profile.name || firebaseUser.displayName || fallbackNameFromEmail(profile.email || firebaseUser.email));
    sessionStorage.setItem("photoURL", firebaseUser.photoURL || "");
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("role", profile.isAdmin ? "admin" : "customer");
    sessionStorage.setItem("emailVerified", String(Boolean(profile.emailVerified)));
    return profile;
  }

  async function ensureVerified(firebaseUser) {
    const providers = (firebaseUser.providerData || []).map((p) => p.providerId);
    const usingPassword = providers.includes("password") || firebaseUser.providerId === "password" || providers.length === 0;
    if (usingPassword && !firebaseUser.emailVerified) {
      await signOut(auth).catch(() => {});
      sessionStorage.clear();
      throw new Error("Please verify your email before logging in. Click 'Resend verification email' if needed.");
    }
  }

  async function handlePostLogin(firebaseUser) {
    await ensureVerified(firebaseUser);
    const profile = await persistSession(firebaseUser);
    if (isAdminMode && !profile.isAdmin) {
      setError("This account is not allowed to login as Admin.");
      await signOut(auth).catch(() => {});
      sessionStorage.clear();
      return;
    }
    window.location.replace(profile.isAdmin ? "admin.html" : "../index.html");
  }

  async function googleSignIn() {
    try {
      setError("");
      const result = await signInWithPopup(auth, googleProvider);
      await handlePostLogin(result.user);
    } catch (err) {
      presentError(err, "Google login failed.");
    }
  }

  async function passwordAuth() {
    const email = (emailInput?.value || "").trim();
    const password = passwordInput?.value || "";
    if (!email || !password) return setError("Email and password are required.");

    try {
      setError("");
      if (isRegisterMode) {
        const roleInfo = await checkEmailRole(email);
        if (isAdminMode && !roleInfo.isAdminEmail) return setError("This email is not in ADMIN_EMAILS.");
        if (!isAdminMode && roleInfo.isAdminEmail) return setError("This email is reserved for admin access. Use Admin signup/login instead.");
      }

      const credential = isRegisterMode
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      if (isRegisterMode) {
        await updateProfile(credential.user, { displayName: fallbackNameFromEmail(email) }).catch(() => {});
        await sendEmailVerification(credential.user);
        await signOut(auth);
        sessionStorage.clear();
        setRoleHint(`Verification email sent to ${email}. Verify it first, then log in.`);
        setError("");
        isRegisterMode = false;
        updateModeUI();
        return;
      }

      await handlePostLogin(credential.user);
    } catch (err) {
      if (err?.code === "BACKEND_UNREACHABLE") return setError(describeBackendError(err));
      presentError(err, "Password login failed.");
    }
  }

  async function forgotPassword() {
    const email = (emailInput?.value || "").trim();
    if (!email) return setError("Enter your email first, then click Forgot password.");
    try {
      await sendPasswordResetEmail(auth, email);
      setRoleHint(`Password reset email sent to ${email}.`);
    } catch (err) {
      presentError(err, "Unable to send password reset email.");
    }
  }

  async function resendVerification() {
    const email = (emailInput?.value || "").trim();
    const password = passwordInput?.value || "";
    if (!email || !password) return setError("Enter your email and password, then click Resend verification email.");
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (credential.user.emailVerified) {
        setRoleHint("This email is already verified. You can log in now.");
      } else {
        await sendEmailVerification(credential.user);
        setRoleHint(`Verification email sent again to ${email}.`);
      }
      await signOut(auth).catch(() => {});
    } catch (err) {
      presentError(err, "Unable to resend verification email.");
    }
  }

  googleLoginBtn?.addEventListener("click", googleSignIn);
  loginForm?.addEventListener("submit", (e) => { e.preventDefault(); passwordAuth(); });
  toggleAuthModeBtn?.addEventListener("click", () => { isRegisterMode = !isRegisterMode; updateModeUI(); });
  forgotPasswordBtn?.addEventListener("click", forgotPassword);
  resendVerificationBtn?.addEventListener("click", resendVerification);
  customerRoleBtn?.addEventListener("click", () => setRoleMode(false));
  adminRoleBtn?.addEventListener("click", () => setRoleMode(true));
  configureApiBaseBtn?.addEventListener("click", promptForApiBase);
  testApiBaseBtn?.addEventListener("click", refreshBackendStatus);

  setRoleMode(false);
  refreshBackendStatus();
});
