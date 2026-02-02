// models/Seat.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Seat",
    {
      cinema_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      hall_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      seat_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      seat_row: { type: DataTypes.INTEGER, allowNull: false },
      seat_col: { type: DataTypes.INTEGER, allowNull: false },
      seat_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "normal" },
      status: {
        type: DataTypes.ENUM('active','inactive'),
        allowNull: false,
      },
    },
    {
      tableName: "seat",
      timestamps: false,
      underscored: true,
      indexes: [
        { unique: true, fields: ["cinema_id", "hall_id", "seat_row", "seat_col"], name: "uq_seat_position" },
      ],
    }
  );
};
