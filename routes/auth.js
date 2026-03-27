const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../config/authMiddleware");

const Company = require("../models/Company");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, 
  message: { message: "Too many login attempts, please try again later" }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, 
  message: { message: "Too many accounts created from this IP, please try again after an hour" }
});

/* COMPANY REGISTER */

router.post("/register", registerLimiter, async (req, res) => {

  try {

    const { companyName, adminName, email, password } = req.body;

    if (!companyName || !adminName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

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

    const token = jwt.sign(
      { companyId: company._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Company registered successfully",
      token,
      companyId: company._id,
      companyName: company.companyName,
      adminName: company.adminName,
      email: company.email
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* COMPANY LOGIN */

router.post("/login", loginLimiter, async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

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
      token,
      companyId: company._id,
      companyName: company.companyName,
      adminName: company.adminName,
      email: company.email
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* GET COMPANY PROFILE */

router.get("/profile/:companyId", async (req, res) => {

  try {

    const company = await Company.findById(req.params.companyId).select("-password");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* UPDATE COMPANY SETTINGS */

router.put("/company/settings", authMiddleware, async (req, res) => {

  try {

    const { companyName, adminName, industry, location, alertSettings } = req.body;
    const companyId = req.user.companyId;

    // Build the update object dynamically
    const updateData = {
      ...(companyName && { companyName }),
      ...(adminName && { adminName }),
      ...(industry && { industry }),
      ...(location && { location }),
      ...(alertSettings && { alertSettings })
    };

    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({ message: "Settings updated successfully", company });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

module.exports = router;