const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool(
  process.env.DB_SOCKET
    ? {
        socketPath:       process.env.DB_SOCKET,
        user:             process.env.DB_USER     || 'root',
        password:         process.env.DB_PASSWORD || '',
        database:         process.env.DB_NAME     || 'phonezone',
        waitForConnections: true,
        connectionLimit:  10,
        queueLimit:       0,
      }
    : {
        host:             process.env.DB_HOST     || '127.0.0.1',
        port:             process.env.DB_PORT     || 3306,
        user:             process.env.DB_USER     || 'root',
        password:         process.env.DB_PASSWORD || '',
        database:         process.env.DB_NAME     || 'phonezone',
        waitForConnections: true,
        connectionLimit:  10,
        queueLimit:       0,
      }
);

module.exports = pool;
