const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    businessID: String,
    workerID: String,
    paymentStatus: String,
    customerName: String,
    customerSurname: String,
    orderNote: String,	
    serviceID: String,
    orderNumber: String,
    duration: String,
	clientTel: String,
    startDate: Date,
    endDate: Date,
}, { timestamps: true });

const ScheduleModel = mongoose.model('Calendar', scheduleSchema, 'calendar');

module.exports = ScheduleModel;
