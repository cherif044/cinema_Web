// models/Contributor.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Contributor",
    {
      contributor_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      contributor_name: { type: DataTypes.STRING(100), allowNull: false },
    },
    {
      tableName: "contributor",
      timestamps: false,
      underscored: true,
    }
  );
};
