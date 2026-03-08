require("dotenv").config();

const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");

const authRoutes = require("./routes/auth");
const helmetRoutes = require("./routes/helmets");
const monitoringRoutes = require("./routes/monitoring");

const Helmet = require("./models/Helmet");
const SensorData = require("./models/SensorData");
const Alert = require("./models/Alert");

const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/helmets", helmetRoutes);
app.use("/api", monitoringRoutes);


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

wss.on("connection", (ws) => {

  console.log("Helmet connected");

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

        /* ALERT DETECTION */

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

        if (msg.spo2 < 90) {

        alerts.push({
            helmetId: msg.helmetId,
            message: "Low oxygen level",
            severity: "critical"
        });

        }

        /* abnormal heart rate */

        if (msg.bpm > 120) {

        alerts.push({
            helmetId: msg.helmetId,
            message: "High heart rate detected",
            severity: "warning"
        });

        }

        /* store alerts */

        for (const a of alerts) {

        const alert = new Alert(a);

        await alert.save();

        console.log("ALERT:", a);

        }

    } catch (error) {

        console.log("Invalid message format");

    }

  });

});