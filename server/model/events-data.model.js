const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  checkedInAt: {
    type: Date,
    default: Date.now
  }
});

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  schedule: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['seminar', 'webinar', 'workshop', 'meeting', 'social', 'sports', 'other'],
    default: 'seminar'
  },
  status: {
    type: String,
    required: true,
    enum: ['cancelled', 'active', 'postponed', 'completed', 'drafted'],
    default: 'drafted'
  },
  organizingClub: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    default: 100
  },
  attendanceList: [attendanceSchema]
}, {
  timestamps: true,
  collection: 'events-data' // Explicitly maps to user's database collection
});

module.exports = mongoose.model('EventData', eventSchema);
