// models/Hall.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Hall",
    {
      cinema_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      hall_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      
      type: {
        type: DataTypes.ENUM('standard', 'gold', 'premium'),
        allowNull: false,
      },
      
    },
    {
      tableName: "hall",
      timestamps: false,
      underscored: true,
    }
  );
};
