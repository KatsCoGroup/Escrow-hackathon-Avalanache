const express = require("express");
const { connectDB, supabase } = require("./config/db");
const morgan = require("morgan");

const app = express();

// Middleware
app.use(express.json());
app.use(morgan("dev"));

// Routes
const gigRouter = require("./routes/gig");
app.use("/api/gigs", gigRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
