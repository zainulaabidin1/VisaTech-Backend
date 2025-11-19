const { syncDB } = require('./config/database');

async function runSync() {
  console.log('🔄 Starting database sync...');
  const success = await syncDB();
  
  if (success) {
    console.log('🎉 Database sync completed successfully!');
    process.exit(0);
  } else {
    console.log('💥 Database sync failed!');
    process.exit(1);
  }
}

runSync();