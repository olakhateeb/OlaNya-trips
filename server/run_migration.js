const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  
  try {
    // Try to connect to the database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Update this if you have a password
      database: 'doolanyatrips'
    });

    console.log('Connected to database successfully');

    // Add is_favorite columns
    try {
      await connection.execute('ALTER TABLE trips ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE');
      console.log('✅ Added is_favorite column to trips table');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ is_favorite column already exists in trips table');
      } else {
        throw err;
      }
    }

    try {
      await connection.execute('ALTER TABLE camping ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE');
      console.log('✅ Added is_favorite column to camping table');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ is_favorite column already exists in camping table');
      } else {
        throw err;
      }
    }

    try {
      await connection.execute('ALTER TABLE attractions ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE');
      console.log('✅ Added is_favorite column to attractions table');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ is_favorite column already exists in attractions table');
      } else {
        throw err;
      }
    }

    console.log('🎉 Migration completed successfully!');
    console.log('The favorites functionality should now work without 500 errors.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual SQL commands to run in your database:');
    console.log('ALTER TABLE trips ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;');
    console.log('ALTER TABLE camping ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;');
    console.log('ALTER TABLE attractions ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
