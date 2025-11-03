const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailVerification = sequelize.define('EmailVerification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  verification_code: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  verification_type: {
    type: DataTypes.ENUM('signup', 'password_reset', 'email_change'),
    defaultValue: 'signup'
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'email_verifications',
  indexes: [
    {
      fields: ['email', 'verification_code']
    },
    {
      fields: ['expires_at']
    }
  ]
});

module.exports = EmailVerification;