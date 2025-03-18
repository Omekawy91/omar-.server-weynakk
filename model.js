const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }, // مشفر
    otp: { type: String, default: null },
    otp_expires_at: { type: Date, default: null }
}, { timestamps: true }); // يضيف تلقائيًا createdAt و updatedAt

// Meeting Schema
const meetingSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    meeting_name: { type: String, required: true },
    meeting_datetime: { type: Date, required: true }, // دمج التاريخ والوقت معًا
    location: { type: String, default: null }
}, { timestamps: true });

// Meeting Participants Schema
const participantSchema = new mongoose.Schema({
    meeting_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approved: { type: Boolean, default: false }
}, { timestamps: true });

// Movements Schema
const movementSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target_location: {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date, default: null },
    status: { type: String, default: 'قيد التنفيذ' }
}, { timestamps: true });

// إضافة فهرس للموقع الجغرافي
movementSchema.index({ target_location: '2dsphere' });

const User = mongoose.model('User', userSchema);
const Meeting = mongoose.model('Meeting', meetingSchema);
const Participant = mongoose.model('Participant', participantSchema);
const Movement = mongoose.model('Movement', movementSchema);

module.exports = { User, Meeting, Participant, Movement };
