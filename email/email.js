// email.js
const nodemailer = require('nodemailer');

async function sendEmail({ email, subject, message }) {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or use your SMTP service
      auth: {
        user: 'rg927686@gmail.com',
        pass: 'knrr dxxo htdz erpj'
      },
    });

    // Email options
    const mailOptions = {
      from: 'rg927686@gmail.com',
      to: email,
      subject: subject,
      text: message,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to send email' };
  }
}

module.exports = sendEmail;
