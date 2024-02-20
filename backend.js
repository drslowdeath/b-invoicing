const express = require("express");
const path = require("path");
const cors = require("cors");
const clientsRoutes = require("./clientsRoutes");
const stylesRoutes = require("./stylesRoutes");
const invoicingRoutes = require("./invoicingRoutes");
//eslint-disable-next-line
const connection = require("./database"); // Import the database connection. Even though it is not used in the code its still necessary to import the db connection here. 
const app = express();
//eslint-disable-next-line
const port = process.env.PORT || 5002;

app.use(express.json());
app.use(cors());
//eslint-disable-next-line
app.use(express.static(path.join(__dirname)));
// Serve static files from 'uploads' directory
//eslint-disable-next-line
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the public directory
//eslint-disable-next-line
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from 'uploads' directory
//eslint-disable-next-line
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve index.html on the root route
app.get("/", (req, res) => {
//eslint-disable-next-line
  res.sendFile(path.join(__dirname, "index.html"));
});

// Using the route modules
app.use(clientsRoutes);
app.use(stylesRoutes);
app.use(invoicingRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
