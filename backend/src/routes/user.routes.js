const router = require("express").Router();
const admin = require("../config/firebaseAdmin");
const { verifyToken, getAdminEmails } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/appError");
const { body, param, query } = require("express-validator");
const validate = require("../middleware/validate");

function mapUserRecord(userRecord) {
  const email = (userRecord.email || "").toLowerCase();
  const isSuperAdmin = getAdminEmails().includes(email);
  const customRole = userRecord.customClaims?.role === "admin" ? "admin" : "customer";
  const isAdmin = isSuperAdmin || customRole === "admin";

  return {
    uid: userRecord.uid,
    email: userRecord.email || "",
    displayName: userRecord.displayName || "",
    photoURL: userRecord.photoURL || "",
    disabled: Boolean(userRecord.disabled),
    emailVerified: Boolean(userRecord.emailVerified),
    providers: Array.isArray(userRecord.providerData) ? userRecord.providerData.map((provider) => provider.providerId) : [],
    createdAt: userRecord.metadata?.creationTime || null,
    lastSignInAt: userRecord.metadata?.lastSignInTime || null,
    isAdmin,
    isSuperAdmin,
    role: isAdmin ? "admin" : "customer"
  };
}

router.get("/", verifyToken, checkRole("admin"), [query("search").optional().isLength({ max: 100 })], validate, asyncHandler(async (req, res) => {
  const allUsers = [];
  let nextPageToken;

  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    allUsers.push(...result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  const query = String(req.query.search || "").trim().toLowerCase();

  const users = allUsers
    .map(mapUserRecord)
    .filter((user) => {
      if (!query) return true;
      return [user.displayName, user.email, user.role, user.uid]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  res.json(users);
}));

router.get("/me", verifyToken, asyncHandler(async (req, res) => {
  const userRecord = await admin.auth().getUser(req.user.uid);
  res.json(mapUserRecord(userRecord));
}));

router.patch("/me", verifyToken, [
  body("displayName").optional().isLength({ min: 1, max: 100 }),
  body("photoURL").optional({ values: "falsy" }).isURL({ protocols: ["http", "https"], require_protocol: true })
], validate, asyncHandler(async (req, res) => {
  const { displayName, photoURL } = req.body || {};
  const updates = {};

  if (typeof displayName === "string") updates.displayName = displayName.trim();
  if (typeof photoURL === "string") updates.photoURL = photoURL.trim();

  if (!Object.keys(updates).length) {
    throw new AppError("No profile updates were provided", 400, "PROFILE_UPDATES_REQUIRED");
  }

  const updated = await admin.auth().updateUser(req.user.uid, updates);
  res.json(mapUserRecord(updated));
}));

router.patch("/:uid/status", verifyToken, checkRole("admin"), [param("uid").isString().isLength({ min: 6 }), body("disabled").isBoolean()], validate, asyncHandler(async (req, res) => {
  const { uid } = req.params;
  const { disabled } = req.body || {};

  if (uid === req.user.uid && disabled === true) {
    throw new AppError("You cannot disable your own admin account", 400, "SELF_DISABLE_BLOCKED");
  }

  const updated = await admin.auth().updateUser(uid, { disabled: Boolean(disabled) });
  res.json(mapUserRecord(updated));
}));

router.patch("/:uid/role", verifyToken, checkRole("admin"), [param("uid").isString().isLength({ min: 6 }), body("role").isIn(["admin", "customer"])], validate, asyncHandler(async (req, res) => {
  const { uid } = req.params;
  const nextRole = req.body?.role === "admin" ? "admin" : "customer";
  const target = await admin.auth().getUser(uid);
  const targetEmail = (target.email || "").toLowerCase();
  const isSuperAdminEmail = getAdminEmails().includes(targetEmail);

  if (isSuperAdminEmail && nextRole !== "admin") {
    throw new AppError("Super admin emails from ADMIN_EMAILS cannot be demoted here", 400, "SUPER_ADMIN_DEMOTE_BLOCKED");
  }

  if (uid === req.user.uid && nextRole !== "admin") {
    throw new AppError("You cannot demote your own current admin session", 400, "SELF_DEMOTE_BLOCKED");
  }

  await admin.auth().setCustomUserClaims(uid, nextRole === "admin" ? { role: "admin" } : { role: "customer" });
  const updated = await admin.auth().getUser(uid);

  res.json({
    ...mapUserRecord(updated),
    tokenRefreshRequired: true,
    message: nextRole === "admin"
      ? "Admin role granted. The user must sign out and sign back in to refresh their token."
      : "Admin role removed. The user must sign out and sign back in to refresh their token."
  });
}));

router.delete("/:uid", verifyToken, checkRole("admin"), [param("uid").isString().isLength({ min: 6 })], validate, asyncHandler(async (req, res) => {
  const { uid } = req.params;

  if (uid === req.user.uid) {
    throw new AppError("You cannot delete your own admin account", 400, "SELF_DELETE_BLOCKED");
  }

  await admin.auth().deleteUser(uid);
  res.json({ success: true, message: "User deleted", uid });
}));

module.exports = router;
