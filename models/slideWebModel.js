const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const slideSchema = new Schema({
    slideImageWeb: String,
	slideBig: String,
	slideSmall: String
}, {
    timestamps: true 
});

const SlideWeb = mongoose.model('SlideWeb', slideSchema, 'slideweb');
module.exports = SlideWeb;