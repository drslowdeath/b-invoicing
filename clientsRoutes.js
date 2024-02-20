const express = require("express");
const router = express.Router();
const db = require("./database");

// Fetch all clients
router.get("/clients", (req, res) => {
  // MySQL query to fetch all clients
  db.query("SELECT * FROM clients", (error, results) => {
    if (error) {
      // handle error
      return res.status(500).send(error);
    }
    res.json(results);
  });
});

// Fetch a specific client by ID
router.get("/clients/:id", (req, res) => {
  //MySQL query to fetch a client by ID
  const clientId = req.params.id;
  db.query(
    "SELECT * FROM clients WHERE id = ?",
    [clientId],
    (error, results) => {
      if (error) {
        // handle error
        return res.status(500).send(error);
      }
      res.json(results);
    },
  );
});

// Add a new client
router.post("/clients", (req, res) => {
  console.log("Received request with body:", req.body); // Log received request body

  // Extract data from request body
  const { name, company_name, address, email} = req.body;

  // Log the extracted data
  console.log("Extracted data:", { name, company_name, address, email });

  // MySQL query to add a new client
  db.query(
    "INSERT INTO clients (name, company_name, address, email) VALUES (?, ?, ?, ?)",
    [name, company_name, address, email],
    (error, results) => {
      if (error) {
        console.error("Database error:", error.message); // Log database error
        return res.status(500).json({ error: error.message });
      }

      // New log to inspect the response before sending
      const responseMessage = {
        message: `Client added with ID: ${results.insertId}`,
      };
      console.log("Sending response to client:", responseMessage);

      res
        .status(201)
        .json({ message: `Client added with ID: ${results.insertId}` });
    },
  );
});

// INSERT THE EMAIL FUNCTIONALITY HERE DICKHEAD :-) THOSE WHO LACK MENTAL PROWESS BEST MAKE UP WITH FINGER FORTITUDE
// Update an existing client
router.put("/clients/:id", (req, res) => {
  // Extract data from request body
  const { name, company_name, address, email } = req.body;
  const clientId = req.params.id;
  console.log("Edited client", req.body);
  // MySQL query to update a client
  db.query(
    "UPDATE clients SET name = ?, company_name = ?, address = ?, email = ? WHERE id = ?",
    [name, company_name, address, email, clientId],
    (error, results) => {
      if (error) {
        // handle error
        return res.status(500).json({ error: error.message });
      }
      res.json({
        message: `Client updated with ID: ${clientId}`,
        clientId: clientId,
      });
    },
  );
});

// Delete a client
router.delete("/clients/:id", (req, res) => {
  // MySQL query to delete a client
  const clientId = req.params.id;
  console.log("Attempting to delete client with ID:", clientId);

  db.query("DELETE FROM clients WHERE id = ?", [clientId], (error, results) => {
    if (error) {
      // handle error
      console.error("Error deleting client:", error);
      return res.status(500).send(error);
    }
    console.log(`Client deleted with ID: ${clientId}`);
    res.json({ message: `Client deleted with ID: ${clientId}` });
  });
});

module.exports = router;
