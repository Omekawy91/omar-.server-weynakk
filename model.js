const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phoneNumber: { type: String, required: true },
  password: { type: String, required: true },
  otp: { type: String, default: null },
  otp_expires_at: { type: Date, default: null }
}, { timestamps: true });

const meetingSchema = new mongoose.Schema({
  meetingname: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  phoneNumbers: [{ type: String, required: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isPublic: { type: Boolean, default: false },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }
}, { timestamps: true });


const participantSchema = new mongoose.Schema({
  meeting_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approved: { type: Boolean, default: false }
}, { timestamps: true });

const movementSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
   location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  start_time: { type: Date, default: Date.now },
  end_time: { type: Date, default: null },
  status: { type: String, default: 'قيد التنفيذ' }
}, { timestamps: true });


const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Meeting = mongoose.model('Meeting', meetingSchema);
const Participant = mongoose.model('Participant', participantSchema);
const Movement = mongoose.model('Movement', movementSchema);
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { User, Meeting, Participant, Movement, Notification };




