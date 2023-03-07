const mysql = require('mysql');

function createMySQLConnection(host, user, password, database) {
  // console.log('Creating MySQL connection', { host, user, password, database });
  const connection = mysql.createConnection({ host, user, password, database });
  // console.log('Connecting to MySQL database');
  return connection;
}

module.exports = {
  createMySQLConnection,
};
