const mongoose = require('mongoose');

const serviceDetailSchema = new mongoose.Schema({
    currentPrice: String,
    campaignPrice: String,
    serviceID: String,
    productID: String,
});

const campaignModel = new mongoose.Schema({
    businessID: String,
    campaignStartDate: String,
    campaignEndDate: String,
    campaignDesciption: String,
    campaignType: String,
    campaignName: String,
    campaignImage: String,
    campaignText: String,
    campaignDetails: [serviceDetailSchema],
}, {
    timestamps: true, 
});

const Campaign = mongoose.model('Campaign', campaignModel, 'campaign');

module.exports = Campaign;
