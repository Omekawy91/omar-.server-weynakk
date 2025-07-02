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
  duration: {
    type: Number,
    default: 60
  },
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


const participantSchema = new mongoose.Schema({
  meeting_id: mongoose.Schema.Types.ObjectId,
  user_id: mongoose.Schema.Types.ObjectId,
  approved: Boolean
});

const locationSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: [true, "Latitude is required"],
    min: [-90, "Latitude must be between -90 and 90"],
    max: [90, "Latitude must be between -90 and 90"]
  },
  lng: {
    type: Number,
    required: [true, "Longitude is required"],
    min: [-180, "Longitude must be between -180 and 180"],
    max: [180, "Longitude must be between -180 and 180"]
  }
});

const movementSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true
    },
    location: {
      type: locationSchema,
      required: [true, "Location is required"]
    },
    status: {
      type: String,
      enum: {
        values: ["on_the_way", "arrived", "waiting", "left"],
        message: "Invalid status value"
      },
      default: "on_the_way"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Movement", movementSchema);


const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
  type: { type: String, enum: ["invitation",  "update"], required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", ], default: "pending" },
  delayMinutes: { type: Number, default: 0 }
});



const User = mongoose.model("User", userSchema);
const Meeting = mongoose.model("Meeting", meetingSchema);
const Participant = mongoose.model("Participant", participantSchema);
const Movement = mongoose.model("Movement", movementSchema);
const Notification = mongoose.model("Notification", notificationSchema);


module.exports = { User, Meeting, Participant, Movement, Notification };
