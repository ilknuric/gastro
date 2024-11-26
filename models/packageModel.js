const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const packageSchema = new Schema(
  {
    packageName: { type: String }
  },
  {
    timestamps: true
  }
);

const Package = mongoose.model('Package', packageSchema, 'package');
module.exports = Package;
