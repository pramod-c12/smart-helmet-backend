const express = require("express");

const SensorData = require("../models/SensorData");
const Alert = require("../models/Alert");
const Helmet = require("../models/Helmet");

const router = express.Router();



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

/* GET CURRENT TELEMETRY FOR ALL HELMETS IN A COMPANY */
router.get("/data/company/:companyId", async (req, res) => {
  try {
    const helmets = await Helmet.find({ companyId: req.params.companyId });
    const helmetIds = helmets.map(h => h.helmetId);

    const latestData = await SensorData.aggregate([
      { $match: { helmetId: { $in: helmetIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$helmetId",
          doc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$doc" } }
    ]);

    res.json(latestData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// History route with optional date filter
router.get("/history/:helmetId", async (req, res) => {

  try {

    let query = { helmetId: req.params.helmetId };

    if (req.query.date) {
      const startDate = new Date(req.query.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.timestamp = { $gte: startDate, $lt: endDate };
    }

    const history = await SensorData
      .find(query)
      .sort({ timestamp: -1 })
      .limit(req.query.date ? 10000 : 100);

    res.json(history);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

/* GET ANALYTICS FOR COMPANY */
router.get("/analytics/:companyId", async (req, res) => {
  try {
    const helmets = await Helmet.find({ companyId: req.params.companyId });
    let helmetIds = helmets.map(h => h.helmetId);

    // Optional: filter to a single worker for drill-down (#7)
    if (req.query.helmetId) {
      helmetIds = helmetIds.filter(id => id === req.query.helmetId);
    }

    const range = req.query.days ? parseInt(req.query.days) : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate average BPM and SpO2 per day
    const vitalTrends = await SensorData.aggregate([
      { $match: { helmetId: { $in: helmetIds }, timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          avgBpm: { $avg: "$bpm" },
          avgSpo2: { $avg: "$spo2" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregate Alerts per day
    const alertTrends = await Alert.aggregate([
      { $match: { helmetId: { $in: helmetIds }, timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ vitalTrends, alertTrends });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* GET PER-WORKER RANKING STATS FOR COMPANY (#10) */
router.get("/analytics/:companyId/workers", async (req, res) => {
  try {
    const helmets = await Helmet.find({ companyId: req.params.companyId });
    const helmetIds = helmets.map(h => h.helmetId);

    const range = req.query.days ? parseInt(req.query.days) : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);
    startDate.setHours(0, 0, 0, 0);

    // Per-worker vital averages
    const workerVitals = await SensorData.aggregate([
      { $match: { helmetId: { $in: helmetIds }, timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: "$helmetId",
          avgBpm: { $avg: "$bpm" },
          avgSpo2: { $avg: "$spo2" },
          avgRisk: { $avg: "$risk" },
          maxRisk: { $max: "$risk" },
          dataPoints: { $sum: 1 }
        }
      },
      { $sort: { avgRisk: -1 } }
    ]);

    // Per-worker alert counts
    const workerAlerts = await Alert.aggregate([
      { $match: { helmetId: { $in: helmetIds }, timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: "$helmetId",
          totalAlerts: { $sum: 1 },
          criticalAlerts: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] }
          }
        }
      }
    ]);

    // Merge vitals + alerts + helmet metadata
    const workers = helmets.map(helmet => {
      const vitals = workerVitals.find(v => v._id === helmet.helmetId) || {};
      const alerts = workerAlerts.find(a => a._id === helmet.helmetId) || {};
      return {
        helmetId: helmet.helmetId,
        workerName: helmet.workerName,
        location: helmet.location,
        avgBpm: vitals.avgBpm ? Math.round(vitals.avgBpm * 10) / 10 : null,
        avgSpo2: vitals.avgSpo2 ? Math.round(vitals.avgSpo2 * 10) / 10 : null,
        avgRisk: vitals.avgRisk ? Math.round(vitals.avgRisk * 10) / 10 : null,
        maxRisk: vitals.maxRisk ? Math.round(vitals.maxRisk * 10) / 10 : null,
        dataPoints: vitals.dataPoints || 0,
        totalAlerts: alerts.totalAlerts || 0,
        criticalAlerts: alerts.criticalAlerts || 0,
      };
    });

    // Sort by avgRisk descending (most at-risk first)
    workers.sort((a, b) => (b.avgRisk || 0) - (a.avgRisk || 0));

    res.json(workers);

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

    // Then get all alerts for those helmets (no limit for full history)
    const alerts = await Alert
      .find({ helmetId: { $in: helmetIds } })
      .sort({ timestamp: -1 });

    res.json(alerts);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


/* GET TODAY'S ALERTS WITH STATS FOR COMPANY */

router.get("/alerts/company/:companyId/today", async (req, res) => {

  try {

    // First get all helmets for this company
    const helmets = await Helmet.find({
      companyId: req.params.companyId
    });

    const helmetIds = helmets.map(h => h.helmetId);

    // Get start of today (UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's alerts for those helmets
    const alerts = await Alert
      .find({
        helmetId: { $in: helmetIds },
        timestamp: { $gte: today }
      })
      .sort({ timestamp: -1 });

    // Calculate stats
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => a.status === "active").length,
      critical: alerts.filter(a => a.severity === "critical" && a.status === "active").length,
      warning: alerts.filter(a => a.severity === "warning" && a.status === "active").length,
      resolved: alerts.filter(a => a.status === "resolved").length
    };

    res.json({ alerts, stats });

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
      .sort({ timestamp: -1 });

    res.json(alerts);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

module.exports = router;