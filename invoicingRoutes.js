// invoicingRoutes.js
const express = require("express");
const router = express.Router();
const db = require("./database");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const upload = multer({ dest: 'uploads/' }); // 'uploads' is the folder where files will be saved
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your email provider
  auth: {
      user: 'vikecah@gmail.com',
      pass: 'quyo tybb ylgv tsap'
  }
});

// Fetch all clients
router.get("/api/clients", (req, res) => {
    db.query("SELECT * FROM clients", (error, results) => {
        if (error) {
            console.error("Error fetching clients:", error);
            return res.status(500).send({ error: "Error fetching clients" });
        }
        res.json(results);
    });
});

// Fetch styles for a specific client
router.get("/api/styles/client/:clientId", (req, res) => {
    const clientId = req.params.clientId;
    const query = "SELECT * FROM styles WHERE client_id = ?";
    db.query(query, [clientId], (error, results) => {
        if (error) {
            console.error("Error fetching styles for client:", error);
            return res.status(500).send({ error: "Error fetching styles" });
        }
        res.json(results);
    });
});
// the above two routers are reused from clients and styles respectively with the idea of keeping architectural integrity in the invoicing routes file 





router.delete('/api/invoices/:id', (req, res) => {
    res.send('Got a DELETE request at /user')
    const targetPath = path.join(__dirname, "./uploads/", req.file.originalname);
    db.query("DELETE FROM clients WHERE id = ?")
})

router.post('/send-email', (req, res) => {
    const { to, subject, text, invoicePath } = req.body;
  
    // Read the file from the server's filesystem
    const filePath = path.join(__dirname, invoicePath); // Make sure the path is correct
  
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error('Error reading the invoice file:', err);
        return res.status(500).send('Error reading the invoice file');
      }
  
      const mailOptions = {
        from: 'vikecah@gmail.com',
        to: to,
        subject: subject,
        text: text,
        attachments: [
          {
            filename: path.basename(filePath), // The filename that will appear on the attachment
            content: data
          }
        ]
      };
  
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          res.status(500).send('Error sending email');
        } else {
          console.log('Email sent: ' + info.response);
          res.status(200).send('Email sent');
        }
      });
    });
  });

router.post('/upload-pdf', upload.single('pdf'), (req, res) => {
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, "./uploads/", req.file.originalname);

    // Move the file from temp path to target path
    fs.rename(tempPath, targetPath, err => {
        if (err) return res.status(500).send(err);

        // Send back the file path or name
        res.status(200).json({ 
            message: "File uploaded successfully!", 
            filePath: `/uploads/${req.file.originalname}` // Modify as needed
        });
    });
});

router.get("/")

router.get("/api/invoices", (req, res) => {
    let query;
    if (req.query.includeClientNames === 'true') {
        query = `
            SELECT i.invoice_number, i.final_total, c.name AS client_name, i.pdf_path
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
        `;
    } else {
        query = "SELECT * FROM invoices";
    }

    db.query(query, (error, results) => {
        if (error) {
            console.error("Error fetching invoices:", error);
            return res.status(500).send({ error: "Error fetching invoices" });
        }
        res.json(results);
    });
});

router.post("/api/invoices", (req, res) => {
    const {
        client_id,
        total_amount,
        vat_amount,
        discount_value = 0,
        discount_type = 'none',
        deposit1 = 0,
        deposit2 = 0,
        status = 'unpaid',
        notes = '',
        pdf_path
    } = req.body;

    let final_total = total_amount + vat_amount;

    if (discount_type === 'percent') {
        final_total -= (total_amount * (discount_value / 100));
    } else if (discount_type === 'fixed') {
        final_total -= discount_value;
    }

    let balance_due = final_total - deposit1 - deposit2;

    const insertQuery = `
        INSERT INTO invoices (client_id, total_amount, vat_amount, discount_value, discount_type, final_total, deposit1, deposit2, balance_due, status, notes, pdf_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(insertQuery, [client_id, total_amount, vat_amount, discount_value, discount_type, final_total, deposit1, deposit2, balance_due, status, notes, pdf_path], (error, results) => {
        if (error) {
            console.error('Error inserting invoice:', error);
            return res.status(500).send({ error: "Error inserting invoice" });
        }
        console.log("Invoice successfully inserted, ID:", results.insertId);
        res.status(201).json({ message: `Invoice added with ID: ${results.insertId}` });
    });
});




// Route to get the next invoice number
router.get("/api/getNextInvoiceNumber", async (req, res) => {
    try {
        const query = "SELECT MAX(invoice_number) AS maxInvoiceNumber FROM invoices";
        db.query(query, (error, results) => {
            if (error) {
                console.error("Error fetching the max invoice number:", error);
                return res.status(500).send({ error: "Error fetching the max invoice number" });
            }
            const nextInvoiceNumber = results[0].maxInvoiceNumber + 1;
            res.json({ nextInvoiceNumber });
        });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Getting the invoice status
router.get("/api/invoices/statuses", (req, res) => {
    db.query("SELECT invoice_number, status FROM invoices", (error, results) => {
        if (error) {
            console.error("Error fetching invoice statuses:", error);
            return res.status(500).send({ error: "Error fetching invoice statuses" });
        }
        res.json(results);
    });
});


// Router to post inv status 
router.post("/api/invoices/:invoiceNumber/updateStatus", (req, res) => {
    const invoiceNumber = req.params.invoiceNumber;
    const { status } = req.body;

    db.query("UPDATE invoices SET status = ? WHERE invoice_number = ?", [status, invoiceNumber], (error, results) => {
        if (error) {
            console.error('Error updating invoice status:', error);
            return res.status(500).send({ error: "Error updating invoice status" });
        }
        res.json({ message: `Status updated for invoice ${invoiceNumber}` });
    });
});



module.exports = router;
