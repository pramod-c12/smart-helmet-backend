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