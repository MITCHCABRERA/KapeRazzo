const router = require("express").Router();
const admin = require("../config/firebaseAdmin");
const { verifyToken, getAdminEmails } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

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
    providers: Array.isArray(userRecord.providerData)
      ? userRecord.providerData.map((provider) => provider.providerId)
      : [],
    createdAt: userRecord.metadata?.creationTime || null,
    lastSignInAt: userRecord.metadata?.lastSignInTime || null,
    isAdmin,
    isSuperAdmin,
    role: isAdmin ? "admin" : "customer"
  };
}

router.get("/", verifyToken, checkRole("admin"), async (req, res) => {
  try {
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

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to load users" });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);
    return res.json(mapUserRecord(userRecord));
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to load profile" });
  }
});

router.patch("/me", verifyToken, async (req, res) => {
  try {
    const { displayName, photoURL } = req.body;
    const updates = {};

    if (typeof displayName === "string") updates.displayName = displayName.trim();
    if (typeof photoURL === "string") updates.photoURL = photoURL.trim();

    const updated = await admin.auth().updateUser(req.user.uid, updates);
    return res.json(mapUserRecord(updated));
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update profile" });
  }
});

router.patch("/:uid/status", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    const { disabled } = req.body;

    if (uid === req.user.uid && disabled === true) {
      return res.status(400).json({ message: "You cannot disable your own admin account" });
    }

    const updated = await admin.auth().updateUser(uid, { disabled: Boolean(disabled) });
    return res.json(mapUserRecord(updated));
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update user status" });
  }
});

router.patch("/:uid/role", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    const nextRole = req.body.role === "admin" ? "admin" : "customer";
    const target = await admin.auth().getUser(uid);
    const targetEmail = (target.email || "").toLowerCase();
    const isSuperAdminEmail = getAdminEmails().includes(targetEmail);

    if (isSuperAdminEmail && nextRole !== "admin") {
      return res.status(400).json({ message: "Super admin emails from ADMIN_EMAILS cannot be demoted here" });
    }

    if (uid === req.user.uid && nextRole !== "admin") {
      return res.status(400).json({ message: "You cannot demote your own current admin session" });
    }

    await admin.auth().setCustomUserClaims(uid, nextRole === "admin" ? { role: "admin" } : { role: "customer" });
    const updated = await admin.auth().getUser(uid);

    return res.json({
      ...mapUserRecord(updated),
      tokenRefreshRequired: true,
      message: nextRole === "admin"
        ? "Admin role granted. The user must sign out and sign back in to refresh their token."
        : "Admin role removed. The user must sign out and sign back in to refresh their token."
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update user role" });
  }
});

router.delete("/:uid", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;

    if (uid === req.user.uid) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    await admin.auth().deleteUser(uid);
    return res.json({ message: "User deleted", uid });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete user" });
  }
});

module.exports = router;
