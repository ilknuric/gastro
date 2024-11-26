const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FaqSchema = new Schema(
  {
    question: { type: String },
    answer: { type: String },
  },
  { timestamps: true }
);

const Faq = mongoose.model('Faq', FaqSchema, 'faq');
module.exports = Faq;
