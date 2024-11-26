const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FavSchema = new Schema(
  {
    userID: { type: String },
    businessID: { type: String },
  },
  { timestamps: true }
);

const Fav = mongoose.model('Fav', FavSchema, 'favorites');
module.exports = Fav;
