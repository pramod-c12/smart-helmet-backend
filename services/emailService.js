const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }

});

async function sendAlertEmail(alert, toEmail){

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

  await transporter.sendMail(mailOptions);

}

module.exports = sendAlertEmail;