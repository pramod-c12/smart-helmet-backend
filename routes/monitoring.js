const express = require("express");

const SensorData = require("../models/SensorData");
const Alert = require("../models/Alert");
const Helmet = require("../models/Helmet");

const router = express.Router();

router.get("/helmets/:companyId", async (req, res) => {

  try {

    const helmets = await Helmet.find({
      companyId: req.params.companyId
    });

    res.json(helmets);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

router.get("/data/:helmetId", async (req, res) => {

  try {

    const data = await SensorData
      .findOne({ helmetId: req.params.helmetId })
      .sort({ timestamp: -1 });

    res.json(data);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

router.get("/history/:helmetId", async (req, res) => {

  try {

    const history = await SensorData
      .find({ helmetId: req.params.helmetId })
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(history);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* GET ALERTS BY COMPANY - must be before /alerts/:helmetId */

router.get("/alerts/company/:companyId", async (req, res) => {

  try {

    // First get all helmets for this company
    const helmets = await Helmet.find({
      companyId: req.params.companyId
    });

    const helmetIds = helmets.map(h => h.helmetId);

    // Then get alerts for all those helmets
    const alerts = await Alert
      .find({ helmetId: { $in: helmetIds } })
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(alerts);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* ACKNOWLEDGE ALERT */

router.post("/alerts/:alertId/acknowledge", async (req, res) => {

  try {

    const alert = await Alert.findByIdAndUpdate(
      req.params.alertId,
      {
        acknowledged: true,
        status: "resolved",
        acknowledgedAt: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json({ message: "Alert acknowledged", alert });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* GET ALERTS BY HELMET */

router.get("/alerts/:helmetId", async (req, res) => {

  try {

    const alerts = await Alert
      .find({ helmetId: req.params.helmetId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(alerts);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

module.exports = router;