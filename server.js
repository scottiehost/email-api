const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/submit-function', async (req, res) => {
    const { phrase } = req.body;

    if (!phrase) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.RECEIVER_EMAIL,
            subject: 'New Message from HTML Form',
            text: `You received a new message:\n\n${phrase}`,
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: 'Email sent successfully.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to send email.' });
    }
});

app.get('/', (req, res) => {
    res.send('Email API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});