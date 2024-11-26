const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
    couponCode: String,
    couponType: String,
    couponValue: String,
    couponStatus: String,
    minValue: String,
    businessID: String,
}, {
    timestamps: true, 
});

const Promotion = mongoose.model('Promotion', promoSchema, 'promotion');

module.exports = Promotion;
