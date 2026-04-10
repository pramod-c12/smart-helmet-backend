const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendAlertEmail(alert, toEmail){
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials not configured in Render. Skipping alert email for:", alert.message);
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail || process.env.ALERT_EMAIL,
    subject: "🚨 Smart Helmet Emergency Alert",
    text: `
Helmet: ${alert.helmetId}

Alert: ${alert.message}

Time: ${new Date().toLocaleString()}
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email alert sent successfully.");
  } catch (error) {
    console.error("Failed to send email alert:", error);
  }
}

module.exports = sendAlertEmail;