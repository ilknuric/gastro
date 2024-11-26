const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
    title: String,
    description: String,
    stepNumber: String,
}, {
    timestamps: true,
});

const processSchema = new mongoose.Schema({
    heading: String,
    maintext: String,
    steps: [stepSchema],
}, {
    timestamps: true,
});

const Process = mongoose.model('Process', processSchema, 'process');

module.exports = Process;
