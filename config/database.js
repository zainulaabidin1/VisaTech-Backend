const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    console.error('Unable to connect to database:', error);
    process.exit(1);
  }
};

// Add this syncDB function
const syncDB = async (options = {}) => {
  try {
    await sequelize.authenticate();
    console.log('Database connected, starting sync...');
    
    // Use alter: true to add new columns without dropping data
    await sequelize.sync({ alter: true, ...options });
    
    console.log('✅ Database synced successfully - token_number column added');
    return true;
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    return false;
  }
};

module.exports = { sequelize, testConnection, syncDB };
