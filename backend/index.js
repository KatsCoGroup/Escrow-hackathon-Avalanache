const express = require("express");
const { connectDB } = require("./config/db");
const morgan = require("morgan");
const cors = require("cors");

const app = express();

// Connect to MongoDB
connectDB();

// Initialize blockchain services
const { initializeContract } = require("./services/escrowContract");
const { startEventListener } = require("./services/escrowListener");

// Start contract interaction service
initializeContract();

// Start event listener service
startEventListener();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// Routes
const gigRouter = require("./routes/gig");
const userRouter = require("./routes/user");
const badgeRouter = require("./routes/badge");
const subscriptionRouter = require("./routes/subscription");
const statsRouter = require("./routes/stats");
const adminRouter = require("./routes/admin");

app.use("/api/gigs", gigRouter);
app.use("/api/users", userRouter);
app.use("/api/badges", badgeRouter);
app.use("/api/subscriptions", subscriptionRouter);
app.use("/api/stats", statsRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "ProjectX Backend is running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
