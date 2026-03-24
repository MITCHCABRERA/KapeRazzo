import { auth } from "./firebaseConfig.js";

const API_BASE_STORAGE_KEY = "KAPERAZZO_API_BASE";
const API_BASE_ACTIVE_KEY = "KAPERAZZO_API_BASE_ACTIVE";

function normalizeBase(url) {
  return String(url || "").trim().replace(/\/$/, "");
}

function getConfiguredApiBase() {
  return normalizeBase(window.KAPERAZZO_API_BASE || localStorage.getItem(API_BASE_STORAGE_KEY) || "");
}

function getCandidateApiBases() {
  const bases = [];
  const configured = getConfiguredApiBase();
  const active = normalizeBase(sessionStorage.getItem(API_BASE_ACTIVE_KEY) || "");
  const { protocol, hostname, origin } = window.location;

  if (configured) bases.push(configured);
  if (active && !bases.includes(active)) bases.push(active);

  if (origin && origin.startsWith("http") && !bases.includes(origin)) {
    bases.push(origin);
  }

  if (hostname) {
    const hostPort5000 = `${protocol}//${hostname}:5000`;
    if (!bases.includes(hostPort5000)) bases.push(hostPort5000);
  }

  ["http://127.0.0.1:5000", "http://localhost:5000"].forEach((candidate) => {
    if (!bases.includes(candidate)) bases.push(candidate);
  });

  return bases.filter(Boolean);
}

function resolveApiBase() {
  return getCandidateApiBases()[0] || "http://127.0.0.1:5000";
}

let API_BASE = resolveApiBase();
let discoveryPromise = null;

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
      throw new Error(`HTTP ${response.status}`);
    }

    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function discoverApiBase(force = false) {
  if (!force && discoveryPromise) return discoveryPromise;

  const attempt = (async () => {
    const candidates = getCandidateApiBases();
    for (const candidate of candidates) {
      try {
        await probeApiBase(candidate);
        saveApiBase(candidate);
        return candidate;
      } catch {
        // Try next candidate.
      }
    }

    const error = new Error(
      `Cannot reach backend server. Start the backend, then try again. If the backend is on another machine, set its URL in Backend Settings.`
    );
    error.code = "BACKEND_UNREACHABLE";
    error.attemptedBases = candidates;
    throw error;
  })();

  discoveryPromise = attempt.finally(() => {
    discoveryPromise = null;
  });

  return discoveryPromise;
}

async function getAuthToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return sessionStorage.getItem("idToken") || "";

  const token = await user.getIdToken(forceRefresh);
  sessionStorage.setItem("idToken", token);
  sessionStorage.setItem("uid", user.uid || "");
  if (user.email) {
    sessionStorage.setItem("email", user.email);
    sessionStorage.setItem("userEmail", user.email);
  }
  if (user.displayName) sessionStorage.setItem("displayName", user.displayName);
  if (user.photoURL) sessionStorage.setItem("photoURL", user.photoURL);
  sessionStorage.setItem("isLoggedIn", "true");
  return token;
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = await getAuthToken(options.forceRefreshToken === true);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const preferredBase = options.skipDiscovery ? API_BASE : await discoverApiBase();
  const retryBases = [preferredBase, ...getCandidateApiBases().filter((base) => base !== preferredBase)];
  const attemptedBases = [];
  let lastNetworkError = null;

  for (const base of retryBases) {
    try {
      attemptedBases.push(base);
      const response = await fetch(`${base}${path}`, {
        ...options,
        headers
      });

      API_BASE = base;
      sessionStorage.setItem(API_BASE_ACTIVE_KEY, base);

      if (response.status === 401) {
        sessionStorage.clear();
      }

      return response;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  const error = new Error(
    `Cannot reach backend server. Tried: ${attemptedBases.join(", ")}. Start the backend, then try again.`
  );
  error.code = "BACKEND_UNREACHABLE";
  error.attemptedBases = attemptedBases;
  error.cause = lastNetworkError || null;
  throw error;
}

async function fetchJSON(path, options = {}) {
  const response = await apiFetch(path, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export {
  API_BASE,
  API_BASE_STORAGE_KEY,
  clearSavedApiBase,
  discoverApiBase,
  fetchJSON,
  getAuthToken,
  getCandidateApiBases,
  normalizeBase,
  apiFetch,
  resolveApiBase,
  saveApiBase
};
