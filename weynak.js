require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const cors = require("cors");
const asyncHandler = require("express-async-handler");
const { User, Meeting, Participant, Movement, Notification } = require("./model");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("Database connection error:", err);
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access Denied!" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid Token" });
  }
};

app.post("/register", asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required!" });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Email already registered!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.json({ message: "User registered successfully!" });
  } catch (error) {
    res.json(error);
  }
}));

app.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "All fields are required!" });

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) return res.status(401).json({ message: "Invalid email or password" });

  const validPassword = await bcrypt.compare(password.trim(), user.password);
  if (!validPassword) return res.status(401).json({ message: "Invalid email or password" });

  const token = generateToken(user);
  res.json({ token });
}));

app.post("/forgot-password", asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required!" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const user = await User.findOneAndUpdate(
    { email },
    { otp, otp_expires_at: Date.now() + 15 * 60 * 1000 },
    { new: true }
  );

  if (!user) return res.status(404).json({ message: "Email not found!" });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Code",
    text: Your password reset code is: ${otp},
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    res.json({ message: "OTP sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error sending email!", error: error.message });
  }
}));

app.post("/reset-password", asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: "All fields are required!" });

  const user = await User.findOne({ email, otp });
  if (!user) return res.status(400).json({ message: "Invalid OTP!" });

  if (user.otp_expires_at < Date.now()) {
    return res.status(400).json({ message: "OTP has expired!" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.otp = null;
  user.otp_expires_at = null;
  await user.save();

  res.json({ message: "Password reset successfully!" });
}));

app.get('/', (req, res) => {
  res.send("Welcome to the Home Page!");
});

app.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully!" });
});

app.post("/notifications", asyncHandler(async (req, res) => {
  const notification = new Notification(req.body);
  const saved = await notification.save();
  res.status(201).json(saved);
}));

app.get("/notifications/:userId", asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.params.userId });
  res.json(notifications);
}));

app.put("/notifications/:id", asyncHandler(async (req, res) => {
  const updated = await Notification.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json(updated);
}));

app.listen(port, () => {
  console.log(Server running on http://localhost:${port});
});

app.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(Port ${port} is already in use);
    process.exit(1);
  } else {
    console.error("Server error:", err);
  }
});





