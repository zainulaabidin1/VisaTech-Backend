const nodemailer = require('nodemailer');
require('dotenv').config();

const testEmail = async () => {
    console.log('🧪 Testing Email Configuration...');
    console.log('User:', process.env.EMAIL_USER);
    console.log('Pass length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
    console.log('Service:', process.env.EMAIL_SERVICE);

    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        debug: true // Enable debug output
    });

    try {
        console.log('🔄 Verifying transporter connection...');
        await transporter.verify();
        console.log('✅ Connection verified!');

        console.log('📧 Attempting to send test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'Test Email from Visaa App',
            text: 'If you receive this, the email service is working correctly.'
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ EMAIL ERROR DETAILS:');
        console.error(error);
    }
};

testEmail();
