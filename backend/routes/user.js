const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Gig = require("../models/Gig");

/**
 * Get or create user profile
 * POST /api/users/profile
 */
router.post("/profile", async (req, res) => {
  try {
    const { address, displayName, bio, profileImage, skills, username } = req.body;

    // Validate wallet address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username format" });
    }

    let user = await User.findOne({ address: address.toLowerCase() });

    // Enforce unique username if provided
    if (username) {
      const existingUsername = await User.findOne({ username: username.toLowerCase(), address: { $ne: address.toLowerCase() } });
      if (existingUsername) {
        return res.status(409).json({ success: false, message: "Username already taken" });
      }
    }

    if (!user) {
      user = new User({
        address: address.toLowerCase(),
        displayName: displayName || "",
        bio: bio || "",
        profileImage: profileImage || "",
        skills: Array.isArray(skills) ? skills : [],
        username: username ? username.toLowerCase() : undefined,
      });
      await user.save();
    } else {
      // Update profile if provided
      if (displayName) user.displayName = displayName;
      if (bio) user.bio = bio;
      if (profileImage) user.profileImage = profileImage;
      if (Array.isArray(skills)) user.skills = skills;
      if (username) user.username = username.toLowerCase();
      await user.save();
    }

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Error in /profile:", error);
    res.status(500).json({
      success: false,
      message: "Error managing profile",
      error: error.message,
    });
  }
});

// Helper to validate address
const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address || "");

// Helper to find user or 404
const findUserByAddress = async (address, res) => {
  if (!isValidAddress(address)) {
    res.status(400).json({ success: false, message: "Invalid wallet address" });
    return null;
  }
  const user = await User.findOne({ address: address.toLowerCase() });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return null;
  }
  return user;
};

/**
 * Request skill verification
 * POST /api/users/skills/request
 * body: { address, skill }
 */
router.post("/skills/request", async (req, res) => {
  try {
    const { address, skill } = req.body;
    if (!skill || typeof skill !== "string" || !skill.trim()) {
      return res.status(400).json({ success: false, message: "Skill is required" });
    }

    const user = await findUserByAddress(address, res);
    if (!user) return;

    const normalized = skill.trim();
    // ensure skill list contains the claimed skill
    if (!user.skills.includes(normalized)) {
      user.skills.push(normalized);
    }

    const existing = user.skillRequests.find((s) => s.name.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      existing.status = "pending";
      existing.requestedAt = new Date();
      existing.reviewerNote = "";
    } else {
      user.skillRequests.push({ name: normalized, status: "pending", source: "self" });
    }

    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error in POST /skills/request", error);
    res.status(500).json({ success: false, message: "Error requesting skill verification" });
  }
});

/**
 * Approve or reject a skill
 * POST /api/users/skills/approve
 * body: { address, skill, status, reviewerNote }
 */
router.post("/skills/approve", async (req, res) => {
  try {
    const { address, skill, status = "approved", reviewerNote = "" } = req.body;
    if (!skill || typeof skill !== "string") {
      return res.status(400).json({ success: false, message: "Skill is required" });
    }
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const user = await findUserByAddress(address, res);
    if (!user) return;

    const normalized = skill.trim();
    let entry = user.skillRequests.find((s) => s.name.toLowerCase() === normalized.toLowerCase());
    if (!entry) {
      entry = { name: normalized, status: "pending", source: "admin" };
      user.skillRequests.push(entry);
    }
    entry.status = status;
    entry.reviewedAt = new Date();
    entry.reviewerNote = reviewerNote;

    // If approved, ensure skill exists in list
    if (status === "approved" && !user.skills.includes(normalized)) {
      user.skills.push(normalized);
    }

    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error in POST /skills/approve", error);
    res.status(500).json({ success: false, message: "Error updating skill status" });
  }
});

/**
 * Create project (pending by default)
 * POST /api/users/projects
 * body: { address, title, stack, skills: [] }
 */
