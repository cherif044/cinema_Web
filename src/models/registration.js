// models/Registration.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Registration",
    {
      booking_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      showtime_id: { type: DataTypes.INTEGER, allowNull: false },
      cinema_id: { type: DataTypes.INTEGER, allowNull: false },
      hall_id: { type: DataTypes.INTEGER, allowNull: false },
      seat_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal("CURRENT_TIMESTAMP") },
    },
    {
      tableName: "registration",
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["showtime_id", "cinema_id", "hall_id", "seat_id"],
          name: "uq_one_seat_per_show",
        },
        { fields: ["user_id"], name: "idx_reg_user" },
        { fields: ["showtime_id"], name: "idx_reg_showtime" },
      ],
    }
  );
};
