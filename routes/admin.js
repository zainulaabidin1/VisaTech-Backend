const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const { Payment, User, Passport } = require('../models');
const { Op } = require('sequelize');

// Apply authentication and admin check to all routes
router.use(authenticate);
router.use(adminAuth);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with their data
 * @access  Private (Admin)
 */
router.get('/users', async (req, res) => {
    try {
        const { search, status } = req.query;

        // Build where conditions
        let whereConditions = {
            role: 'user' // Only fetch regular users, not admins
        };

        if (search) {
            whereConditions[Op.or] = [
                { email: { [Op.iLike]: `%${search}%` } },
                { first_name: { [Op.iLike]: `%${search}%` } },
                { last_name: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const users = await User.findAll({
            where: whereConditions,
            attributes: { exclude: ['password', 'password_hash'] },
            include: [
                {
                    model: Passport,
                    as: 'passport'
                },
                {
                    model: Payment,
                    as: 'payment'
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Filter by payment status if provided
        let filteredUsers = users;
        if (status) {
            filteredUsers = users.filter(u => u.payment?.status === status);
        }

        console.log(`📋 Admin fetched ${filteredUsers.length} users`);

        res.json({
            success: true,
            data: filteredUsers.map(user => ({
                id: user.id,
                email: user.email,
                phone: user.phone,
                firstName: user.first_name,
                lastName: user.last_name,
                fullName: `${user.first_name} ${user.last_name}`.trim(),
                nationality: user.nationality,
                countryOfResidence: user.country_of_residence,
                dateOfBirth: user.date_of_birth,
                sex: user.sex,
                educationLevel: user.education_level,
                experienceLevel: user.experience_level,
                certification: user.certification,
                nationalId: user.national_id,
                personalPhotoUrl: user.personal_photo_url,
                isVerified: user.is_verified,
                isActive: user.is_active,
                createdAt: user.created_at,
                passport: user.passport ? {
                    id: user.passport.id,
                    passportNumber: user.passport.passport_number,
                    tokenNumber: user.passport.token_number,
                    passportImageUrl: user.passport.passport_image_url,
                    expiryDate: user.passport.expiry_date,
                    issuingCountry: user.passport.issuing_country,
                    frontImageUrl: user.passport.front_image_url,
                    backImageUrl: user.passport.back_image_url
                } : null,
                payment: user.payment ? {
                    id: user.payment.id,
                    status: user.payment.status,
                    amount: user.payment.amount,
                    screenshotUrl: user.payment.screenshot_url,
                    transactionId: user.payment.transaction_id,
                    adminNotes: user.payment.admin_notes,
                    createdAt: user.payment.created_at
                } : null
            })),
            count: filteredUsers.length
        });

    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user detail
 * @access  Private (Admin)
 */
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            attributes: { exclude: ['password', 'password_hash'] },
            include: [
                {
                    model: Passport,
                    as: 'passport'
                },
                {
                    model: Payment,
                    as: 'payment'
                }
            ]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                firstName: user.first_name,
                lastName: user.last_name,
                fullName: `${user.first_name} ${user.last_name}`.trim(),
                nationality: user.nationality,
                countryOfResidence: user.country_of_residence,
                dateOfBirth: user.date_of_birth,
                sex: user.sex,
                educationLevel: user.education_level,
                experienceLevel: user.experience_level,
                certification: user.certification,
                nationalId: user.national_id,
                personalPhotoUrl: user.personal_photo_url,
                isVerified: user.is_verified,
                isActive: user.is_active,
                createdAt: user.created_at,
                passport: user.passport,
                payment: user.payment
            }
        });

    } catch (error) {
        console.error('❌ Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details'
        });
    }
});

/**
 * @route   PUT /api/admin/users/:id/set-amount
 * @desc    Set payment amount for a user
 * @access  Private (Admin)
 */
router.put('/users/:id/set-amount', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, bankAccountTitle, bankAccountNumber, paymentMethod } = req.body;

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount is required'
            });
        }

        // Find user
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find or create payment record
        let payment = await Payment.findOne({ where: { user_id: id } });

        if (!payment) {
            payment = await Payment.create({
                user_id: id,
                status: 'pending_amount'
            });
        }

        // Update payment with amount and bank details
        await payment.update({
            amount: parseFloat(amount),
            status: 'pending_payment',
            bank_account_title: bankAccountTitle || payment.bank_account_title,
            bank_account_number: bankAccountNumber || payment.bank_account_number,
            payment_method: paymentMethod || payment.payment_method
        });

        console.log(`✅ Admin set amount ${amount} for user:`, user.email);

        res.json({
            success: true,
            message: 'Payment amount set successfully',
            data: {
                userId: id,
                amount: payment.amount,
                status: payment.status
            }
        });

    } catch (error) {
        console.error('❌ Error setting amount:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set payment amount'
        });
    }
});

