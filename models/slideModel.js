const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const slideSchema = new Schema({
    image_path: String,
	slideBig: String,
	slideSmall: String
}, {
    timestamps: true 
});

const Slide = mongoose.model('Slide', slideSchema, 'slide');
module.exports = Slide;

