const admin = require("../config/firebaseAdmin");
const AppError = require("../utils/appError");

function getSuperAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function deriveRoles(decoded = {}) {
  const email = String(decoded.email || "").toLowerCase();
  const claimRole = decoded.role === "admin" ? "admin" : "customer";
  const isSuperAdmin = getSuperAdminEmails().includes(email);
  const isAdmin = isSuperAdmin || claimRole === "admin";

  return {
    email,
    isAdmin,
    isSuperAdmin,
    role: isAdmin ? "admin" : "customer"
  };
}

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return next(new AppError("Missing or invalid token", 401, "AUTH_TOKEN_MISSING"));
    }

    const token = authHeader.slice(7);
    const decoded = await admin.auth().verifyIdToken(token, true);
    const roles = deriveRoles(decoded);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || decoded.displayName || "",
      emailVerified: Boolean(decoded.email_verified),
      provider: Array.isArray(decoded.firebase?.sign_in_provider)
        ? decoded.firebase.sign_in_provider[0]
        : decoded.firebase?.sign_in_provider || "",
      ...roles
    };

    next();
  } catch (err) {
    next(new AppError("Unauthorized", 401, "AUTH_INVALID_TOKEN"));
  }
}

function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return next(new AppError("Unauthorized", 401, "AUTH_REQUIRED"));
  }

  if (req.user.emailVerified) {
    return next();
  }

  return next(new AppError("Please verify your email address before continuing.", 403, "EMAIL_NOT_VERIFIED"));
}

module.exports = { verifyToken, requireVerifiedEmail, getAdminEmails: getSuperAdminEmails, deriveRoles };
