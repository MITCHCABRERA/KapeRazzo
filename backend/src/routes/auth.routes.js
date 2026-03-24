const router = require("express").Router();
const admin = require("../config/firebaseAdmin");
const { verifyToken, getAdminEmails, deriveRoles } = require("../middleware/authMiddleware.js");

router.get("/check-email-role", async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const isAdminEmail = getAdminEmails().includes(email);

  return res.json({
    email,
    isAdminEmail,
    role: isAdminEmail ? "admin" : "customer"
  });
});

router.get("/me", verifyToken, async (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email || "",
    name: req.user.name || "",
    isAdmin: Boolean(req.user.isAdmin),
    isSuperAdmin: Boolean(req.user.isSuperAdmin),
    emailVerified: Boolean(req.user.emailVerified),
    role: req.user.role || "customer"
  });
});

router.post("/refresh-claims", verifyToken, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);
    const roles = deriveRoles({
      email: userRecord.email,
      role: userRecord.customClaims?.role
    });

    return res.json({
      uid: userRecord.uid,
      email: userRecord.email || "",
      displayName: userRecord.displayName || "",
      emailVerified: Boolean(userRecord.emailVerified),
      role: roles.role,
      isAdmin: roles.isAdmin,
      isSuperAdmin: roles.isSuperAdmin
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to refresh claims" });
  }
});

module.exports = router;
