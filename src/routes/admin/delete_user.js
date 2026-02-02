const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

router.get("/admin/delete_user", requireAuth, admin_check, async (req, res) => {
  const t = await models.sequelize.transaction();
  try {
    const username = String(req.query.username || req.body?.username || "").trim();

    if (!username) {
      await t.rollback();
      return res.status(400).json({
        ok: false,
        message: "Missing username. Example: /admin/delete_user?username=ahmed",
      });
    }

    const user = await models.User.findOne({
      where: { user_name: username },
      attributes: ["id", "user_name", "role"], // ✅ include role
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    // ✅ prevent deleting admins
    const role = String(user.role ?? "").trim().toLowerCase();
    if (role === "admin") {
      await t.rollback();
      return res.status(403).json({
        ok: false,
        message: "You can't delete an admin user.",
      });
    }

    // ✅ delete children first
    const deletedRegs = await models.Registration.destroy({
      where: { user_id: user.id },
      transaction: t,
    });

    // ✅ then delete user
    const deletedUsers = await models.User.destroy({
      where: { id: user.id },
      transaction: t,
    });

    await t.commit();
    return res.json({
      ok: true,
      message: "User deleted successfully.",
      data: {
        user_id: user.id,
        username: user.user_name,
        deleted_regs: deletedRegs,
        deleted_users: deletedUsers,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("GET /admin/delete_user error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
