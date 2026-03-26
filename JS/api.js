import { auth } from "./firebaseConfig.js";

const API_BASE_STORAGE_KEY = "KAPERAZZO_API_BASE";
const API_BASE_ACTIVE_KEY = "KAPERAZZO_API_BASE_ACTIVE";

function normalizeBase(url) {
  return String(url || "").trim().replace(/\/$/, "");
}

function getConfiguredApiBase() {
  return normalizeBase(window.KAPERAZZO_API_BASE || localStorage.getItem(API_BASE_STORAGE_KEY) || "");
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
  const { protocol, hostname, port } = window.location;
  const defaultBase = getDefaultApiBase();

  [configured, active, defaultBase].filter(Boolean).forEach((candidate) => {
    if (!bases.includes(candidate)) bases.push(candidate);
  });

  if (hostname) {
    const hostPort5000 = `${protocol}//${hostname}:5000`;
    if (!bases.includes(hostPort5000)) bases.push(hostPort5000);
  }

  if (port && port !== "5000") {
    const swappedPort = `${protocol}//${hostname}:5000`;
    if (!bases.includes(swappedPort)) bases.push(swappedPort);
  }

  ["http://127.0.0.1:5000", "http://localhost:5000"].forEach((candidate) => {
    if (!bases.includes(candidate)) bases.push(candidate);
  });

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
      throw createAppError(`Health check failed with HTTP ${response.status}`, { status: response.status, code: "HEALTHCHECK_FAILED" });
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
        // keep probing
      }
    }

    throw createAppError(
      `Cannot reach backend server. Tried: ${candidates.join(", ")}. Start the backend, then try again. If deployed as a single service, make sure the backend is serving the frontend and API from the same domain. If the backend is on another machine, set its URL in Backend Settings.`,
      { code: "BACKEND_UNREACHABLE", attemptedBases: candidates }
    );
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

  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const preferredBase = options.skipDiscovery ? API_BASE : await discoverApiBase();
  const retryBases = [preferredBase, ...getCandidateApiBases().filter((base) => base !== preferredBase)];
  const attemptedBases = [];
  let lastNetworkError = null;

  for (const base of retryBases) {
    try {
      attemptedBases.push(base);
      const response = await fetch(`${base}${path}`, { ...options, headers });
      API_BASE = base;
      sessionStorage.setItem(API_BASE_ACTIVE_KEY, base);
      if (normalizeBase(localStorage.getItem(API_BASE_STORAGE_KEY) || "") !== base) {
        localStorage.setItem(API_BASE_STORAGE_KEY, base);
      }
      if (response.status === 401) sessionStorage.clear();
      return response;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  throw createAppError(
    `Cannot reach backend server. Tried: ${attemptedBases.join(", ")}. Start the backend, then try again.`,
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
  clearSavedApiBase,
  createAppError,
  discoverApiBase,
  fetchJSON,
  getAuthToken,
  getCandidateApiBases,
  normalizeBase,
  apiFetch,
  resolveApiBase,
  saveApiBase
};
