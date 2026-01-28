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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// CORS configuration - allow frontend origins
const allowedOrigins = [
  'http://localhost:5173', // Vite default dev port
  'http://localhost:8080', // Vite v7 default port
  'http://127.0.0.1:8080', // localhost alternative
  'http://192.168.0.103:8080', // Network IP
  'http://localhost:3000',
  'http://localhost:4173', // Vite preview port
  'https://aura-link-front-end.vercel.app',
  'https://aura-link-front-end-ixrn.onrender.com',
  process.env.FRONTEND_URL // Allow custom frontend URL from env
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan("dev"));

// Routes
const gigRouter = require("./routes/gig");
const userRouter = require("./routes/user");
const badgeRouter = require("./routes/badge");
const subscriptionRouter = require("./routes/subscription");
const statsRouter = require("./routes/stats");
const adminRouter = require("./routes/admin");
const marketsRouter = require("./routes/markets");

app.use("/api/gigs", gigRouter);
app.use("/api/users", userRouter);
app.use("/api/badges", badgeRouter);
app.use("/api/subscriptions", subscriptionRouter);
app.use("/api/stats", statsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/markets", marketsRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "ProjectX Backend is running" });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0"; // bind to all interfaces for LAN access

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
