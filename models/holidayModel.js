const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    workerID: String,
    businessID: String,
    HolidayStartDate: Date,
    HolidayEndDate: Date,
}, {
    timestamps: true 
});
holidaySchema.index({ workerID: 1 }, { unique: false });

const Holiday = mongoose.model('Holiday', holidaySchema, 'holiday');

module.exports = Holiday;
