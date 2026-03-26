const defaultFirebaseMessages = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/email-already-in-use": "This email already has an account. Please login instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/user-not-found": "No account found for that email.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/operation-not-allowed": "The selected sign-in method is not enabled in the active Firebase project.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/unauthorized-domain": "This app domain is not authorized in Firebase Authentication.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/network-request-failed": "Network error. Please check your internet connection and try again."
};

const defaultApiMessages = {
  AUTH_TOKEN_MISSING: "Your session is missing. Please log in again.",
  AUTH_INVALID_TOKEN: "Your session expired. Please log in again.",
  EMAIL_NOT_VERIFIED: "Please verify your email address before continuing.",
  BACKEND_UNREACHABLE: "Cannot reach backend server. Please try again in a moment.",
  VALIDATION_ERROR: "Please review the form fields and try again.",
  RATE_LIMITED: "Too many requests. Please wait a bit and try again."
};

function getFriendlyErrorMessage(err, fallback = "Something went wrong.") {
  if (!err) return fallback;
  if (err.code === "BACKEND_UNREACHABLE") {
    const attempted = err.attemptedBases?.length ? ` Tried: ${err.attemptedBases.join(", ")}.` : "";
    return `Cannot reach backend server.${attempted} Start the backend, then try again.`;
  }
  if (err.payload?.message) return defaultApiMessages[err.payload.code] || err.payload.message;
  if (err.code && defaultApiMessages[err.code]) return defaultApiMessages[err.code];
  if (err.code && defaultFirebaseMessages[err.code]) return defaultFirebaseMessages[err.code];
  if (typeof err.message === "string" && err.message.trim()) return err.message.trim();
  return fallback;
}

function createErrorPresenter(targetOrFn) {
  if (typeof targetOrFn === "function") return (err, fallback) => targetOrFn(getFriendlyErrorMessage(err, fallback), err);
  return (err, fallback) => {
    const message = getFriendlyErrorMessage(err, fallback);
    if (targetOrFn) targetOrFn.textContent = message;
    return message;
  };
}

export { getFriendlyErrorMessage, createErrorPresenter };
