import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function FollowUpPromptModal({ leadName, onConfirm, onCancel }) {
  const [date, setDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date) return;
    onConfirm({ date });
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
          Set up a custom callback date for <strong>{leadName || 'this lead'}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="callback-date">When did they ask you to call back? *</label>
            <input
              id="callback-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
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