router.post("/projects", async (req, res) => {
  try {
    const { address, title, stack = "", skills = [] } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ success: false, message: "Project title is required" });
    }

    const user = await findUserByAddress(address, res);
    if (!user) return;

    const cleanSkills = Array.isArray(skills)
      ? skills.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean).slice(0, 20)
      : [];

    user.projects.push({ title: title.trim(), stack: stack || "", skills: cleanSkills });
    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error in POST /projects", error);
    res.status(500).json({ success: false, message: "Error creating project" });
  }
});

/**
 * Approve or reject a project
 * POST /api/users/projects/approve
 * body: { address, projectId, status, reviewerNote }
 */
router.post("/projects/approve", async (req, res) => {
  try {
    const { address, projectId, status = "approved", reviewerNote = "" } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const user = await findUserByAddress(address, res);
    if (!user) return;

    const project = user.projects.id(projectId) || user.projects.find((p) => String(p._id) === String(projectId));
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.status = status;
    project.reviewerNote = reviewerNote;
    project.updatedAt = new Date();

    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error in POST /projects/approve", error);
    res.status(500).json({ success: false, message: "Error updating project status" });
  }
});

/**
 * Update user skills only
 * POST /api/users/skills
 */
router.post("/skills", async (req, res) => {
  try {
    const { address, skills } = req.body;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }

    if (!Array.isArray(skills)) {
      return res.status(400).json({ success: false, message: "Skills must be an array" });
    }

    const sanitizedSkills = skills
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s.length > 0)
      .slice(0, 50); // cap list size

    const user = await User.findOneAndUpdate(
      { address: address.toLowerCase() },
      { $set: { skills: sanitizedSkills } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("Error in /skills:", error);
    res.status(500).json({ success: false, message: "Error updating skills", error: error.message });
  }
});

/**
 * Rate a user (stores average, not mocked)
 * POST /api/users/rate
 * body: { address, score (1-5) }
 */
router.post("/rate", async (req, res) => {
  try {
    const { address, score } = req.body;
    const parsedScore = Number(score);

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }

    if (!parsedScore || parsedScore < 1 || parsedScore > 5) {
      return res.status(400).json({ success: false, message: "Score must be between 1 and 5" });
    }

    const user = await User.findOne({ address: address.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const newCount = (user.ratingCount || 0) + 1;
    const newAverage = ((user.rating || 0) * (user.ratingCount || 0) + parsedScore) / newCount;

    user.rating = Number(newAverage.toFixed(2));
    user.ratingCount = newCount;

    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error rating user:", error);
    res.status(500).json({ success: false, message: "Error saving rating" });
  }
});

/**
 * Get user by address
 * GET /api/users/:address
 */
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const user = await User.findOne({ address: address.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Error in GET /:address:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
});

/**
 * Get user's applied gigs
 * GET /api/users/:address/applied
 */
router.get("/:address/applied", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const gigs = await Gig.find({
      "applications.workerId": address.toLowerCase(),
    });

    res.json({
      success: true,
      appliedGigs: gigs,
      count: gigs.length,
    });
  } catch (error) {
    console.error("Error in GET /:address/applied:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applied gigs",
      error: error.message,
    });
  }
});

/**
 * Get user's posted gigs
 * GET /api/users/:address/gigs
 */
router.get("/:address/gigs", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const gigs = await Gig.find({
      employer: address.toLowerCase(),
    });

    res.json({
      success: true,
      postedGigs: gigs,
      count: gigs.length,
    });
  } catch (error) {
    console.error("Error in GET /:address/gigs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posted gigs",
      error: error.message,
    });
  }
});

/**
 * Get user's completed work
 * GET /api/users/:address/completed
 */
router.get("/:address/completed", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const completedGigs = await Gig.find({
      worker: address.toLowerCase(),
      status: "COMPLETED",
    });

    res.json({
      success: true,
      completedGigs: completedGigs,
      count: completedGigs.length,
    });
  } catch (error) {
    console.error("Error in GET /:address/completed:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching completed gigs",
      error: error.message,
    });
  }
});

module.exports = router;
