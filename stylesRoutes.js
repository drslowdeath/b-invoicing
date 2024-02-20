// stylesRoutes.js 
const express = require("express");
const router = express.Router();
const db = require("./database");

// Fetch all styles
router.get("/styles", (req, res) => {
  // MySQL query to fetch all styles with client information
  const query = `
    SELECT styles.id, styles.name AS styleName, styles.price, clients.id AS clientId, clients.name AS clientName
    FROM styles
    LEFT JOIN clients ON styles.client_id = clients.id`;

  db.query(query, (error, results) => {
    if (error) {
      // handle error
      return res.status(500).send(error);
    }
    res.json(results);
  });
});

// Fetch a specific style by ID
router.get("/styles/:id", (req, res) => {
  //MySQL query to fetch a style by ID
  const styleId = req.params.id;
  db.query("SELECT * FROM styles WHERE id = ?", [styleId], (error, results) => {
    if (error) {
      // handle error
      return res.status(500).send(error);
    }
    res.json(results);
  });
});

// Add a new style
router.post("/styles", (req, res) => {
  console.log("Received request body:", req.body); // Log the request body

  // Extract data from request body
  const { name, price, client_id } = req.body; // Make sure these names match your request

  // MySQL query to add a new style with a client reference
  db.query(
    "INSERT INTO styles (name, price, client_id) VALUES (?, ?, ?)",
    [name, price, client_id],
    (error, results) => {
      if (error) {
        console.error("Error executing query:", error); // Log the error
        return res.status(500).send(error);
      }
      
      // Fetch the newly added style details
      db.query(
        "SELECT * FROM styles WHERE id = LAST_INSERT_ID()",
        (error, newStyleResults) => {
          if (error) {
            console.error("Error fetching new style:", error); // Log the error
            return res.status(500).send(error);
          }

          // Check if new style details were fetched successfully
          if (newStyleResults.length > 0) {
            res.status(201).json(newStyleResults[0]); // Send the details of the newly added style
          } else {
            res.status(404).json({ message: 'Newly added style not found.' });
          }
        }
      );
    },
  );
});

// Update an existing style
router.put("/styles/:id", (req, res) => {
  // Extract data from request body
  const { name, price } = req.body;
  const styleId = req.params.id;
  // MySQL query to update a client
  db.query(
    "UPDATE styles SET name = ?, price = ? WHERE id = ?",
    [name, price, styleId],
    (error, results) => {
      if (error) {
        // handle error
        return res.status(500).send(error);
      }
      res.status(201).json({ message: `Style updated with ID: ${styleId}` });
    },
  );
});

// Delete a style
router.delete("/styles/:id", (req, res) => {
  // MySQL query to delete a style
  const styleId = req.params.id;
  db.query("DELETE FROM styles WHERE id = ?", [styleId], (error, results) => {
    if (error) {
      // handle error
      return res.status(500).send(error);
    }
    res.status(201).json({ message: `Style deleted with ID: ${styleId}` });
  });
});

// Fetch styles for a specific client
router.get("/styles/client/:clientId", (req, res) => {
  const clientId = req.params.clientId;
  const query = `
        SELECT styles.id, styles.name AS styleName, styles.price
        FROM styles
        WHERE styles.client_id = ?`;

  db.query(query, [clientId], (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

module.exports = router;
