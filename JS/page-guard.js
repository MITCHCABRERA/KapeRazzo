import { ensureAuthReady, fetchJSON, syncSessionFromUser, clearSessionCache } from "./api.js";

function loginUrlWithNext() {
  const current = `${window.location.pathname || "/"}${window.location.search || ""}${window.location.hash || ""}`;
  const params = new URLSearchParams();
  if (current && current !== "/login.html" && current !== "/HTML/login.html") {
    params.set("next", current);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `/login.html${suffix}`;
}

function homeUrl() {
  return "/index.html";
}

async function runGuard() {
  const mode = document.documentElement.dataset.guard || "user";
  const user = await ensureAuthReady();

  if (!user) {
    clearSessionCache();
    window.location.replace(loginUrlWithNext());
    return;
  }

  syncSessionFromUser(user);

  try {
    const profile = await fetchJSON("/api/auth/me", { skipDiscovery: false, suppressExpiredRedirect: true });
    syncSessionFromUser(user, {
      role: profile?.isAdmin ? "admin" : "customer",
      emailVerified: Boolean(profile?.emailVerified)
    });

    if (mode === "admin" && !profile?.isAdmin) {
      window.location.replace(homeUrl());
      return;
    }
  } catch (error) {
    if (error?.status === 401) {
      clearSessionCache();
      window.location.replace(loginUrlWithNext());
      return;
    }

    if (mode === "admin") {
      window.location.replace(homeUrl());
    }
  }
}

runGuard();
