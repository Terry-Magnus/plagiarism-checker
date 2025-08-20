const express = require("express");
const plagiarismRoutes = require("./routes/PlagiarismRoutes");
const cors = require("cors");
const app = express();

require("dotenv").config();

// Enable CORS for the frontend origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allow only your React app
    methods: ["GET", "POST"], // Allow specific methods
    allowedHeaders: ["Content-Type"], // Allow specific headers
  })
);

app.use(express.json());
app.use(plagiarismRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));
