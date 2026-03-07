const router = require("express").Router();
const { verifyToken } = require("../middleware/authMiddleware.js");

router.get("/me", verifyToken, async (req, res) => {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (req.user.email || "").toLowerCase();
  const isAdmin = adminEmails.includes(email);

  res.json({
    uid: req.user.uid,
    email: req.user.email || "",
    name: req.user.name || "",
    isAdmin
  });
});

module.exports = router;