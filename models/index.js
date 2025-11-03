const { sequelize } = require('../config/database');
const User = require('./User');
const Passport = require('./Passport');
const EmailVerification = require('./EmailVerification');
const Session = require('./Session');

// Define relationships
User.hasOne(Passport, { foreignKey: 'user_id', as: 'passport' });
Passport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(EmailVerification, { foreignKey: 'user_id', as: 'emailVerifications' });
EmailVerification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false, alter: true });
    console.log('Database synchronized');
  } catch (error) {
    console.error('Database sync failed:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Passport,
  EmailVerification,
  Session,
  syncDatabase
};