// models/ContributorsXMovies.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "ContributorsXMovies",
    {
      movie_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      contributor_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      contributor_role: { type: DataTypes.STRING(50), allowNull: false },
    },
    {
      tableName: "contributorsxmovies",
      timestamps: false,
      underscored: true,
    }
  );
};
