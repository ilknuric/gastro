const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
    _id: String,
    productName: String,
    description: String,
    price: String,
    category: String,
    quantity: String,
    mwstName: String,
    mwstValue: String,
    mwstRatio: String,
    __v: String
}, { _id: false });

const orderSchema = new Schema({ 
    orderNumber: { type: String },
    note: { type: String },
    orderstatus: { type: String },
    userID: { type: String },
    orderPrice: { type: String },
    subtotal: { type: String },
    discount: { type: String },
    couponCode: { type: String },
    orderItems: [orderItemSchema],
    name: { type: String },
    surname: { type: String },
    email: { type: String },
    gsm: { type: String },
    street: { type: String },
    no: { type: String },
    postcode: { type: String },
    ort: { type: String },
}, { timestamps: true });

const Orders = mongoose.model('Orders', orderSchema, 'orders');
module.exports = Orders;
