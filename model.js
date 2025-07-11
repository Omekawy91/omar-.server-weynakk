const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: { type: String, unique: true },
  otp: String,
  otp_expires_at: Date
});

const meetingSchema = new mongoose.Schema({
  meetingname: String,
  date: String,
  time: String,
  duration: { type: Number, default: 60 },
  phoneNumbers: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isPublic: Boolean,
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  invitations: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }],
  acceptedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

const movementSchema = new mongoose.Schema({
  meeting_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Meeting",
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  approved: {
    type: Boolean,
    default: false
  },
  location: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  status: {
    type: String,
    enum: ["on_the_way", "arrived", "waiting", "left"],
    default: "on_the_way"
  }
}, {
  timestamps: true
});

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String },
  message: { type: String, required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
  type: { type: String, enum: ["invitation", "update"], required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  delayMinutes: { type: Number, default: 0 }
});

const userMovementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  current_location: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  eta_minutes: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  hasMoved: { type: Boolean, default: false }
});

const groupMovementSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
  destination: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  users: [userMovementSchema]
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);
const Meeting = mongoose.model("Meeting", meetingSchema);
const Movement = mongoose.model("Movement", movementSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const GroupMovement = mongoose.model("GroupMovement", groupMovementSchema);

module.exports = { User, Meeting, Movement, Notification, GroupMovement };

