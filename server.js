require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

let messages = [];

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/send-later', (req, res) => {
  const { name, email, message, date } = req.body;
  const sendTime = new Date(date);
  const now = new Date();

  if (!name || !email || !message || isNaN(sendTime)) {
    return res.status(400).send('Invalid data');
  }

  if (sendTime <= now) {
    return res.status(400).send('Time must be in the future');
  }

  messages.push({ name, email, message, sendTime });
  console.log("✅ Message scheduled for:", email, "at", sendTime.toLocaleString());
  res.sendStatus(200);
});

// كل دقيقة، نبحث عن الرسائل الجاهزة للإرسال
cron.schedule('* * * * *', () => {
  const now = new Date();
  const readyMessages = messages.filter(msg => msg.sendTime <= now);
  
  readyMessages.forEach(msg => {
    transporter.sendMail({
      from: process.env.EMAIL,
      to: msg.email,
      subject: `📩 Message from Your Past – TimeBox`,
      html: `<h2>Hello ${msg.name},</h2>
             <p>This is your message from the past:</p>
             <blockquote>${msg.message}</blockquote>
             <hr>
             <p><i>Sent via TimeBox – The Future is Now.</i></p>`
    }, (err, info) => {
      if (err) {
        console.error("❌ Email failed:", err);
      } else {
        console.log("📬 Email sent to:", msg.email);
      }
    });
  });

  messages = messages.filter(msg => msg.sendTime > now);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TimeBox running on http://localhost:${PORT}`);
});
