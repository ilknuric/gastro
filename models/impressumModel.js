const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const impressumSchema = new Schema(
  {
    heading: { type: String },
    text: { type: String },
  },
  { timestamps: true }
);

const Impressum = mongoose.model('Impressum', impressumSchema, 'impressum');
module.exports = Impressum;
