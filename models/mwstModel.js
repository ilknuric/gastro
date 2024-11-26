const mongoose = require('mongoose');

const mwstSchema = new mongoose.Schema({
    mwstName: String,
    mwstRatio: String,
}, { timestamps: true });

const mwstModel = mongoose.model('Mwst', mwstSchema, 'mwst');

module.exports = mwstModel;
