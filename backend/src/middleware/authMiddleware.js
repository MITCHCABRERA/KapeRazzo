const admin = require("../config/firebaseAdmin");

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
      return res.status(401).json({ message: "Missing or invalid token" });
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
    return res.status(401).json({ message: "Unauthorized" });
  }
}

function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.emailVerified) {
    return next();
  }

  return res.status(403).json({
    code: "EMAIL_NOT_VERIFIED",
    message: "Please verify your email address before continuing."
  });
}

module.exports = { verifyToken, requireVerifiedEmail, getAdminEmails: getSuperAdminEmails, deriveRoles };
