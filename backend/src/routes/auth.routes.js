const router = require("express").Router();
const admin = require("../config/firebaseAdmin");
const { verifyToken, getAdminEmails, deriveRoles } = require("../middleware/authMiddleware.js");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/appError");
const { query } = require("express-validator");
const validate = require("../middleware/validate");

router.get("/check-email-role", [query("email").isEmail()], validate, asyncHandler(async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();

  if (!email) {
    throw new AppError("Email is required", 400, "EMAIL_REQUIRED");
  }

  const isAdminEmail = getAdminEmails().includes(email);
  res.json({ email, isAdminEmail, role: isAdminEmail ? "admin" : "customer" });
}));

router.get("/me", verifyToken, asyncHandler(async (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email || "",
    name: req.user.name || "",
    isAdmin: Boolean(req.user.isAdmin),
    isSuperAdmin: Boolean(req.user.isSuperAdmin),
    emailVerified: Boolean(req.user.emailVerified),
    role: req.user.role || "customer"
  });
}));

router.post("/refresh-claims", verifyToken, asyncHandler(async (req, res) => {
  const userRecord = await admin.auth().getUser(req.user.uid);
  const roles = deriveRoles({
    email: userRecord.email,
    role: userRecord.customClaims?.role
  });

  res.json({
    uid: userRecord.uid,
    email: userRecord.email || "",
    displayName: userRecord.displayName || "",
    emailVerified: Boolean(userRecord.emailVerified),
    role: roles.role,
    isAdmin: roles.isAdmin,
    isSuperAdmin: roles.isSuperAdmin
  });
}));

module.exports = router;