/**
 * @route   PUT /api/admin/users/:id/set-token
 * @desc    Set token number for a user's passport
 * @access  Private (Admin)
 */
router.put('/users/:id/set-token', async (req, res) => {
    try {
        const { id } = req.params;
        const { tokenNumber } = req.body;

        if (!tokenNumber || !tokenNumber.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Token number is required'
            });
        }

        // Find user
        const user = await User.findByPk(id, {
            include: [{ model: Passport, as: 'passport' }]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if passport exists
        if (!user.passport) {
            return res.status(400).json({
                success: false,
                message: 'User does not have a passport record. Passport must be uploaded first.'
            });
        }

        // Check if token is already assigned to another passport
        const existingToken = await Passport.findOne({
            where: {
                token_number: tokenNumber.trim(),
                id: { [Op.ne]: user.passport.id }
            }
        });

        if (existingToken) {
            return res.status(400).json({
                success: false,
                message: 'This token number is already assigned to another user'
            });
        }

        // Update passport with token number
        await user.passport.update({
            token_number: tokenNumber.trim()
        });

        console.log(`✅ Admin set token ${tokenNumber} for user:`, user.email);

        res.json({
            success: true,
            message: 'Token number set successfully',
            data: {
                userId: id,
                passportId: user.passport.id,
                tokenNumber: tokenNumber.trim()
            }
        });

    } catch (error) {
        console.error('❌ Error setting token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set token number'
        });
    }
});

/**
 * @route   PUT /api/admin/payments/:id/approve
 * @desc    Approve a payment
 * @access  Private (Admin)
 */
router.put('/payments/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const payment = await Payment.findByPk(id, {
            include: [{ model: User, as: 'user' }]
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status !== 'pending_verification') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve payment with status: ${payment.status}`
            });
        }

        // Update payment status
        await payment.update({
            status: 'approved',
            admin_notes: notes || 'Payment verified and approved',
            reviewed_by: req.user.id,
            reviewed_at: new Date()
        });

        console.log(`✅ Admin approved payment for user:`, payment.user.email);

        // TODO: Send confirmation email to user
        // await sendPaymentApprovalEmail(payment.user.email, payment);

        res.json({
            success: true,
            message: 'Payment approved successfully',
            data: {
                paymentId: id,
                status: 'approved',
                userEmail: payment.user.email
            }
        });

    } catch (error) {
        console.error('❌ Error approving payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve payment'
        });
    }
});

/**
 * @route   PUT /api/admin/payments/:id/reject
 * @desc    Reject a payment
 * @access  Private (Admin)
 */
router.put('/payments/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        if (!notes) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const payment = await Payment.findByPk(id, {
            include: [{ model: User, as: 'user' }]
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status !== 'pending_verification') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject payment with status: ${payment.status}`
            });
        }

        // Update payment - set to pending_payment so user can resubmit
        await payment.update({
            status: 'pending_payment', // Allow user to resubmit
            screenshot_url: null,
            transaction_id: null,
            admin_notes: notes,
            reviewed_by: req.user.id,
            reviewed_at: new Date()
        });

        console.log(`❌ Admin rejected payment for user:`, payment.user.email);

        res.json({
            success: true,
            message: 'Payment rejected',
            data: {
                paymentId: id,
                status: 'pending_payment',
                reason: notes
            }
        });

    } catch (error) {
        console.error('❌ Error rejecting payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject payment'
        });
    }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.count({ where: { role: 'user' } });

        const pendingAmount = await Payment.count({ where: { status: 'pending_amount' } });
        const pendingPayment = await Payment.count({ where: { status: 'pending_payment' } });
        const pendingVerification = await Payment.count({ where: { status: 'pending_verification' } });
        const approved = await Payment.count({ where: { status: 'approved' } });

        res.json({
            success: true,
            data: {
                totalUsers,
                payments: {
                    pendingAmount,
                    pendingPayment,
                    pendingVerification,
                    approved
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

module.exports = router;
