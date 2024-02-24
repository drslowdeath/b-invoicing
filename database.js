// database.js
const mysql = require("mysql2");

// different from your localhost app
const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "extUSR",
  password: "golqmkur123",
  database: "invoicing",
  port: 3306,
});

connection.connect((error) => {
  if (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
  console.log("Successfully connected to the database.");
});

module.exports = connection;
