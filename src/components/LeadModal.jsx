import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STATUS_OPTIONS = [
  'cold/ Not Contacted',
  'Warm',
  'Interested – Call Back Later',
  'Uncertain – Call Back Later',
  'Proposal Sent',
  'No Answer / Ghosted',
  'Closed'
];

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const SOURCE_OPTIONS = ['Manual', 'PhantomBuster', 'Google Sheets', 'Referral', 'Website', 'LinkedIn', 'Instagram', 'Other'];

const getAutoFollowUpRule = (status) => {
  switch (status) {
    case 'cold/ Not Contacted':
      return { days: 1, channel: 'Call' };
    case 'Warm':
      return { days: 3, channel: 'WhatsApp' };
    case 'Interested – Call Back Later':
      return { days: 2, channel: 'Call' };
    case 'Proposal Sent':
      return { days: 2, channel: 'WhatsApp + Call' };
    case 'No Answer / Ghosted':
      return { days: 1, channel: 'Call' };
    case 'Closed':
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

const getDueDateString = (lastContactedStr, days) => {
  if (!lastContactedStr || days === null || days === undefined) return '';
  const parts = lastContactedStr.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDaysDifference = (dateStr1, dateStr2) => {
  if (!dateStr1 || !dateStr2) return 0;
  const parts1 = dateStr1.split('-');
  const parts2 = dateStr2.split('-');
  if (parts1.length !== 3 || parts2.length !== 3) return 0;
  
  const d1 = new Date(parseInt(parts1[0], 10), parseInt(parts1[1], 10) - 1, parseInt(parts1[2], 10));
  const d2 = new Date(parseInt(parts2[0], 10), parseInt(parts2[1], 10) - 1, parseInt(parts2[2], 10));
  
  const diffTime = d1 - d2;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export default function LeadModal({ lead, customColumns = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    email: '',
    status: 'cold/ Not Contacted',
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
  const [customCallbackDate, setCustomCallbackDate] = useState('');

  useEffect(() => {
    if (lead) {
      setFormData({
        full_name: lead.full_name || '',
        business_name: lead.business_name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        status: lead.status || 'cold/ Not Contacted',
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

      if (lead.status === 'Uncertain – Call Back Later') {
        setCustomCallbackDate(getDueDateString(lead.last_contacted_date, lead.follow_up_days));
      } else {
        setCustomCallbackDate('');
      }

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
        status: 'cold/ Not Contacted',
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
      setCustomCallbackDate('');

      const initialCustom = {};
      customColumns.forEach(col => {
        initialCustom[col] = '';
      });
      setCustomFields(initialCustom);
    }
  }, [lead, customColumns]);

  // Handle status rules dynamically when status changes
  useEffect(() => {
    if (formData.status === 'Uncertain – Call Back Later') {
      setFormData(prev => ({
        ...prev,
        follow_up_days: '',
        follow_up_channel: 'Call',
        follow_up_time: ''
      }));
      // Default customCallbackDate to tomorrow if empty
      if (!customCallbackDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const y = tomorrow.getFullYear();
        const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const d = String(tomorrow.getDate()).padStart(2, '0');
        setCustomCallbackDate(`${y}-${m}-${d}`);
      }
    } else {
      const rule = getAutoFollowUpRule(formData.status);
      setFormData(prev => ({
        ...prev,
        follow_up_days: rule.days !== null ? rule.days : '',
        follow_up_channel: rule.channel,
        follow_up_time: ''
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

    const isUncertain = formData.status === 'Uncertain – Call Back Later';
    let finalDays = null;
    let finalChannel = 'none';

    if (isUncertain) {
      finalChannel = 'Call';
      if (customCallbackDate) {
        const lastContact = formData.last_contacted_date || getTodayString();
        finalDays = getDaysDifference(customCallbackDate, lastContact);
      }
    } else {
      const rule = getAutoFollowUpRule(formData.status);
      finalDays = rule.days;
      finalChannel = rule.channel;
    }

    const leadData = {
      ...formData,
      full_name: cleanName,
      business_name: cleanBiz,
      phone: cleanPhone,
      email: cleanEmail,
      general_notes: cleanNotes,
      instagram_handle: cleanHandle,
      meeting_date: null, // Since 'Meeting Booked' status is removed, meeting_date is always null
      last_contacted_date: formData.last_contacted_date || null,
      follow_up_days: finalDays !== null && !isNaN(finalDays) ? finalDays : null,
      follow_up_time: null, // time picker is no longer used
      follow_up_channel: finalChannel,
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

            {formData.status === 'Uncertain – Call Back Later' && (
              <div className="form-group-full">
                <label htmlFor="custom_callback_date">When did they ask you to call back? *</label>
                <input
                  id="custom_callback_date"
                  name="custom_callback_date"
                  type="date"
                  value={customCallbackDate}
                  onChange={(e) => setCustomCallbackDate(e.target.value)}
                  required
                />
              </div>
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
