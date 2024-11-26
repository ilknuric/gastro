const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
    reviewDetails: { type: String},
    businessID: { type: String},
    reviewOwner: { type: String},
    reviewPoint: { type: String},
    reviewDate: { type: String},
    reviewHeading: { type: String},
    orderID: { type: String},
    userID: { type: String},
}, { timestamps: true }); 

const Reviews = mongoose.model('Reviews', ReviewSchema, 'reviews');
module.exports = Reviews;
