const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true // Set by admin after negotiation
    },
    status: {
        type: DataTypes.ENUM(
            'pending_amount',      // Admin hasn't set amount yet
            'pending_payment',     // Amount set, waiting for user to pay
            'pending_verification', // User submitted proof, awaiting admin review
            'approved',            // Payment verified and approved
            'rejected'             // Payment rejected by admin
        ),
        defaultValue: 'pending_amount'
    },
    bank_account_title: {
        type: DataTypes.STRING(255),
        defaultValue: 'EasyPaisa Account'
    },
    bank_account_number: {
        type: DataTypes.STRING(50),
        defaultValue: '03095484001' // Default EasyPaisa number - will be configured
    },
    payment_method: {
        type: DataTypes.STRING(50),
        defaultValue: 'easypaisa'
    },
    screenshot_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    admin_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Payment;
