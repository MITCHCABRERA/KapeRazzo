const AppError = require("../utils/appError");

function checkRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401, "AUTH_REQUIRED"));
    }

    if (req.user.role !== requiredRole) {
      return next(new AppError("Forbidden", 403, "ROLE_FORBIDDEN", { requiredRole, currentRole: req.user.role }));
    }

    next();
  };
}

module.exports = checkRole;
