import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './main.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

export default function Main() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeNav, setActiveNav] = useState('view');

  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  const [formState, setFormState] = useState({
    title: '',
    description: '',
    schedule: '',
    venue: '',
    type: 'seminar',
    status: 'drafted',
    organizingClub: 'All Organization',
    capacity: 100
  });



  const fetchEvents = async (autoSelectId = null) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/events`);
      setEvents(res.data);
      setError(null);

      if (res.data.length > 0) {
        const currentId = autoSelectId || selectedEvent?._id;
        const matched = res.data.find(ev => ev._id === currentId);
        setSelectedEvent(matched || res.data[0]);
      } else {
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not connect to the backend server. Please verify it is running on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const totalEvents = events.length;
  const activeEvents = events.filter(e => e.status === 'active').length;
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const totalCheckedIn = events.reduce((sum, e) => sum + (e.attendanceList?.length || 0), 0);

  const handleOpenCreateTab = () => {
    setFormState({
      title: '',
      description: '',
      schedule: '',
      venue: '',
      type: 'seminar',
      status: 'drafted',
      organizingClub: 'All Organization',
      capacity: 100
    });
    setActiveNav('create');
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/events`, formState);
      setFormState({
        title: '',
        description: '',
        schedule: '',
        venue: '',
        type: 'seminar',
        status: 'drafted',
        organizingClub: 'All Organization',
        capacity: 100
      });
      setActiveNav('view');
      fetchEvents(res.data._id);
    } catch (err) {
      alert('Event creation failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenEditModal = (e, event) => {
    e.stopPropagation();

    const scheduleDate = new Date(event.schedule);
    const tzOffset = scheduleDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(scheduleDate - tzOffset)).toISOString().slice(0, 16);

    setFormState({
      title: event.title,
      description: event.description || '',
      schedule: localISOTime,
      venue: event.venue,
      type: event.type,
      status: event.status,
      organizingClub: event.organizingClub,
      capacity: event.capacity || 100
    });
    setEditingEventId(event._id);
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/events/${editingEventId}`, formState);
      setIsModalOpen(false);
      fetchEvents(editingEventId);
    } catch (err) {
      alert('Failed to save changes: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteEvent = async (e, eventId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this event? This will also remove all its attendance records.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/events/${eventId}`);
      if (selectedEvent?._id === eventId) {
        setSelectedEvent(null);
      }
      fetchEvents();
    } catch (err) {
      alert('Failed to delete event: ' + (err.response?.data?.error || err.message));
    }
  };



  const handleRemoveCheckIn = async (studentId) => {
    if (!window.confirm(`Are you sure you want to remove check-in for student: ${studentId}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/events/${selectedEvent._id}/attendance/${studentId}`);
      fetchEvents(selectedEvent._id);
    } catch (err) {
      alert('Failed to remove attendance: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  return (
    <div className="ems-container">
      <aside className="ems-sidebar">
        <div className="sidebar-logo">
          <h1>🎓 ClubEvent</h1>
          <p>School Events Management</p>
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => setActiveNav('view')}
            className={`sidebar-nav-item ${activeNav === 'view' ? 'active' : ''}`}
          >
            <span>📅</span> View Events
          </button>
          <button
            onClick={handleOpenCreateTab}
            className={`sidebar-nav-item ${activeNav === 'create' ? 'active' : ''}`}
          >
            <span>➕</span> Create Event
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-stat-box">
            <span className="stat-label">Total Events</span>
            <span className="stat-value">{totalEvents}</span>
          </div>
          <div className="sidebar-stat-box">
            <span className="stat-label">Checked-In Students</span>
            <span className="stat-value">{totalCheckedIn}</span>
          </div>
        </div>
      </aside>

      <main className="ems-main-content">
        <header className="ems-header">
          <div className="ems-header-title">
            <h2>{activeNav === 'view' ? 'Events Dashboard' : 'Create New Event'}</h2>
            <p>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </header>

        {error ? (
          <div className="no-events" style={{ borderColor: '#ef4444' }}>
            <div className="no-events-icon" style={{ color: '#ef4444' }}>⚠️</div>
            <h3>Backend Connection Error</h3>
            <p style={{ margin: '12px 0 24px', color: '#b91c1c' }}>{error}</p>
            <button onClick={() => fetchEvents()} className="btn-secondary">
              Retry Connection
            </button>
          </div>
        ) : activeNav === 'create' ? (
          <section className="create-event-container">
            <div className="create-event-card">
              <h2>Event Registration</h2>
              <p>Fill out the fields below to schedule a new student club event.</p>

              <form onSubmit={handleCreateEvent} className="creation-form">
                <div className="form-group form-group-full">
                  <label>Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Artificial Intelligence Seminar"
                    className="form-input"
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    placeholder="Provide details about the event, topics covered, or speaker list..."
                    className="form-input"
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Organizing Club</label>
                    <select
                      required
                      className="form-input"
                      value={formState.organizingClub}
                      onChange={(e) => setFormState({ ...formState, organizingClub: e.target.value })}
                    >
                      <option value="All Organization">All Organization</option>
                      <option value="ICPEP">ICPEP</option>
                      <option value="JPICE">JPICE</option>
                      <option value="MICRO-JPCS">MICRO-JPCS</option>
                      <option value="UAPSA">UAPSA</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Venue / Location</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Audio Visual Room 1"
                      className="form-input"
                      value={formState.venue}
                      onChange={(e) => setFormState({ ...formState, venue: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      className="form-input"
                      value={formState.schedule}
                      onChange={(e) => setFormState({ ...formState, schedule: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Event Type</label>
                    <select
                      className="form-input"
                      value={formState.type}
                      onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                    >
                      <option value="seminar">Seminar</option>
                      <option value="webinar">Webinar</option>
                      <option value="workshop">Workshop</option>
                      <option value="meeting">Meeting</option>
                      <option value="sports">Sports</option>
                      <option value="social">Social</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Initial Status</label>
                    <select
                      className="form-input"
                      value={formState.status}
                      onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                    >
                      <option value="drafted">Drafted</option>
                      <option value="active">Active</option>
                      <option value="postponed">Postponed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: '12px' }}>
                  <button type="button" onClick={() => setActiveNav('view')} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Event
                  </button>
                </div>
              </form>
            </div>
          </section>
        ) : (
          <>


            <div className="ems-workspace">
              <div className="events-column">
                <div className="events-column-header">
                  <h2>Events Catalog ({filteredEvents.length})</h2>

                  <div className="filters-wrapper">
                    <select
                      className="select-filter"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="seminar">Seminar</option>
                      <option value="webinar">Webinar</option>
                      <option value="workshop">Workshop</option>
                      <option value="meeting">Meeting</option>
                      <option value="sports">Sports</option>
                      <option value="social">Social</option>
                      <option value="other">Other</option>
                    </select>

                    <select
                      className="select-filter"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="drafted">Drafted</option>
                      <option value="completed">Completed</option>
                      <option value="postponed">Postponed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {loading && events.length === 0 ? (
                  <div className="no-events">Loading events list...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="no-events">
                    <div className="no-events-icon">🔎</div>
                    <h3>No Events Found</h3>
                    <p>Try resetting filters or register a new event.</p>
                  </div>
                ) : (
                  <div className="events-list">
                    {filteredEvents.map((event) => (
                      <div
                        key={event._id}
                        className={`event-card ${selectedEvent?._id === event._id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedEvent(event);
                        }}
                      >
                        <div className="event-card-header">
                          <div className="event-title-group">
                            <h2>{event.title}</h2>
                            <div className="event-club">{event.organizingClub}</div>
                          </div>

                          <div className="badges-group">
                            <span className="badge badge-type">{event.type}</span>
                            <span className={`badge badge-${event.status}`}>{event.status}</span>
                          </div>
                        </div>

                        <p className="event-desc">{event.description || 'No description provided.'}</p>

                        <div className="event-details-grid">
                          <div className="event-detail-item">
                            <span className="event-detail-icon">📅</span>
                            <span>{formatDateTime(event.schedule)}</span>
                          </div>
                          <div className="event-detail-item">
                            <span className="event-detail-icon">📍</span>
                            <span>{event.venue}</span>
                          </div>
                        </div>

                        <div className="event-actions">
                          {/* Attendees count removed */}

                          <div className="card-action-btns">
                            <button
                              onClick={(e) => handleOpenEditModal(e, event)}
                              className="btn-text-edit"
                              title="Edit Event"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => handleDeleteEvent(e, event._id)}
                              className="btn-text-delete"
                              title="Delete Event"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>


            </div>
          </>
        )}
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Event Details</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="form-group form-group-full">
                <label>Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Ethics Seminar"
                  className="form-input"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                />
              </div>

              <div className="form-group form-group-full">
                <label>Description</label>
                <textarea
                  rows="3"
                  placeholder="Provide an overview of the event..."
                  className="form-input"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Organizing Club</label>
                  <select
                    required
                    className="form-input"
                    value={formState.organizingClub}
                    onChange={(e) => setFormState({ ...formState, organizingClub: e.target.value })}
                  >
                    <option value="All Organization">All Organization</option>
                    <option value="ICPEP">ICPEP</option>
                    <option value="JPICE">JPICE</option>
                    <option value="MICRO-JPCS">MICRO-JPCS</option>
                    <option value="UAPSA">UAPSA</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Venue / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audio Visual Room 2"
                    className="form-input"
                    value={formState.venue}
                    onChange={(e) => setFormState({ ...formState, venue: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={formState.schedule}
                    onChange={(e) => setFormState({ ...formState, schedule: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event Type</label>
                  <select
                    className="form-input"
                    value={formState.type}
                    onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                  >
                    <option value="seminar">Seminar</option>
                    <option value="webinar">Webinar</option>
                    <option value="workshop">Workshop</option>
                    <option value="meeting">Meeting</option>
                    <option value="sports">Sports</option>
                    <option value="social">Social</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Event Status</label>
                  <select
                    className="form-input"
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                  >
                    <option value="drafted">Drafted</option>
                    <option value="active">Active</option>
                    <option value="postponed">Postponed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
