// database.js
const mysql = require("mysql2");

// different from your localhost app
const connection = mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "extUSR",
  password: process.env.DB_PASSWORD || "golqmkur123",
  database: process.env.DB_NAME || "invoicing",
  port: process.env.DB_PORT || 3306,
});

connection.connect((error) => {
  if (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
  console.log("Successfully connected to the database.");
});

module.exports = connection;
