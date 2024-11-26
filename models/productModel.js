const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: String,
    brandName: String,
    price: String,
    status: String,
    category: String,
    businessID: String,
    description: String,
    productImages: [String], 
    package: String,
}, {
    timestamps: true,
});

const Product = mongoose.model('Product', productSchema, 'products');

module.exports = Product;
