const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure env vars are loaded

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create transporter lazily (only when needed) to ensure env vars are loaded
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    console.log('📧 Creating email transporter with:', {
      service: process.env.EMAIL_SERVICE || 'gmail',
      user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 5)}...` : 'NOT SET',
      passConfigured: !!process.env.EMAIL_PASS
    });

    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify transporter connection
    transporter.verify(function (error, success) {
      if (error) {
        console.log('❌ Email transporter verification failed:', error.message);
      } else {
        console.log('✅ Email server is ready to send messages');
      }
    });
  }
  return transporter;
};

const sendVerificationEmail = async (email, verificationCode) => {
  // Always log the OTP for debugging
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📧 SENDING OTP EMAIL`);
  console.log(`📧 To: ${email}`);
  console.log(`📧 OTP Code: ${verificationCode}`);
  console.log(`${'='.repeat(50)}\n`);

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email credentials not configured!');
    console.log('⚠️ EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('⚠️ EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET (hidden)' : 'NOT SET');
    console.log('⚠️ OTP logged above - use that for verification');
    return true; // Return true to continue the flow
  }

  const mailOptions = {
    from: `"VISAA Verification" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Verification Code - VISAA',
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
    const emailTransporter = getTransporter();
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Verification email SENT successfully to ${email}`);
    console.log(`✅ Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);

    if (error.code === 'EAUTH') {
      console.error('❌ AUTHENTICATION ERROR: Check your EMAIL_USER and EMAIL_PASS');
      console.error('❌ For Gmail, you need to use an App Password, not your regular password');
      console.error('❌ Create one at: https://myaccount.google.com/apppasswords');
    }

    // Log the OTP so user can still verify
    console.log(`\n⚠️ EMAIL FAILED - Use this OTP manually: ${verificationCode}\n`);
    return true; // Return true to continue the registration flow
  }
};

module.exports = { generateVerificationCode, sendVerificationEmail };

