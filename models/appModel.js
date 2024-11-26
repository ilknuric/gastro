const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const appSchema = new Schema({
    businessName: String,
    businessLocation: String,
    businessFirstname: String,
    businessSurname: String,
    businessTel: String,
    businessMail: String,
    businessStreet: String,
    businessNr: String,
    businessPostcode: String,
    businessOrt: String,
    businessStatus: String
}, {
    timestamps: true 
});

const Application = mongoose.model('Application', appSchema, 'application');
module.exports = Application;
