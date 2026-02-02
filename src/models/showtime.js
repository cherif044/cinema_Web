// models/Showtime.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Showtime",
    {
      showtime_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cinema_id: { type: DataTypes.INTEGER, allowNull: false },
      hall_id: { type: DataTypes.INTEGER, allowNull: false },
      movie_id: { type: DataTypes.INTEGER, allowNull: false },
      start_time: { type: DataTypes.DATE, allowNull: false },
      end_time: { type: DataTypes.DATE, allowNull: false },
  
    },
    {
      tableName: "showtime",
      timestamps: false,
      underscored: true,
      indexes: [
        { fields: ["movie_id"], name: "idx_showtime_movie" },
        { fields: ["cinema_id", "hall_id", "start_time"], name: "idx_showtime_cinema_hall_time" },
      ],
    }
  );
};
