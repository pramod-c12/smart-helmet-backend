const mongoose = require("mongoose");

const sensorDataSchema = new mongoose.Schema({

  helmetId: {
    type: String,
    required: true
  },

  bpm: Number,

  spo2: Number,

  acc: Number,

  angleX: Number,

  angleY: Number,

  accident: Boolean,

  health: Boolean,

  risk: Number,

  lat: Number,

  lon: Number,

  timestamp: {
    type: Date,
    default: Date.now,
    expires: '30d' // Automatically delete documents 30 days after this timestamp
  }

});

// Indexes for performance
sensorDataSchema.index({ helmetId: 1, timestamp: -1 });

module.exports = mongoose.model("SensorData", sensorDataSchema);