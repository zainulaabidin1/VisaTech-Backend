const nodemailer = require('nodemailer');

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create transporter with verification
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD // Use app password for Gmail
  }
});

// Verify transporter connection
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

const sendVerificationEmail = async (email, verificationCode) => {
  // For development/testing, always log the code
  console.log(`📧 Sending OTP to ${email}: ${verificationCode}`);

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email credentials not configured. Logging OTP:', verificationCode);
    return true; // Return true to continue the flow
  }

  const mailOptions = {
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Email Verification Code - Your App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #003366; text-align: center;">Verify Your Email Address</h2>
        <p>Hello,</p>
        <p>Thank you for signing up! Your verification code is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <h1 style="font-size: 32px; color: #005B9E; letter-spacing: 5px; background: #f8fafc; padding: 15px; border-radius: 8px; display: inline-block;">
            ${verificationCode}
          </h1>
        </div>
        <p>This code will expire in 30 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);

    // Even if email fails, log the code and continue
    console.log(`📧 OTP for ${email}: ${verificationCode}`);
    return true; // Return true to continue the registration flow
  }
};

module.exports = { generateVerificationCode, sendVerificationEmail };
