const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BusinessSchema = new Schema({
    businessID: String,
    businessName: String,
    businessLat: Number,
    businessLong: Number,
    businessLocation: String,
    businessFirstname: String,
    businessSurname: String,
    businessDescription: String,
    businessStreet: String,
    businessNr: String,
    businessPostcode: String,
    businessOrt: String,
    businessTel: String,
    businessImage: String,
    businessMail: String,
    businessWebsite: String,
    businessStatus: String,
    businessHour: String,
    socialFacebook: String,
    socialInstagram: String,
    commisionRate: String,
    auth: String,
    businessImages: [String], 
}, { timestamps: true });

const Business = mongoose.model('Business', BusinessSchema, 'business');
module.exports = Business;
