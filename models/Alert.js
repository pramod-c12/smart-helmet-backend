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

  severity: {
    type: String,
    default: "warning"
  },

  timestamp: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Alert", alertSchema);