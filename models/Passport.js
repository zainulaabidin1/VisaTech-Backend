const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Passport = sequelize.define('Passport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  passport_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  nationality: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  sex: {
    type: DataTypes.ENUM('male', 'female'),
    allowNull: false
  },
  passport_image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'passports'
});

module.exports = Passport;