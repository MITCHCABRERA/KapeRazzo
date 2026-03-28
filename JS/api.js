import { auth } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const API_BASE_STORAGE_KEY = "KAPERAZZO_API_BASE";
const API_BASE_ACTIVE_KEY = "KAPERAZZO_API_BASE_ACTIVE";

const AUTH_SESSION_KEYS = [
  "idToken",
  "uid",
  "email",
  "userEmail",
  "loggedInUser",
  "displayName",
  "photoURL",
  "isLoggedIn",
  "role",
  "emailVerified"
];

function normalizeBase(url) {
  return String(url || "").trim().replace(/\/$/, "");
}

function getConfiguredApiBase() {
  const configured = normalizeBase(window.KAPERAZZO_API_BASE || localStorage.getItem(API_BASE_STORAGE_KEY) || "");
  if (!configured) return "";

  try {
    const url = new URL(configured);
    const isLocalPage = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
    const isConfiguredLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";

    if (!isLocalPage && isConfiguredLocal) {
      return "";
    }

    if (!isLocalPage && url.hostname === window.location.hostname && url.port === "5000") {
      return "";
    }
  } catch {
    return "";
  }

  return configured;
}

function getDefaultApiBase() {
  const { protocol, hostname, origin } = window.location;
  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return `${protocol}//${hostname}:5000`;
  }
  if (hostname.endsWith("onrender.com") || hostname.endsWith("vercel.app") || hostname.endsWith("netlify.app")) {
    return origin;
  }
  return origin;
}

function getCandidateApiBases() {
  const bases = [];
  const configured = getConfiguredApiBase();
  const active = normalizeBase(sessionStorage.getItem(API_BASE_ACTIVE_KEY) || "");
  const { protocol, hostname } = window.location;
  const defaultBase = getDefaultApiBase();
  const isLocal = hostname === "127.0.0.1" || hostname === "localhost";

  [configured, active, defaultBase].filter(Boolean).forEach((candidate) => {
    if (!bases.includes(candidate)) bases.push(candidate);
  });

  if (isLocal && hostname) {
    const hostPort5000 = `${protocol}//${hostname}:5000`;
    if (!bases.includes(hostPort5000)) bases.push(hostPort5000);

    ["http://127.0.0.1:5000", "http://localhost:5000"].forEach((candidate) => {
      if (!bases.includes(candidate)) bases.push(candidate);
    });
  }

  return bases.filter(Boolean);
}

function resolveApiBase() {
  return getCandidateApiBases()[0] || getDefaultApiBase();
}

function createAppError(message, extras = {}) {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
}

let API_BASE = resolveApiBase();
let discoveryPromise = null;

const persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => null);
const authReadyPromise = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    resolve(user || null);
  }, () => resolve(null));
});

function saveApiBase(url) {
  const normalized = normalizeBase(url);
  if (!normalized) return "";
  localStorage.setItem(API_BASE_STORAGE_KEY, normalized);
  sessionStorage.setItem(API_BASE_ACTIVE_KEY, normalized);
  API_BASE = normalized;
  return normalized;
}

function clearSavedApiBase() {
  localStorage.removeItem(API_BASE_STORAGE_KEY);
  sessionStorage.removeItem(API_BASE_ACTIVE_KEY);
  API_BASE = resolveApiBase();
}

function clearAuthSession() {
  AUTH_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

function syncSessionFromUser(user, extras = {}) {
  if (!user) {
    clearAuthSession();
    return;
  }

  sessionStorage.setItem("uid", user.uid || "");
  sessionStorage.setItem("isLoggedIn", "true");
  if (user.email) {
    sessionStorage.setItem("email", user.email);
    sessionStorage.setItem("userEmail", user.email);
    sessionStorage.setItem("loggedInUser", user.email);
  }
  if (user.displayName) sessionStorage.setItem("displayName", user.displayName);
  if (user.photoURL) sessionStorage.setItem("photoURL", user.photoURL);
  sessionStorage.setItem("emailVerified", String(Boolean(user.emailVerified)));

  Object.entries(extras || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    sessionStorage.setItem(key, String(value));
  });
}

async function ensureAuthReady() {
  await persistenceReady;
  return auth.currentUser || authReadyPromise;
}

