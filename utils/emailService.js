const nodemailer = require('nodemailer');

// Create transporter with verification
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter connection
transporter.verify(function(error, success) {
  if (error) {
    console.log('Transporter error:', error);
  } else {
    console.log('Server is ready to take our messages');
  }
});

const sendVerificationEmail = async (email, verificationCode) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
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
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    
    // For development, log the code instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 Development mode - OTP for ${email}: ${verificationCode}`);
      return true; // Return true in development to continue flow
    }
    
    return false;
  }
};

module.exports = { sendVerificationEmail };