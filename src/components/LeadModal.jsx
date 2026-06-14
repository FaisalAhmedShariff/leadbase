import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STATUS_OPTIONS = [
  'Cold',
  'Warm',
  'Hot',
  'No Answer',
  'Interested – Call Back Later',
  'Uncertain – Call Back Later',
  'Thinking / Undecided',
  'Proposal Sent',
  'Negotiating',
  'Meeting Booked',
  'Meeting Done',
  'Followed Up – No Response',
  'Ghosted',
  'Not Interested',
  'Closed Won',
  'Closed Lost'
];

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const SOURCE_OPTIONS = ['Manual', 'PhantomBuster', 'Google Sheets', 'Referral', 'Website', 'LinkedIn', 'Instagram', 'Other'];

const getAutoFollowUpRule = (status) => {
  switch (status) {
    case 'No Answer':
      return { days: 0, channel: 'Text + Call' };
    case 'Thinking / Undecided':
      return { days: 2, channel: 'WhatsApp' };
    case 'Proposal Sent':
      return { days: 2, channel: 'WhatsApp + Call' };
    case 'Followed Up – No Response':
      return { days: 3, channel: 'WhatsApp' };
    case 'Ghosted':
      return { days: 5, channel: 'WhatsApp only' };
    case 'Negotiating':
      return { days: 1, channel: 'Call' };
    case 'Meeting Booked':
      return { days: 0, channel: 'Call' };
    case 'Meeting Done':
      return { days: 1, channel: 'WhatsApp' };
    case 'Not Interested':
      return { days: 30, channel: 'WhatsApp only' };
    case 'Closed Lost':
      return { days: 30, channel: 'WhatsApp only' };
    default:
      return { days: null, channel: 'none' };
  }
};