async function probeApiBase(base, timeoutMs = 1800) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${base}/api/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw createAppError(`Health check failed with HTTP ${response.status}`, { status: response.status, code: "HEALTHCHECK_FAILED" });
    }

    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function discoverApiBase(force = false) {
  if (!force) {
    const cachedBase = normalizeBase(
      sessionStorage.getItem(API_BASE_ACTIVE_KEY)
      || localStorage.getItem(API_BASE_STORAGE_KEY)
      || API_BASE
      || getDefaultApiBase()
    );

    if (cachedBase) {
      API_BASE = cachedBase;
      sessionStorage.setItem(API_BASE_ACTIVE_KEY, cachedBase);
      return cachedBase;
    }
  }

  if (!force && discoveryPromise) return discoveryPromise;

  const attempt = (async () => {
    const candidates = getCandidateApiBases();
    for (const candidate of candidates) {
      try {
        await probeApiBase(candidate);
        saveApiBase(candidate);
        return candidate;
      } catch {
        // keep probing
      }
    }

    const hint = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
      ? "Start the backend, then try again. If the backend is on another machine, set its URL in Backend Settings."
      : "Please try again. If this keeps happening, open Backend Settings and confirm the live API URL.";

    throw createAppError(
      `Cannot reach backend server. Tried: ${candidates.join(", ")}. ${hint}`,
      { code: "BACKEND_UNREACHABLE", attemptedBases: candidates }
    );
  })();

  discoveryPromise = attempt.finally(() => {
    discoveryPromise = null;
  });

  return discoveryPromise;
}

async function getAuthToken(forceRefresh = false) {
  let user = auth.currentUser;

  if (!user) {
    user = await ensureAuthReady();
  }

  if (!user) {
    clearAuthSession();
    return "";
  }

  const token = await user.getIdToken(forceRefresh);
  sessionStorage.setItem("idToken", token);
  syncSessionFromUser(user);
  return token;
}

async function doFetch(base, path, options, headers) {
  return fetch(`${base}${path}`, { ...options, headers });
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = await getAuthToken(options.forceRefreshToken === true);

  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const preferredBase = options.skipDiscovery ? API_BASE : await discoverApiBase();
  const retryBases = [preferredBase, ...getCandidateApiBases().filter((base) => base !== preferredBase)];
  const attemptedBases = [];
  let lastNetworkError = null;

  for (const base of retryBases) {
    try {
      attemptedBases.push(base);
      let response = await doFetch(base, path, options, headers);

      if (response.status === 401 && auth.currentUser && !options._retriedAfter401) {
        try {
          const refreshedToken = await getAuthToken(true);
          if (refreshedToken) {
            const retryHeaders = new Headers(headers);
            retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
            response = await doFetch(base, path, { ...options, _retriedAfter401: true }, retryHeaders);
          }
        } catch {
          // fall through to original 401 handling
        }
      }

      API_BASE = base;
      sessionStorage.setItem(API_BASE_ACTIVE_KEY, base);
      if (normalizeBase(localStorage.getItem(API_BASE_STORAGE_KEY) || "") !== base) {
        localStorage.setItem(API_BASE_STORAGE_KEY, base);
      }

      if (response.status === 401 && !auth.currentUser) {
        clearAuthSession();
      }

      return response;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  const hint = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "Start the backend, then try again."
    : "Please try again. If this keeps happening, open Backend Settings and confirm the live API URL.";

  throw createAppError(
    `Cannot reach backend server. Tried: ${attemptedBases.join(", ")}. ${hint}`,
    { code: "BACKEND_UNREACHABLE", attemptedBases, cause: lastNetworkError || null }
  );
}

async function fetchJSON(path, options = {}) {
  const response = await apiFetch(path, options);
  let payload = null;
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) payload = await response.json();
    else payload = await response.text();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || (typeof payload === "string" && payload) || `HTTP ${response.status}`;
    throw createAppError(message, {
      status: response.status,
      code: payload?.code || `HTTP_${response.status}`,
      payload: payload && typeof payload === "object" ? payload : null
    });
  }

  return payload;
}

export {
  API_BASE,
  API_BASE_STORAGE_KEY,
  clearAuthSession,
  clearSavedApiBase,
  createAppError,
  discoverApiBase,
  ensureAuthReady,
  fetchJSON,
  getAuthToken,
  getCandidateApiBases,
  normalizeBase,
  apiFetch,
  resolveApiBase,
  saveApiBase,
  syncSessionFromUser
};


export function clearSessionCache() {
  sessionStorage.clear();
}
