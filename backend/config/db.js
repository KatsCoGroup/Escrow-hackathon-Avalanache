const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Database is connected");
  } catch (err) {
    console.log("Error connecting database: ", err);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
