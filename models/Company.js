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

  industry: {
    type: String,
    default: "construction"
  },

  location: {
    type: String,
    default: ""
  },

  alertSettings: {
    bpmThreshold: { type: Number, default: 120 },
    spo2Threshold: { type: Number, default: 95 },
    emailAlerts: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Company", companySchema);