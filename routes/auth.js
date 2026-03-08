const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Company = require("../models/Company");

const router = express.Router();

/* COMPANY REGISTER */

router.post("/register", async (req, res) => {

  try {

    const { companyName, adminName, email, password } = req.body;

    const existing = await Company.findOne({ email });

    if (existing) {
      return res.status(400).json({ message: "Company already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const company = new Company({
      companyName,
      adminName,
      email,
      password: hashedPassword
    });

    await company.save();

    res.json({
      message: "Company registered successfully"
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* COMPANY LOGIN */

router.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    const company = await Company.findOne({ email });

    if (!company) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, company.password);

    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { companyId: company._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

module.exports = router;