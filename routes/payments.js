const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Payment, User, Passport } = require('../models');

/**
 * @route   GET /api/payments/my-status
 * @desc    Get current user's payment status
 * @access  Private (User)
 */
router.get('/my-status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find or create payment record for user
        let payment = await Payment.findOne({
            where: { user_id: userId }
        });

        // If no payment record exists, create one
        if (!payment) {
            payment = await Payment.create({
                user_id: userId,
                status: 'pending_amount'
            });
        }

        console.log('📋 Payment status fetched for user:', req.user.email, '- Status:', payment.status);

        res.json({
            success: true,
            data: {
                id: payment.id,
                status: payment.status,
                amount: payment.amount,
                bankAccountTitle: payment.bank_account_title,
                bankAccountNumber: payment.bank_account_number,
                paymentMethod: payment.payment_method,
                screenshotUrl: payment.screenshot_url,
                transactionId: payment.transaction_id,
                adminNotes: payment.admin_notes,
                createdAt: payment.created_at,
                updatedAt: payment.updated_at
            }
        });

    } catch (error) {
        console.error('❌ Error fetching payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment status'
        });
    }
});

/**
 * @route   POST /api/payments/submit-proof
 * @desc    Submit payment screenshot and transaction ID
 * @access  Private (User)
 */
router.post('/submit-proof', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { transactionId, screenshotUrl } = req.body;

        if (!transactionId || !screenshotUrl) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID and screenshot are required'
            });
        }

        // Find payment record
        const payment = await Payment.findOne({
            where: { user_id: userId }
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }

        // Check if payment is in correct status
        if (payment.status !== 'pending_payment') {
            return res.status(400).json({
                success: false,
                message: `Cannot submit proof. Current status: ${payment.status}`
            });
        }

        // Update payment with proof
        await payment.update({
            transaction_id: transactionId,
            screenshot_url: screenshotUrl,
            status: 'pending_verification'
        });

        console.log('✅ Payment proof submitted for user:', req.user.email);

        res.json({
            success: true,
            message: 'Payment proof submitted successfully. We will verify and send confirmation soon.',
            data: {
                status: 'pending_verification',
                transactionId: payment.transaction_id
            }
        });

    } catch (error) {
        console.error('❌ Error submitting payment proof:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit payment proof'
        });
    }
});

module.exports = router;
