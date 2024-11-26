const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const agbSchema = new Schema(
  {
    heading: { type: String },
    text: { type: String }
  },
  {
    timestamps: true
  }
);

const Agb = mongoose.model('Agb', agbSchema, 'agb');
module.exports = Agb;
