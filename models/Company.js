const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({

  companyName: {
    type: String,
    required: true
  },

  adminName: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Company", companySchema);