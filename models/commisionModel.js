const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const comSchema = new Schema(
  {
    commisionRate: { type: Number }
  },
  {
    timestamps: true
  }
);

const Commision = mongoose.model('Commision', comSchema, 'commision');
module.exports = Commision;
