const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const aboutModel = new Schema(
  {
    heading: String,
    maintext: String,
    aboutImage: String
  },
  {
    timestamps: true
  }
);

const About = mongoose.model('About', aboutModel, 'about');
module.exports = About;
