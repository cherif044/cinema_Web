// models/pricing.js
module.exports = (sequelize, DataTypes) => {
  const Pricing = sequelize.define(
    "Pricing",
    {
      cinema_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },

      hall_type: {
        type: DataTypes.ENUM("gold", "standard", "premium"),
        allowNull: false,
        primaryKey: true,
      },

      seat_type: {
        type: DataTypes.ENUM("normal", "vip"),
        allowNull: false,
        primaryKey: true,
      },

      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      tableName: "pricing",
      timestamps: false,
      underscored: false,
    }
  );

  return Pricing;
};
