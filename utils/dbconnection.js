const mysql = require('mysql');

function createMySQLConnection(host, user, password, database) {
  // console.log('Creating MySQL connection', { host, user, password, database });
  const connection = mysql.createConnection({ host, user, password, database });
  // console.log('Connecting to MySQL database');
  return connection;
}

function authenticate() {
  // Login with custom database method
  if (method === 'database') {
    // Create connection to database
    const databaseConfig = {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    };

    let connection = null;
    try {
      connection = createMySQLConnection(
        databaseConfig.host,
        databaseConfig.user,
        databaseConfig.password,
        databaseConfig.database
      );

      // Get user from database
      const query = `SELECT * FROM users`;
      connection.query(query, function (error, results, fields) {
        if (error) {
          console.error('Error connecting to database: ', error);
        }
        // console.log('results: ', { results, fields });
      });
    } catch (error) {
      console.error('Error connecting to database: ', error);
    }
  }
}

module.exports = {
  createMySQLConnection,
  authenticate,
};
