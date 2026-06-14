import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function FollowUpPromptModal({ leadName, onConfirm, onCancel }) {
  const [days, setDays] = useState(1);
  const [time, setTime] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 0) return;
    onConfirm({ days: daysNum, time: time || null });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '400px', border: '1px solid #111' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontSize: '1rem' }}>Schedule Call Back</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Cancel">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted mb-4">
          Set up a custom callback reminder for <strong>{leadName || 'this lead'}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="callback-days">Call back in how many days? *</label>
            <input
              id="callback-days"
              type="number"
              min="0"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="callback-time">Preferred Time (Optional)</label>
            <input
              id="callback-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit">
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
