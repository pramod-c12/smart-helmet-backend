const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({

  helmetId: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  type: {
    type: String,
    default: "sensor"
  },

  severity: {
    type: String,
    default: "warning"
  },

  status: {
    type: String,
    enum: ["active", "resolved"],
    default: "active"
  },

  acknowledged: {
    type: Boolean,
    default: false
  },

  acknowledgedAt: {
    type: Date
  },

  timestamp: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Alert", alertSchema);