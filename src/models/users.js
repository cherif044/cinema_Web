// models/User.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      first_name: { type: DataTypes.STRING(40), allowNull: false },
      last_name: { type: DataTypes.STRING(40), allowNull: false },
      user_name: { type: DataTypes.STRING(28), allowNull: false, unique: true },
      hashed_password: { type: DataTypes.TEXT, allowNull: false },

      // ✅ ADD THIS
      role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "user" },
    },
    {
      tableName: "users",
      timestamps: false,
      underscored: true,
    }
  );
};
