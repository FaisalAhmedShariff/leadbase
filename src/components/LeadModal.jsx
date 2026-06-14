import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STATUS_OPTIONS = ['Cold', 'Warm', 'Hot', 'Meeting Booked', 'Closed Won', 'Closed Lost'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const SOURCE_OPTIONS = ['Manual', 'PhantomBuster', 'Google Sheets', 'Referral', 'Website', 'LinkedIn', 'Instagram', 'Other'];

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
    instagram_notes: ''
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
        instagram_notes: lead.instagram_notes || ''
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
        instagram_notes: ''
      });

      const initialCustom = {};
      customColumns.forEach(col => {
        initialCustom[col] = '';
      });
      setCustomFields(initialCustom);
    }
  }, [lead, customColumns]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomChange = (colName, value) => {
    setCustomFields(prev => ({ ...prev, [colName]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;

    let cleanHandle = formData.instagram_handle.trim();
    if (cleanHandle && !cleanHandle.startsWith('@')) {
      cleanHandle = `@${cleanHandle}`;
    }

    const leadData = {
      ...formData,
      meeting_date: formData.status === 'Meeting Booked' ? (formData.meeting_date || null) : null,
      instagram_handle: cleanHandle,
      custom_fields: customFields
    };

    onSave(leadData);
  };


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
              <label htmlFor="full_name">Full Name *</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                required
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

            {formData.status === 'Meeting Booked' && (
              <>
                <div className="form-group">
                  <label htmlFor="meeting_date">Meeting Date *</label>
                  <input
                    id="meeting_date"
                    name="meeting_date"
                    type="date"
                    value={formData.meeting_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  {/* Spacer */}
                </div>
              </>
            )}

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

            <div className="form-group">
              {/* Spacer */}
            </div>

            <div className="form-group-full">
              <label htmlFor="instagram_notes">Instagram Notes</label>
              <textarea
                id="instagram_notes"
                name="instagram_notes"
                rows={2}
                placeholder="DMs, reel engagement, story replies..."
                value={formData.instagram_notes}
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
