const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    businessID: { type: String },
    auth: { type: String, required: true },
  },
  {
    timestamps: true
  }
);

const adminModel = mongoose.model('Admin', adminSchema, 'admin');

module.exports = adminModel;
