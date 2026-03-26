import { auth } from "./firebaseConfig.js";
import { ensureAuthReady, fetchJSON, syncSessionFromUser } from "./api.js";

function getLoginUrl() {
  const path = window.location.pathname || "";
  return path.endsWith("/index.html") || path === "/index.html"
    ? "HTML/login.html"
    : "login.html";
}

async function runGuard() {
  const mode = document.documentElement.dataset.guard || "user";
  const user = await ensureAuthReady();

  if (!user) {
    window.location.replace(getLoginUrl());
    return;
  }

  syncSessionFromUser(user);

  try {
    const profile = await fetchJSON("/api/auth/me", { skipDiscovery: false });
    syncSessionFromUser(user, {
      role: profile?.isAdmin ? "admin" : "customer",
      emailVerified: Boolean(profile?.emailVerified)
    });

    if (mode === "admin" && !profile?.isAdmin) {
      window.location.replace(pathToHome());
      return;
    }
  } catch (error) {
    if (mode === "admin") {
      window.location.replace(pathToHome());
    }
  }
}

function pathToHome() {
  const path = window.location.pathname || "";
  return path.endsWith("/index.html") || path === "/index.html"
    ? "index.html"
    : "../index.html";
}

runGuard();
