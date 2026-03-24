function checkRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (role === "admin" && !req.user.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (role !== "admin" && req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

module.exports = checkRole;
