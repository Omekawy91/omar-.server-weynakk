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

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.REFRESH_SECRET,
    { expiresIn: "30d" }
  );
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: "Access Denied!" });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Access Denied!" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Unauthorized access" });
  }
};

app.post("/refresh-token", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "Refresh token is required" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const newAccessToken = generateAccessToken(decoded);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Invalid refresh token" });
  }
}));

app.post("/register", asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  const userExists = await User.findOne({ $or: [{ email: email.trim().toLowerCase() }, { phone: phone.trim() }] });
  if (userExists) return res.status(400).json({ message: "Email or phone already registered!" });

  const hashedPassword = await bcrypt.hash(password.trim(), 10);
  const newUser = new User({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    phone: phone.trim()
  });

  await newUser.save();
  res.status(201).json({ message: "User registered successfully" });
}));

app.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "All fields are required!" });

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) return res.status(401).json({ message: "Invalid email or password" });

  const validPassword = await bcrypt.compare(password.trim(), user.password);
  if (!validPassword) return res.status(401).json({ message: "Invalid email or password" });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(200).json({
    message: "Login successful",
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone
    }
  });
}));

app.post("/forgot-password", asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required!" });

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) return res.status(404).json({ message: "Email not found!" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otp_expires_at = Date.now() + 15 * 60 * 1000;
  await user.save();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Code",
    text: `Your password reset code is: ${otp}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error sending email!", error: error.message });
  }
}));

app.post("/reset-password", asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: "All fields are required!" });

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user || user.otp !== otp) return res.status(400).json({ message: "Invalid OTP!" });
  if (user.otp_expires_at < Date.now()) return res.status(400).json({ message: "OTP has expired!" });

  const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
  user.password = hashedPassword;
  user.otp = null;
  user.otp_expires_at = null;
  await user.save();

  res.status(200).json({ message: "Password reset successfully!" });
}));

app.get("/", (req, res) => {
  res.send("welcome to sever ");
});

app.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully!" });
});


app.get("/notifications", authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const notifications = await Notification.find({ userId });
  res.json(notifications);
}));


app.post("/notifications/delete", authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id;

  const notification = await Notification.findOne({ _id: id, userId });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found or unauthorized" });
  }

  await Notification.deleteOne({ _id: id, userId });

  res.status(200).json({ message: "Notification deleted successfully" });
}));


app.post("/notifications/respond", authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { meetingId, response } = req.body; 

    if (!meetingId) return res.status(400).json({ message: "Meeting ID is required" });

    const notification = await Notification.findOne({
      meetingId,
      userId: req.user.id,
      type: "invitation"
    });

    if (!notification) {
      return res.status(404).json({ message: "Invitation not found for this user" });
    }

    if (!["accepted", "rejected"].includes(response)) {
      return res.status(400).json({ message: "Invalid response" });
    }

    notification.status = response;
    await notification.save();

    if (response === "accepted") {
      const alreadyJoined = await Participant.findOne({
        meeting_id: notification.meetingId,
        user_id: req.user.id
      });

      if (!alreadyJoined) {
        await Participant.create({
          meeting_id: notification.meetingId,
          user_id: req.user.id,
          approved: true
        });
      }
    }

    const allNotifications = await Notification.find({ meetingId });
    const accepted = allNotifications.filter(n => n.status === "accepted").length;
    const rejected = allNotifications.filter(n => n.status === "rejected").length;
    const total = allNotifications.length;

    const meeting = await Meeting.findById(meetingId);
    if (rejected / total > 0.5 && meeting && meeting.createdBy) {
      await Notification.create({
        userId: meeting.createdBy,
        title: "Too Many Rejections",
        message: `More than 50% of invitees rejected the meeting.`,
        meetingId: meeting._id,
        type: "update",
        status: "pending"
      });
    }

    res.status(200).json({
      message: `Invitation ${response}`,
      accepted,
      rejected
    });

  } catch (error) {
    console.error("Error in /notifications/respond:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
}));



app.post("/meetings", authenticateToken, asyncHandler(async (req, res) => {
  const { meetingname, date, time, phoneNumbers, isPublic, lat, lng } = req.body;

  if (!lat || !lng) return res.status(400).json({ message: "Location (lat, lng) is required" });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const meeting = new Meeting({
      meetingname,
      date,
      time,
      phoneNumbers,
      createdBy: req.user.id,
      isPublic,
      location: { lat: Number(lat), lng: Number(lng) }
    });

    await meeting.save({ session });

if (phoneNumbers && phoneNumbers.length > 0) {
  const phonesArray = Array.isArray(phoneNumbers) ? phoneNumbers : phoneNumbers.split(',').map(p => p.trim());
  const invitedUsers = await User.find({ phone: { $in: phonesArray } }).session(session);

  meeting.invitations = invitedUsers.map(user => ({
    userId: user._id,
    status: 'pending'
  }));

  await Promise.all(invitedUsers.map(async (user) => {
    const notification = new Notification({
      userId: user._id,
      title: "Meeting Invitation",
     message: `${req.user.name} invited you to ${meeting.meetingname}`,

      meetingId: meeting._id,
      type: "invitation",
      status: "pending"
    });
    await notification.save({ session });
  }));
}

    await session.commitTransaction();
    res.status(201).json(meeting);

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: "Failed to create meeting", error: error.message });
  } finally {
    session.endSession();
  }
}));

app.post("/meetings/details", authenticateToken, asyncHandler(async (req, res) => {
  const { meetingId } = req.body;

  if (!meetingId) return res.status(400).json({ message: "Meeting id is required in body" });

  const meeting = await Meeting.findById(meetingId).lean();
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });

  const populatedNotifications = await Notification.find({ meetingId })
    .populate("userId", "name")
    .lean();

  const invitations = populatedNotifications.map(n => ({
    name: n.userId?.name || "Unknown",
    status: n.status
  }));

 const location = meeting.location ? {
  address: meeting.location.address || null
} : { address: null };

const { phoneNumbers, ...meetingWithoutPhones } = meeting;

res.status(200).json({
  ...meetingWithoutPhones,
  location,
  invitations
});
}));

app.get("/my-meetings", authenticateToken, asyncHandler(async (req, res) => {
  console.log("Current User ID:", req.user.id); // تأكيد
  const meetings = await Meeting.find({
    $or: [
      { createdBy: req.user.id },
      { acceptedUsers: req.user.id }
    ]
  });

  res.status(200).json(meetings);
}));

  
app.post("/meetings/delete", authenticateToken, asyncHandler(async (req, res) => {
  const { meetingId } = req.body;
  const userId = req.user.id;

  const meeting = await Meeting.findOne({ _id: meetingId, createdBy: userId });
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found or unauthorized" });
  }

  await Meeting.deleteOne({ _id: meetingId });
  await Notification.deleteMany({ meetingId });

  res.status(200).json({ message: "Meeting and related notifications deleted successfully" });
}));


app.get("/meetings/user", authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const meetings = await Meeting.find({
    $or: [ { createdBy: userId }, { members: userId } ]
  });
  res.json(meetings);
}));

app.patch("/meetings/:id/privacy", authenticateToken, asyncHandler(async (req, res) => {
  const { isPublic } = req.body;
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });
  if (meeting.createdBy.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

  meeting.isPublic = isPublic;
  await meeting.save();

  res.json({ message: "Privacy updated", meeting });
}));

app.post("/participants", authenticateToken, asyncHandler(async (req, res) => {
  const { meeting_id } = req.body;
  if (!meeting_id) return res.status(400).json({ message: "Meeting ID is required" });

  const participantExists = await Participant.findOne({ meeting_id, user_id: req.user.id });
  if (participantExists) return res.status(400).json({ message: "Already joined this meeting" });

  const participant = new Participant({ meeting_id, user_id: req.user.id, approved: false });
  await participant.save();
  res.status(201).json({ message: "Joined meeting successfully", participant });
}));

app.post("/movements", asyncHandler(async (req, res) => {
  const { user_id, lat, lng } = req.body;
  const movement = new Movement({ user_id, location: { lat, lng }, status: "في الطريق" });
  await movement.save();
  res.json(movement);
}));

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use`);
    process.exit(1);
  } else {
    console.error("Server error:", err);
  }
});
