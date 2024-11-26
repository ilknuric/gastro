const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  street: { type: String },
  no: { type: String },
  postcode: { type: String },
  ort: { type: String },
  name: { type: String },
  surname: { type: String },
  gsm: { type: String },
  customerStatus: { type: String },
}, { timestamps: true }); 

const userModel = mongoose.model('User', userSchema, 'users');

module.exports = userModel;
