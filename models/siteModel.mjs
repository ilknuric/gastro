const mongoose = require("mongoose");

const SiteSchema = new mongoose.Schema(
  {
    homeImage: { type: String, required: "Cannot be empty" },
    aboutImage: { type: String, required: "Cannot be empty" },
    aboutText: { type: String, required: "Cannot be empty" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Site", SiteSchema);
