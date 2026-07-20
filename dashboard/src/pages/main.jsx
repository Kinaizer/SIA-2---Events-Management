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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const EVENTS_PER_PAGE = 7;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
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
      setError('Could not connect to the backend server. Please verify it is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(event => {
    if (event.status === 'drafted') return false; // drafts only visible on Create page
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      event.title?.toLowerCase().includes(q) ||
      event.venue?.toLowerCase().includes(q) ||
      event.organizingClub?.toLowerCase().includes(q) ||
      event.type?.toLowerCase().includes(q) ||
      event.description?.toLowerCase().includes(q);
    return matchesType && matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedEvents = filteredEvents.slice((safePage - 1) * EVENTS_PER_PAGE, safePage * EVENTS_PER_PAGE);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };
  const handleFilterType = (val) => { setFilterType(val); setCurrentPage(1); };
  const handleFilterStatus = (val) => { setFilterStatus(val); setCurrentPage(1); };

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
    setFormError(null);
    setActiveNav('create');
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate that the event date is not in the past
    if (formState.schedule) {
      const selectedDate = new Date(formState.schedule);
      const now = new Date();
      if (selectedDate < now) {
        setFormError(
          `The selected date and time (${selectedDate.toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}) has already passed. Please choose a future date and time.`
        );
        return;
      }
    }

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
      setFormError(null);
      setActiveNav('view');
      fetchEvents(res.data._id);
    } catch (err) {
      setFormError('Event creation failed: ' + (err.response?.data?.error || err.message));
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
      // Convert the datetime-local string to a proper ISO string for the backend
      const payload = {
        ...formState,
        schedule: formState.schedule ? new Date(formState.schedule).toISOString() : formState.schedule
      };
      await axios.put(`${API_BASE}/events/${editingEventId}`, payload);
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

  // Confirm a draft → set status to 'active'
  const handleConfirmDraft = async (eventId) => {
    try {
      await axios.put(`${API_BASE}/events/${eventId}`, { status: 'active' });
      fetchEvents();
    } catch (err) {
      alert('Failed to confirm event: ' + (err.response?.data?.error || err.message));
    }
  };

  // Delete a draft directly from the create page
  const handleDeleteDraft = async (eventId) => {
    if (!window.confirm('Delete this draft event?')) return;
    try {
      await axios.delete(`${API_BASE}/events/${eventId}`);
      fetchEvents();
    } catch (err) {
      alert('Failed to delete draft: ' + (err.response?.data?.error || err.message));
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
          <img src="/logo.png" alt="SEAIT Logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <p className="sidebar-logo-name">School of Engineering, Architecture, and Information Technology</p>
            <span className="sidebar-logo-sub">Events Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => setActiveNav('view')}
            className={`sidebar-nav-item ${activeNav === 'view' ? 'active' : ''}`}
          >
            View Events
          </button>
          <button
            onClick={handleOpenCreateTab}
            className={`sidebar-nav-item ${activeNav === 'create' ? 'active' : ''}`}
          >
            Create Event
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-stat-box">
            <span className="stat-label">Total Events</span>
            <span className="stat-value">{totalEvents}</span>
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
          <section className="create-page-layout">
            {/* ─── Left: Create Form ─── */}
            <div className="create-event-card">
              <h2>Event Registration</h2>
              <p>Fill out the fields below to schedule a new student club event.</p>

              <form onSubmit={handleCreateEvent} className="creation-form">
                {formError && (
                  <div className="form-error-banner">
                    <span className="form-error-icon">⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}
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
                    <label>Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      required
                      className="form-input"
                      value={formState.schedule}
                      min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                      onChange={(e) => {
                        setFormError(null);
                        setFormState({ ...formState, schedule: e.target.value });
                      }}
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

            {/* ─── Right: Drafted Events Panel ─── */}
            <div className="drafts-panel">
              <div className="drafts-panel-header">
                <h3>📄 Drafted Events</h3>
                <span className="drafts-count">{events.filter(e => e.status === 'drafted').length}</span>
              </div>

              {events.filter(e => e.status === 'drafted').length === 0 ? (
                <div className="drafts-empty">
                  <span>📬</span>
                  <p>No drafted events yet.</p>
                </div>
              ) : (
                <div className="drafts-table-wrapper">
                  <table className="drafts-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Date &amp; Time</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events
                        .filter(e => e.status === 'drafted')
                        .map(draft => (
                          <tr key={draft._id}>
                            <td className="draft-td-title">
                              <span className="draft-title">{draft.title}</span>
                              <span className="draft-club">{draft.organizingClub}</span>
                            </td>
                            <td className="draft-td-date">{formatDateTime(draft.schedule)}</td>
                            <td className="draft-td-actions">
                              <button
                                className="btn-confirm-draft"
                                title="Confirm &amp; Publish"
                                onClick={() => handleConfirmDraft(draft._id)}
                              >
                                ✓ Confirm
                              </button>
                              <button
                                className="btn-delete-draft"
                                title="Delete Draft"
                                onClick={() => handleDeleteDraft(draft._id)}
                              >
                                ✕ Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>


            <div className="ems-workspace">
              <div className="events-column">
                {/* Search Bar */}
                <div className="search-bar-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by title, venue, club, type…"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="search-clear-btn" onClick={() => handleSearchChange('')} title="Clear search">
                      ×
                    </button>
                  )}
                </div>

                <div className="events-column-header">
                  <h2>Events Catalog ({filteredEvents.length})</h2>

                  <div className="filters-wrapper">
                    <select
                      className="select-filter"
                      value={filterType}
                      onChange={(e) => handleFilterType(e.target.value)}
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
                      onChange={(e) => handleFilterStatus(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
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
                    <p>Try a different search term or reset the filters.</p>
                  </div>
                ) : (
                  <>
                    {/* Events Table */}
                    <div className="events-table-wrapper">
                      <table className="events-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Title</th>
                            <th>Club</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Date &amp; Time</th>
                            <th>Venue</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedEvents.map((event, idx) => (
                            <tr key={event._id} className={selectedEvent?._id === event._id ? 'row-selected' : ''}>
                              <td className="td-num" data-label="#">{(safePage - 1) * EVENTS_PER_PAGE + idx + 1}</td>
                              <td className="td-title" data-label="Title">
                                <span className="tbl-event-title">{event.title}</span>
                              </td>
                              <td className="td-club" data-label="Club">{event.organizingClub}</td>
                              <td className="td-badge" data-label="Type">
                                <span className="badge badge-type">{event.type}</span>
                              </td>
                              <td className="td-badge" data-label="Status">
                                <span className={`badge badge-${event.status}`}>{event.status}</span>
                              </td>
                              <td className="td-date" data-label="Date">{formatDateTime(event.schedule)}</td>
                              <td className="td-venue" data-label="Venue">{event.venue}</td>
                              <td className="td-actions" data-label="Actions">
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
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls — always visible */}
                    <div className="pagination-bar">
                      <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                      >
                        ← Prev
                      </button>
                      <span className="page-info">
                        Page {safePage} of {totalPages} &nbsp;·&nbsp; {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                      >
                        Next →
                      </button>
                    </div>
                  </>
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
