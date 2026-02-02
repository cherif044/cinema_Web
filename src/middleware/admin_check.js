module.exports = function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(500).json({
      ok: false,
      message: "Auth middleware not applied before admin check",
    });
  }

  const rawRole = req.user.get ? req.user.get("role") : req.user.role;
  const role = String(rawRole ?? "").trim().toLowerCase();

  console.log("[ADMIN] session.userId =", req.session?.userId);
  console.log("[ADMIN] raw role =", rawRole, "| normalized =", role);

  if (role !== "admin") {
    return res.status(403).json({
      ok: false,
      message: "Forbidden: admin access only",
    });
  }

  next();
};
