require("dotenv").config();

const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/auth");
const helmetRoutes = require("./routes/helmets");
const monitoringRoutes = require("./routes/monitoring");

const Helmet = require("./models/Helmet");
const SensorData = require("./models/SensorData");
const Alert = require("./models/Alert");
const Company = require("./models/Company");
const sendAlertEmail = require("./services/emailService");

const connectDB = require("./config/db");

const app = express();

const authMiddleware = require("./config/authMiddleware");

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/helmets", authMiddleware, helmetRoutes);
app.use("/api", authMiddleware, monitoringRoutes);


/* connect database */
connectDB();

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {

  console.log("Server running on port", PORT);

});

/* basic route */

app.get("/", (req, res) => {

  res.send("Smart Helmet Platform API");

});

/* websocket server */

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {

  console.log("Client connected");

  // Authenticate dashboard clients using token
  let authCompanyId = null;
  const urlParts = req.url.split('?');
  if (urlParts.length > 1) {
    const urlParams = new URLSearchParams(urlParts[1]);
    const token = urlParams.get('token');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        authCompanyId = decoded.companyId;
        ws.companyId = authCompanyId;
        console.log("Dashboard client authenticated for company:", ws.companyId);
      } catch (error) {
        console.log("Invalid WebSocket token");
      }
    }
  }

  ws.on("message", async (data) => {

    try {

        const msg = JSON.parse(data);

        const { helmetId, deviceKey } = msg;

        if (!helmetId || !deviceKey) {

        console.log("Invalid device payload");
        return;

        }

        /* find helmet in database */

        const helmet = await Helmet.findOne({ helmetId });

        if (!helmet) {

        console.log("Unknown helmet:", helmetId);
        return;

        }

        /* verify device key */

        if (helmet.deviceKey !== deviceKey) {

        console.log("Authentication failed for", helmetId);
        return;

        }

        console.log("Authenticated Helmet:", helmetId);

        console.log("Sensor Data:", msg);

        /* get company settings for dynamic alerts */
        let companyEmail = null;
        let alertSettings = {
          bpmThreshold: 120,
          spo2Threshold: 90,
          emailAlerts: false
        };
        try {
          const comp = await Company.findById(helmet.companyId);
          if (comp) {
            companyEmail = comp.email;
            if (comp.alertSettings) {
              alertSettings = { ...alertSettings, ...comp.alertSettings.toObject() };
            }
          }
        } catch(err) {
          console.error("Error fetching company settings:", err);
        }

        /* BROADCAST TELEMETRY DATA IMMEDIATELY for instant display */

        wss.clients.forEach(client => {

        // Only send to dashboard clients of the same company
        if (client.readyState === WebSocket.OPEN && client.companyId === helmet.companyId.toString()) {

            client.send(JSON.stringify(msg));

        }

        });

        /* ALERT DETECTION - check and broadcast alerts immediately */

        const alerts = [];

        /* accident detection */

        if (msg.accident === true) {

        alerts.push({
            helmetId: msg.helmetId,
            message: "Accident detected",
            severity: "critical"
        });

        }

        /* health risk */

        if (msg.health === true) {

        alerts.push({
            helmetId: msg.helmetId,
            message: "Worker health risk",
            severity: "critical"
        });

        }

        /* high risk score */

        if (msg.risk > 80) {

        alerts.push({
            helmetId: msg.helmetId,
            message: "High risk environment",
            severity: "warning"
        });

        }

        /* oxygen danger */

        if (msg.spo2 <= alertSettings.spo2Threshold) {

        alerts.push({
            helmetId: msg.helmetId,
            message: `Low oxygen level (${msg.spo2}%)`,
            severity: "critical"
        });

        }

        /* abnormal heart rate */

        if (msg.bpm >= alertSettings.bpmThreshold) {

        alerts.push({
            helmetId: msg.helmetId,
            message: `High heart rate detected (${msg.bpm} BPM)`,
            severity: "warning" // Note: can be configured or escalated
        });

        }

        /* broadcast alerts immediately and send emails if configured */

        for (const a of alerts) {

        console.log("ALERT:", a);

        // Send email for critical alerts if enabled
        if (a.severity === "critical" && alertSettings.emailAlerts && companyEmail) {
          try {
            sendAlertEmail(a, companyEmail);
          } catch(err) {
            console.error("Failed to send alert email:", err);
          }
        }

        wss.clients.forEach(client => {

            // Only send to dashboard clients of the same company
            if (client.readyState === WebSocket.OPEN && client.companyId === helmet.companyId.toString()) {

            client.send(JSON.stringify({
                type: "alert",
                data: a
            }));

            }

        });

        }

        /* SAVE TO DATABASE ASYNCHRONOUSLY (non-blocking) */

        setImmediate(async () => {

        try {

            /* store sensor data */

            const sensorRecord = new SensorData({

            helmetId: msg.helmetId,

            bpm: msg.bpm,
            spo2: msg.spo2,

            acc: msg.acc,

            angleX: msg.angleX,
            angleY: msg.angleY,

            accident: msg.accident,
            health: msg.health,

            risk: msg.risk,

            lat: msg.lat,
            lon: msg.lon

            });

            await sensorRecord.save();

            /* store alerts */

            for (const a of alerts) {

            const alert = new Alert(a);

            await alert.save();

            }

        } catch (dbError) {

            console.error("Database save error:", dbError);

        }

        });

    } catch (error) {

        console.log("Invalid message format");

    }

  });

});