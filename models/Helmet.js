const mongoose = require("mongoose");

const helmetSchema = new mongoose.Schema({

  helmetId: {
    type: String,
    required: true,
    unique: true
  },

  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },

  workerName: {
    type: String,
    default: "Unassigned"
  },

  location: {
    type: String,
    default: "Unknown"
  },

  deviceKey: {
    type: String,
    required: true
  },

  status: {
    type: String,
    default: "active"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Helmet", helmetSchema);