const getTodayString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function LeadModal({ lead, customColumns = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    email: '',
    status: 'Cold',
    priority: 'Medium',
    lead_source: 'Manual',
    meeting_date: '',
    general_notes: '',
    instagram_handle: '',
    last_contacted_date: getTodayString(),
    follow_up_days: '',
    follow_up_time: '',
    follow_up_channel: 'none'
  });

  const [customFields, setCustomFields] = useState({});

  useEffect(() => {
    if (lead) {
      setFormData({
        full_name: lead.full_name || '',
        business_name: lead.business_name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        status: lead.status || 'Cold',
        priority: lead.priority || 'Medium',
        lead_source: lead.lead_source || 'Manual',
        meeting_date: lead.meeting_date || '',
        general_notes: lead.general_notes || '',
        instagram_handle: lead.instagram_handle || '',
        last_contacted_date: lead.last_contacted_date || getTodayString(),
        follow_up_days: lead.follow_up_days !== null && lead.follow_up_days !== undefined ? lead.follow_up_days : '',
        follow_up_time: lead.follow_up_time || '',
        follow_up_channel: lead.follow_up_channel || 'none'
      });

      // Populate custom fields
      const initialCustom = {};
      customColumns.forEach(col => {
        initialCustom[col] = (lead.custom_fields && lead.custom_fields[col]) !== undefined 
          ? lead.custom_fields[col] 
          : '';
      });
      setCustomFields(initialCustom);
    } else {
      setFormData({
        full_name: '',
        business_name: '',
        phone: '',
        email: '',
        status: 'Cold',
        priority: 'Medium',
        lead_source: 'Manual',
        meeting_date: '',
        general_notes: '',
        instagram_handle: '',
        last_contacted_date: getTodayString(),
        follow_up_days: '',
        follow_up_time: '',
        follow_up_channel: 'none'
      });

      const initialCustom = {};
      customColumns.forEach(col => {
        initialCustom[col] = '';
      });
      setCustomFields(initialCustom);
    }
  }, [lead, customColumns]);

  // Handle status rules dynamically when status changes
  useEffect(() => {
    const isCallbackStatus = formData.status === 'Interested – Call Back Later' || formData.status === 'Uncertain – Call Back Later';
    if (!isCallbackStatus) {
      const rule = getAutoFollowUpRule(formData.status);
      setFormData(prev => ({
        ...prev,
        follow_up_days: rule.days !== null ? rule.days : '',
        follow_up_channel: rule.channel,
        follow_up_time: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        follow_up_channel: 'Call',
        follow_up_days: prev.follow_up_days !== '' ? prev.follow_up_days : 1
      }));
    }
  }, [formData.status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomChange = (colName, value) => {
    setCustomFields(prev => ({ ...prev, [colName]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Default standard empty fields to '----'
    const cleanName = formData.full_name.trim() || '----';
    const cleanBiz = formData.business_name.trim() || '----';
    const cleanPhone = formData.phone.trim() || '----';
    const cleanEmail = formData.email.trim() || '----';
    const cleanNotes = formData.general_notes.trim() || '----';

    let cleanHandle = formData.instagram_handle.trim();
    if (cleanHandle) {
      if (!cleanHandle.startsWith('@')) {
        cleanHandle = `@${cleanHandle}`;
      }
    } else {
      cleanHandle = '----';
    }

    // Default empty custom fields to '----'
    const cleanCustomFields = {};
    customColumns.forEach(col => {
      const val = customFields[col];
      cleanCustomFields[col] = val && val.trim() !== '' ? val.trim() : '----';
    });

    const isCallbackStatus = formData.status === 'Interested – Call Back Later' || formData.status === 'Uncertain – Call Back Later';
    const finalDays = isCallbackStatus 
      ? (formData.follow_up_days !== '' ? parseInt(formData.follow_up_days, 10) : null)
      : (getAutoFollowUpRule(formData.status).days !== null ? getAutoFollowUpRule(formData.status).days : null);

    const leadData = {
      ...formData,
      full_name: cleanName,
      business_name: cleanBiz,
      phone: cleanPhone,
      email: cleanEmail,
      general_notes: cleanNotes,
      instagram_handle: cleanHandle,
      meeting_date: formData.status === 'Meeting Booked' ? (formData.meeting_date || null) : null,
      last_contacted_date: formData.last_contacted_date || null,
      follow_up_days: finalDays !== null && !isNaN(finalDays) ? finalDays : null,
      follow_up_time: isCallbackStatus && formData.follow_up_time ? formData.follow_up_time : null,
      follow_up_channel: isCallbackStatus ? 'Call' : getAutoFollowUpRule(formData.status).channel,
      custom_fields: cleanCustomFields
    };

    onSave(leadData);
  };

  const isCallbackStatus = formData.status === 'Interested – Call Back Later' || formData.status === 'Uncertain – Call Back Later';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{lead ? 'Edit Lead' : 'Add New Lead'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="business_name">Business Name</label>
              <input
                id="business_name"
                name="business_name"
                type="text"
                value={formData.business_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="lead_source">Lead Source</label>
              <select
                id="lead_source"
                name="lead_source"
                value={formData.lead_source}
                onChange={handleChange}
              >
                {SOURCE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="last_contacted_date">Last Contacted Date</label>
              <input
                id="last_contacted_date"
                name="last_contacted_date"
                type="date"
                value={formData.last_contacted_date}
                onChange={handleChange}
              />
            </div>

            {isCallbackStatus && (
              <>
                <div className="form-group">
                  <label htmlFor="follow_up_days">Call back in how many days?</label>
                  <input
                    id="follow_up_days"
                    name="follow_up_days"
                    type="number"
                    min="0"
                    value={formData.follow_up_days}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="follow_up_time">Preferred Time</label>
                  <input
                    id="follow_up_time"
                    name="follow_up_time"
                    type="time"
                    value={formData.follow_up_time}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {formData.status === 'Meeting Booked' && (
              <>
                <div className="form-group">
                  <label htmlFor="meeting_date">Meeting Date</label>
                  <input
                    id="meeting_date"
                    name="meeting_date"
                    type="date"
                    value={formData.meeting_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  {/* Spacer */}
                </div>
              </>
            )}

            <div className="form-group">
              <label>Follow-up Channel</label>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fafafa', border: '1px solid #e5e7eb', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: '#be185d' }}>
                {formData.follow_up_channel}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="instagram_handle">Instagram Handle</label>
              <input
                id="instagram_handle"
                name="instagram_handle"
                type="text"
                placeholder="@username"
                value={formData.instagram_handle}
                onChange={handleChange}
              />
            </div>

            <div className="form-group-full">
              <label htmlFor="general_notes">General Notes</label>
              <textarea
                id="general_notes"
                name="general_notes"
                rows={3}
                value={formData.general_notes}
                onChange={handleChange}
              />
            </div>
          </div>

          {customColumns.length > 0 && (
            <div className="custom-fields-group">
              <h4 className="manager-title" style={{ marginTop: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>Custom Fields</h4>
              <div className="form-grid" style={{ marginTop: '0.5rem' }}>
                {customColumns.map(col => (
                  <div className="form-group" key={col}>
                    <label htmlFor={`custom-${col}`}>{col}</label>
                    <input
                      id={`custom-${col}`}
                      type="text"
                      value={customFields[col] || ''}
                      onChange={(e) => handleCustomChange(col, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">
              Save Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
