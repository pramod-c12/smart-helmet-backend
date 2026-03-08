const express = require("express");
const crypto = require("crypto");

const Helmet = require("../models/Helmet");

const router = express.Router();

/* REGISTER HELMET */

router.post("/register", async (req, res) => {

  try {

    const { helmetId, companyId, workerName, location } = req.body;

    const existing = await Helmet.findOne({ helmetId });

    if (existing) {
      return res.status(400).json({ message: "Helmet already exists" });
    }

    const deviceKey = crypto.randomBytes(16).toString("hex");

    const helmet = new Helmet({
      helmetId,
      companyId,
      workerName,
      location,
      deviceKey
    });

    await helmet.save();

    res.json({
      message: "Helmet registered",
      helmet
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* GET HELMETS FOR COMPANY */

router.get("/:companyId", async (req, res) => {

  try {

    const helmets = await Helmet.find({
      companyId: req.params.companyId
    });

    res.json(helmets);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

module.exports = router;