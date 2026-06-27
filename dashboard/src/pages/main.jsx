import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './main.css';

const API_BASE = 'http://localhost:5001/api';

export default function Main() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'integration'
  
  // Filter states
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingEventId, setEditingEventId] = useState(null);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    schedule: '',
    venue: '',
    type: 'seminar',
    status: 'drafted',
    organizingClub: '',
    capacity: 100
  });

  // Attendance simulation states
  const [simName, setSimName] = useState('');
  const [simId, setSimId] = useState('');
  const [simEmail, setSimEmail] = useState('');
  const [simAlert, setSimAlert] = useState(null); // { type: 'success'|'error'|'warning', message: '' }

  // Fetch events from API
  const fetchEvents = async (autoSelectId = null) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/events`);
      setEvents(res.data);
      setError(null);

      // Auto-update selected event if it exists in the new list, or select first if none selected
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

  // Filter events based on dropdown selections
  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    return matchesType && matchesStatus;
  });

  // KPI calculations
  const totalEvents = events.length;
  const activeEvents = events.filter(e => e.status === 'active').length;
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const totalCheckedIn = events.reduce((sum, e) => sum + (e.attendanceList?.length || 0), 0);

  // Handle open create event modal
  const handleOpenCreate = () => {
    setFormState({
      title: '',
      description: '',
      schedule: '',
      venue: '',
      type: 'seminar',
      status: 'drafted',
      organizingClub: '',
      capacity: 100
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Handle open edit event modal
  const handleOpenEdit = (e, event) => {
    e.stopPropagation(); // Avoid triggering card selection
    
    // Format date local ISO string for datetime-local input
    const scheduleDate = new Date(event.schedule);
    const tzOffset = scheduleDate.getTimezoneOffset() * 60000; // offset in milliseconds
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
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Handle delete event
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

  // Handle submit form (Create or Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const res = await axios.post(`${API_BASE}/events`, formState);
        setIsModalOpen(false);
        fetchEvents(res.data._id);
      } else {
        await axios.put(`${API_BASE}/events/${editingEventId}`, formState);
        setIsModalOpen(false);
        fetchEvents(editingEventId);
      }
    } catch (err) {
      alert('Form submission failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Handle simulation check-in
  const handleSimulateCheckIn = async (e) => {
    e.preventDefault();
    if (!simId || !simName) {
      setSimAlert({ type: 'error', message: 'Student ID and Student Name are required.' });
      return;
    }

    setSimAlert(null);
    try {
      const res = await axios.post(`${API_BASE}/events/${selectedEvent._id}/attendance`, {
        studentId: simId,
        studentName: simName,
        email: simEmail
      });

      setSimAlert({ type: 'success', message: res.data.message });
      setSimId('');
      setSimName('');
      setSimEmail('');
      
      // Refresh event list to show check-in immediately
      fetchEvents(selectedEvent._id);
    } catch (err) {
      const status = err.response?.status;
      const errMsg = err.response?.data?.error || err.message;
      if (status === 409) {
        setSimAlert({ type: 'warning', message: errMsg });
      } else {
        setSimAlert({ type: 'error', message: errMsg });
      }
    }
  };

  // Remove attendance record
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

  // Utility: format Date beautifully
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

  // Copy API endpoint
  const copyEndpointUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('API URL copied to clipboard!');
  };

  return (
    <div className="ems-app">
      {/* Top Header */}
      <header className="ems-header">
        <div className="ems-logo-section">
          <h1>
            <span role="img" aria-label="school-icon">🎓</span> 
            ClubEvent Manager
          </h1>
          <p>School Clubs Event Management & Attendance System</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary">
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span> Create Event
        </button>
      </header>

      {/* KPI Stats */}
      <section className="ems-kpis">
        <div className="kpi-card">
          <div className="kpi-icon-container">📅</div>
          <div className="kpi-info">
            <h3>Total Events</h3>
            <div className="kpi-value">{totalEvents}</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-container" style={{ color: '#10b981' }}>⚡</div>
          <div className="kpi-info">
            <h3>Active Events</h3>
            <div className="kpi-value">{activeEvents}</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-container" style={{ color: '#3b82f6' }}>✅</div>
          <div className="kpi-info">
            <h3>Completed</h3>
            <div className="kpi-value">{completedEvents}</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-container" style={{ color: '#ec4899' }}>👥</div>
          <div className="kpi-info">
            <h3>Total Attendance</h3>
            <div className="kpi-value">{totalCheckedIn}</div>
          </div>
        </div>
      </section>

      {/* Main Workspace Area */}
      {error ? (
        <div className="no-events" style={{ borderColor: '#ef4444' }}>
          <div className="no-events-icon" style={{ color: '#ef4444' }}>⚠️</div>
          <h2>Backend Connection Error</h2>
          <p style={{ margin: '12px 0 24px', color: '#f87171' }}>{error}</p>
          <button onClick={() => fetchEvents()} className="btn-secondary">Retry Connection</button>
        </div>
      ) : (
        <div className="ems-workspace">
          
          {/* Left: Events List Column */}
          <div className="events-column">
            <div className="events-column-header">
              <h2>Events ({filteredEvents.length})</h2>
              
              {/* Filtering Controls */}
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
              <div className="no-events">Loading events...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="no-events">
                <div className="no-events-icon">🔎</div>
                <h3>No Events Found</h3>
                <p>Try resetting the filters or create a new event to get started.</p>
              </div>
            ) : (
              <div className="events-list">
                {filteredEvents.map((event) => (
                  <div 
                    key={event._id} 
                    className={`event-card ${selectedEvent?._id === event._id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedEvent(event);
                      setSimAlert(null);
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
                      <div className="attendance-count-summary">
                        <span>👥 Checked In:</span>
                        <strong>{event.attendanceList?.length || 0} / {event.capacity || 100}</strong>
                      </div>

                      <div className="card-action-btns">
                        <button 
                          onClick={(e) => handleOpenEdit(e, event)}
                          className="btn-icon" 
                          title="Edit Event"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={(e) => handleDeleteEvent(e, event._id)}
                          className="btn-icon btn-icon-danger" 
                          title="Delete Event"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Selected Event Details & Attendance / Integration Panel */}
          <div className="detail-column">
            {selectedEvent ? (
              <div className="detail-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-type">{selectedEvent.type}</span>
                  <span className={`badge badge-${selectedEvent.status}`}>{selectedEvent.status}</span>
                </div>
                
                <h3 className="detail-panel-title">{selectedEvent.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                  Organized by <strong>{selectedEvent.organizingClub}</strong>
                </p>

                {/* Tab Navigation */}
                <div className="tab-nav">
                  <button 
                    className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('attendance')}
                  >
                    Attendance ({selectedEvent.attendanceList?.length || 0})
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'integration' ? 'active' : ''}`}
                    onClick={() => setActiveTab('integration')}
                  >
                    API Connection / Integration
                  </button>
                </div>

                {/* TAB CONTENT: Attendance List */}
                {activeTab === 'attendance' && (
                  <div className="attendance-tab-content">
                    {/* Simulated External Scanner */}
                    <div className="simulation-box">
                      <h4 style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: '600' }}>
                        🔗 Simulate External Attendance Scanner
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
                        Type student details below to simulate a check-in request from an RFID/barcode scanner API client.
                      </p>

                      <form onSubmit={handleSimulateCheckIn} className="sim-input-group">
                        <input 
                          type="text" 
                          placeholder="Student ID (e.g. 2026-0041)"
                          className="sim-input"
                          value={simId}
                          onChange={(e) => setSimId(e.target.value)}
                        />
                        <input 
                          type="text" 
                          placeholder="Student Name (e.g. Timothy Smith)"
                          className="sim-input"
                          value={simName}
                          onChange={(e) => setSimName(e.target.value)}
                        />
                        <input 
                          type="email" 
                          placeholder="Email Address (Optional)"
                          className="sim-input"
                          value={simEmail}
                          onChange={(e) => setSimEmail(e.target.value)}
                        />
                        
                        <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '12.5px', justifyContent: 'center' }}>
                          Simulate Scanner Scan
                        </button>
                      </form>

                      {simAlert && (
                        <div className={`sim-alert sim-alert-${simAlert.type}`}>
                          {simAlert.type === 'success' ? '✅' : simAlert.type === 'warning' ? '⚠️' : '❌'} {simAlert.message}
                        </div>
                      )}
                    </div>

                    {/* Attendance Logs */}
                    <div>
                      <h4 style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: '600' }}>
                        Attendance Records
                      </h4>

                      {!selectedEvent.attendanceList || selectedEvent.attendanceList.length === 0 ? (
                        <div className="empty-attendance-text">
                          No students checked in yet. Scan above or integrate an external attendance system to record check-ins.
                        </div>
                      ) : (
                        <div className="attendance-list-container">
                          {selectedEvent.attendanceList.map((record) => (
                            <div key={record.studentId} className="attendance-item">
                              <div className="student-info">
                                <h4>{record.studentName}</h4>
                                <p>ID: {record.studentId} {record.email ? `• ${record.email}` : ''}</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="checked-in-time">
                                  {new Date(record.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <button 
                                  onClick={() => handleRemoveCheckIn(record.studentId)}
                                  className="btn-icon btn-icon-danger"
                                  style={{ width: '28px', height: '28px', fontSize: '12px' }}
                                  title="Delete Record (Check-out)"
                                >
                                  ❌
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: Integration details */}
                {activeTab === 'integration' && (
                  <div className="integration-tab-content">
                    <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      You can easily connect external attendance devices (RFID readers, barcode scanners, or student portals) to this system. Call this endpoint when a student scans their card:
                    </p>

                    <div className="integration-card">
                      <h4>1. REST Endpoint URL</h4>
                      <div className="endpoint-url">
                        <span>{`${API_BASE}/events/${selectedEvent._id}/attendance`}</span>
                        <button 
                          onClick={() => copyEndpointUrl(`${API_BASE}/events/${selectedEvent._id}/attendance`)}
                          className="copy-btn"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="integration-card">
                      <h4>2. Expected POST Payload (JSON)</h4>
                      <pre className="code-snippet" style={{ color: '#34d399' }}>
{`{
  "studentId": "2026-1025",
  "studentName": "Alex Rivera",
  "email": "alex.rivera@school.edu"
}`}
                      </pre>
                    </div>

                    <div className="integration-card">
                      <h4>3. Example Terminal Test (cURL)</h4>
                      <pre className="code-snippet">
{`curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"studentId":"2026-1025","studentName":"Alex Rivera"}' \\
  "${API_BASE}/events/${selectedEvent._id}/attendance"`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="detail-panel-placeholder">
                <div className="placeholder-icon">📋</div>
                <h3>Select an Event</h3>
                <p>Choose an event from the list to view attendee logs, configuration details, or connect external attendance clients.</p>
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* CREATE & EDIT DIALOG MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create Club Event' : 'Edit Club Event'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">×</button>
            </div>
            
            <form onSubmit={handleSubmitForm} className="modal-form">
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
                  placeholder="Provide an overview of the event, guidelines, or requirements..."
                  className="form-input"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Organizing Club</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Arts Club"
                    className="form-input"
                    value={formState.organizingClub}
                    onChange={(e) => setFormState({ ...formState, organizingClub: e.target.value })}
                  />
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

                <div className="form-group">
                  <label>Event Capacity</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="form-input"
                    value={formState.capacity}
                    onChange={(e) => setFormState({ ...formState, capacity: parseInt(e.target.value) || 100 })}
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
                  {modalMode === 'create' ? 'Create Event' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
