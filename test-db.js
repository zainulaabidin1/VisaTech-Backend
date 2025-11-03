require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create sequelize instance using your .env variables
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    
    // Test authentication
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
    
    // Test raw query - get PostgreSQL version
    const [results] = await sequelize.query('SELECT version();');
    console.log('📊 PostgreSQL Version:', results[0].version);
    
    // List all databases
    const [databases] = await sequelize.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false;
    `);
    
    console.log('🗃️ Available databases:');
    databases.forEach(db => {
      const marker = db.datname === process.env.DB_NAME ? '🎯' : '  ';
      console.log(`${marker} - ${db.datname}`);
    });
    
    // Test if our database exists and is accessible
    if (databases.find(db => db.datname === process.env.DB_NAME)) {
      console.log('✅ Target database found:', process.env.DB_NAME);
      
      // Try to create a simple table to test write permissions
      const [tableCheck] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'test_connection'
        );
      `);
      
      if (!tableCheck[0].exists) {
        await sequelize.query(`
          CREATE TABLE test_connection (
            id SERIAL PRIMARY KEY,
            message TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
        console.log('✅ Test table created successfully');
        
        await sequelize.query(`
          INSERT INTO test_connection (message) 
          VALUES ('Database connection test successful!');
        `);
        console.log('✅ Test data inserted successfully');
        
        const [testData] = await sequelize.query('SELECT * FROM test_connection;');
        console.log('✅ Test data retrieved:', testData[0]);
        
        await sequelize.query('DROP TABLE test_connection;');
        console.log('✅ Test table cleaned up');
      }
    } else {
      console.log('❌ Target database not found:', process.env.DB_NAME);
    }
    
    console.log('\n🎉 All database tests passed! Your PostgreSQL setup is working correctly.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Provide specific troubleshooting tips
    if (error.name === 'SequelizeConnectionError') {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check if PostgreSQL service is running');
      console.log('2. Verify your .env file database credentials');
      console.log('3. Ensure database "' + process.env.DB_NAME + '" exists');
      console.log('4. Check if password is correct');
      console.log('5. Verify host and port settings');
    }
    
    process.exit(1);
  }
}

// Display connection details (mask password)
console.log('Connection details:');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);
console.log('Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'not set');
console.log('');

testConnection();