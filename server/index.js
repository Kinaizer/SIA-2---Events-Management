require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const EventData = require('./model/events-data.model');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/events-db';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log(`Successfully connected to MongoDB database: events-db`);
    await seedInitialData();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Ensure MongoDB is running locally on port 27017.');
  });


async function seedInitialData() {
  try {
    const count = await EventData.countDocuments();
    if (count === 0) {
      console.log('Seeding initial school club events data...');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(14, 0, 0, 0);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 5);
      lastWeek.setHours(13, 0, 0, 0);

      const dummyEvents = [
        {
          title: 'Google I/O Extended Hackathon 2026',
          description: 'A 24-hour coding challenge focused on building solutions using Google Cloud, Vertex AI, and Flutter. Grand prizes await the winners!',
          schedule: tomorrow,
          venue: 'Tech Lab 3, Engineering Bldg',
          type: 'workshop',
          status: 'active',
          organizingClub: 'Google Developer Student Club',
          capacity: 80,
          attendanceList: []
        },
        {
          title: 'Introduction to React & Vite',
          description: 'An interactive seminar introducing modern web development concepts with React 19 and Vite. Perfect for beginners.',
          schedule: lastWeek,
          venue: 'Multimedia Room 102',
          type: 'seminar',
          status: 'completed',
          organizingClub: 'Computer Science Club',
          capacity: 100,
          attendanceList: [
            { studentId: '2024-10023', studentName: 'Alice Green', email: 'alice.g@school.edu', checkedInAt: lastWeek },
            { studentId: '2024-10149', studentName: 'Bob Carter', email: 'bob.c@school.edu', checkedInAt: lastWeek },
            { studentId: '2024-10255', studentName: 'Charlie Smith', email: 'charlie.s@school.edu', checkedInAt: lastWeek }
          ]
        },
        {
          title: 'AI Ethics & Future Prospects',
          description: 'A global webinar featuring keynote speakers from industry-leading AI research groups discussing the ethical implications of artificial intelligence.',
          schedule: nextWeek,
          venue: 'Zoom Meeting (Virtual)',
          type: 'webinar',
          status: 'active',
          organizingClub: 'AI Research Group',
          capacity: 500,
          attendanceList: []
        },
        {
          title: 'Coffee Painting & Charcoal Sketching workshop',
          description: 'A relaxing afternoon learning how to sketch with charcoal and paint using espresso coffee. Art supplies will be provided.',
          schedule: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
          venue: 'Fine Arts Room 101',
          type: 'workshop',
          status: 'drafted',
          organizingClub: 'Fine Arts Association',
          capacity: 25,
          attendanceList: []
        },
        {
          title: 'Inter-Club Basketball Championship',
          description: 'The annual inter-club sports championship, where club representatives face off on the court.',
          schedule: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
          venue: 'School Gymnasium',
          type: 'sports',
          status: 'postponed',
          organizingClub: 'Sports & Athletics Society',
          capacity: 200,
          attendanceList: []
        }
      ];

      await EventData.insertMany(dummyEvents);
      console.log('Seeded database with initial events successfully.');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
}


app.get('/api/events', async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const events = await EventData.find(filter).sort({ schedule: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Server error: unable to retrieve events', details: error.message });
  }
});


app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await EventData.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Server error: unable to retrieve event', details: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, description, schedule, venue, type, status, organizingClub, capacity } = req.body;
    if (!title || !schedule || !venue || !organizingClub) {
      return res.status(400).json({ error: 'Title, schedule, venue, and organizingClub are required fields.' });
    }

    const newEvent = new EventData({
      title,
      description,
      schedule: new Date(schedule),
      venue,
      type: type || 'seminar',
      status: status || 'drafted',
      organizingClub,
      capacity: capacity || 100,
      attendanceList: []
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Server error: unable to create event', details: error.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { title, description, schedule, venue, type, status, organizingClub, capacity } = req.body;

    const event = await EventData.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (schedule !== undefined) event.schedule = new Date(schedule);
    if (venue !== undefined) event.venue = venue;
    if (type !== undefined) event.type = type;
    if (status !== undefined) event.status = status;
    if (organizingClub !== undefined) event.organizingClub = organizingClub;
    if (capacity !== undefined) event.capacity = capacity;

    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Server error: unable to update event', details: error.message });
  }
});


app.delete('/api/events/:id', async (req, res) => {
  try {
    const deletedEvent = await EventData.findByIdAndDelete(req.params.id);
    if (!deletedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true, message: 'Event successfully deleted', deletedEvent });
  } catch (error) {
    res.status(500).json({ error: 'Server error: unable to delete event', details: error.message });
  }
});

app.post('/api/events/:id/attendance', async (req, res) => {
  try {
    const { studentId, studentName, email } = req.body;
    if (!studentId || !studentName) {
      return res.status(400).json({ error: 'studentId and studentName are required to register attendance.' });
    }

    const event = await EventData.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot record attendance for a cancelled event.' });
    }

    const isAlreadyCheckedIn = event.attendanceList.some(
      (record) => record.studentId.toLowerCase() === studentId.toLowerCase()
    );

    if (isAlreadyCheckedIn) {
      return res.status(409).json({
        error: 'Student already checked in for this event.',
        alreadyCheckedIn: true
      });
    }

    if (event.capacity && event.attendanceList.length >= event.capacity) {
      return res.status(400).json({ error: 'Event capacity has been reached.' });
    }
    const checkInRecord = {
      studentId,
      studentName,
      email: email || '',
      checkedInAt: new Date()
    };

    event.attendanceList.push(checkInRecord);
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully.',
      checkedIn: checkInRecord,
      eventSummary: {
        title: event.title,
        totalCheckedIn: event.attendanceList.length,
        capacity: event.capacity
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error: unable to process attendance check-in', details: error.message });
  }
});

app.get('/api/events/:id/attendance', async (req, res) => {
  try {
    const event = await EventData.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.json({
      eventId: event._id,
      title: event.title,
      attendanceList: event.attendanceList
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error: unable to retrieve attendance', details: error.message });
  }
});


app.delete('/api/events/:id/attendance/:studentId', async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const event = await EventData.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const index = event.attendanceList.findIndex(r => r.studentId === studentId);
    if (index === -1) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    event.attendanceList.splice(index, 1);
    await event.save();

    res.json({ success: true, message: 'Attendance record deleted successfully.', event });
  } catch (error) {
    res.status(500).json({ error: 'Server error: unable to delete attendance record', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
