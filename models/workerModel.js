const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const shiftSchema = new Schema({
  start: String,
  end: String,
  offday:String,
});

const workerSchema = new Schema(
  {
    name: String,
    surname: String,
    fullName: String,
    availability: String,
    businessID: String,
    workerColor: String,	  
    hours: {
      "0": [shiftSchema],
      "1": [shiftSchema],
      "2": [shiftSchema],
      "3": [shiftSchema],
      "4": [shiftSchema],
      "5": [shiftSchema],
      "6": [shiftSchema],
    },
    services: [
      {
        type: Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Workers = mongoose.model("Workers", workerSchema, "workers");
module.exports = Workers;
