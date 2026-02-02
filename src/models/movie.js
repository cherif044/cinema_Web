// models/Movie.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Movie",
    {
      movie_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      movie_name: { type: DataTypes.STRING(100), allowNull: false },
      movie_genre: { type: DataTypes.STRING(20), allowNull: false },
      duration_mins: { type: DataTypes.INTEGER, allowNull: false },
        poster_url: {                   
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "movie",
      timestamps: false,
      underscored: true,
    }
  );
};
