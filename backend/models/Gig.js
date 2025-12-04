const mongoose = require("mongoose"); 

const gigSchema = new mongoose.Schema({}); 

const Gig = mongoose.model("Gig", gigSchema); 
module.exports = Gig; 