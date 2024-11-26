const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema(
  {
    categoryName: { type: String },
    categoryImage: { type: String },
    mwstID: { type: String },
	  mwstOption: { type: String },
    mwstName: { type: String },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema, "category");
module.exports = Category;
