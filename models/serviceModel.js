const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    serviceName: String,
    description: String,
    price: String,
    durationMinutes: Number,
    status: String,
    category: String,
    serviceType: String,
    businessID: String,
}, {
    timestamps: true, 
});

const Service = mongoose.model('Service', serviceSchema, 'services');

module.exports = Service;
