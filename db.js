


const mongoose = require('mongoose');
const connect = mongoose.connect('mongodb+srv://ilknurcengiz7:Q00vYLpzcD6HBFbb@b2b.1ctjh.mongodb.net/market?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

connect.then(() => {
    console.log("Database connected successfully");
}).catch(() => {
    console.log("Error");
})

const LoginSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});
const collection = new mongoose.model("users", LoginSchema);

module.exports = collection;