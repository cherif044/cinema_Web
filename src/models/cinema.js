// models/Cinema.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Cinema",
    {
      cinema_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cinema_name: { type: DataTypes.STRING(28), allowNull: false },
      location: { type: DataTypes.STRING(40), allowNull: false },
      logo_url: { type: DataTypes.STRING(255), allowNull: true },
      location_url: { type: DataTypes.STRING(255), allowNull: false },

    },
    {
      tableName: "cinema",
      timestamps: false,
      underscored: true,
    }
  );
};

