const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_ATLAS_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });
module.exports = mongoose;
