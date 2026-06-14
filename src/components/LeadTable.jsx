import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Edit2, Trash2 } from 'lucide-react';

const Instagram = ({ size = 12, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export default function LeadTable({
  leads,
  customColumns,
  sortConfig,
  onRequestSort,
  onUpdateLead,
  onDeleteLead,
  onEditClick,
  readOnly = false
}) {
  const [activeDropdown, setActiveDropdown] = useState(null); // leadId
  const [editingCell, setEditingCell] = useState(null); // { leadId, field }
  const [editValue, setEditValue] = useState('');
  const dropdownRef = useRef(null);

  // Close status dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Cold': return 'badge-cold';
      case 'Warm': return 'badge-warm';
      case 'Hot': return 'badge-hot';
      case 'Meeting Booked': return 'badge-meeting';
      case 'Closed Won': return 'badge-closed-won';
      case 'Closed Lost': return 'badge-closed-lost';
      default: return '';
    }
  };

  const getPriorityDotClass = (priority) => {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  };

  const handleCellClick = (leadId, field, currentValue) => {
    if (readOnly) return;
    setEditingCell({ leadId, field });
    setEditValue(currentValue || '');
  };

  const handleCellSave = (lead, field, isCustom = false) => {
    if (!editingCell) return;
    if (readOnly) {
      setEditingCell(null);
      return;
    }
    
    // Only update if value changed
    const currentVal = isCustom 
      ? (lead.custom_fields && lead.custom_fields[field]) || '' 
      : lead[field] || '';

    if (editValue.trim() !== currentVal) {
      let updatedLead = {};
      if (isCustom) {
        const updatedCustomFields = { ...(lead.custom_fields || {}) };
        updatedCustomFields[field] = editValue.trim();
        updatedLead = { custom_fields: updatedCustomFields };
      } else {
        updatedLead = { [field]: editValue.trim() };
      }
      onUpdateLead(lead.id, updatedLead);
    }
    
    setEditingCell(null);
  };

  const handleCellKeyDown = (e, lead, field, isCustom = false) => {
    if (e.key === 'Enter') {
      handleCellSave(lead, field, isCustom);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const renderSortIcon = (colName) => {
    if (sortConfig && sortConfig.key === colName) {
      return sortConfig.direction === 'asc' ? <ArrowUp size={12} style={{ marginLeft: '4px' }} /> : <ArrowDown size={12} style={{ marginLeft: '4px' }} />;
    }
    return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.3 }} />;
  };

  const handleStatusChange = (leadId, newStatus) => {
    if (readOnly) return;
    onUpdateLead(leadId, { status: newStatus });
    setActiveDropdown(null);
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th onClick={() => onRequestSort('full_name')}>
              <div className="th-content">Full Name {renderSortIcon('full_name')}</div>
            </th>
            <th onClick={() => onRequestSort('business_name')}>
              <div className="th-content">Business Name {renderSortIcon('business_name')}</div>
            </th>
            <th onClick={() => onRequestSort('phone')}>
              <div className="th-content">Phone {renderSortIcon('phone')}</div>
            </th>
            <th onClick={() => onRequestSort('email')}>
              <div className="th-content">Email {renderSortIcon('email')}</div>
            </th>
            <th onClick={() => onRequestSort('status')}>
              <div className="th-content">Status {renderSortIcon('status')}</div>
            </th>
            <th onClick={() => onRequestSort('priority')}>
              <div className="th-content">Priority {renderSortIcon('priority')}</div>
            </th>
            <th onClick={() => onRequestSort('lead_source')}>
              <div className="th-content">Source {renderSortIcon('lead_source')}</div>
            </th>
            <th onClick={() => onRequestSort('meeting_date')}>
              <div className="th-content">Meeting Date {renderSortIcon('meeting_date')}</div>
            </th>
            <th onClick={() => onRequestSort('instagram_handle')}>
              <div className="th-content">IG Handle {renderSortIcon('instagram_handle')}</div>
            </th>
            <th onClick={() => onRequestSort('instagram_notes')}>
              <div className="th-content">IG Notes {renderSortIcon('instagram_notes')}</div>
            </th>
            <th onClick={() => onRequestSort('general_notes')}>
              <div className="th-content">General Notes {renderSortIcon('general_notes')}</div>
            </th>

            {customColumns.map(col => (
              <th key={col} onClick={() => onRequestSort(`custom_fields.${col}`)}>
                <div className="th-content">{col} {renderSortIcon(`custom_fields.${col}`)}</div>
              </th>
            ))}

            {!readOnly && <th className="actions-column">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan={readOnly ? (11 + customColumns.length) : (12 + customColumns.length)} className="text-center text-muted" style={{ padding: '3rem 1rem' }}>
                {readOnly ? 'No leads found.' : 'No leads found. Click "Add Lead", use CSV Import, or click "Quick Add Row" to begin.'}
              </td>
            </tr>
          ) : (
            leads.map(lead => (
              <tr key={lead.id}>
                {/* Full Name */}
                <td className="cell-editable">
                  {editingCell && editingCell.leadId === lead.id && editingCell.field === 'full_name' ? (
                    <input
                      className="cell-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellSave(lead, 'full_name')}
                      onKeyDown={(e) => handleCellKeyDown(e, lead, 'full_name')}
                      autoFocus
                    />
                  ) : (
                    <span onClick={() => handleCellClick(lead.id, 'full_name', lead.full_name)} style={{ display: 'block', minHeight: '1.2rem' }}>
                      {lead.full_name || (readOnly ? '—' : <span style={{ color: '#ccc' }}>New Lead</span>)}
                    </span>
                  )}
                </td>

                {/* Business Name */}
                <td className="cell-editable">
                  {editingCell && editingCell.leadId === lead.id && editingCell.field === 'business_name' ? (
                    <input
                      className="cell-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellSave(lead, 'business_name')}
                      onKeyDown={(e) => handleCellKeyDown(e, lead, 'business_name')}
                      autoFocus
                    />
                  ) : (
                    <span onClick={() => handleCellClick(lead.id, 'business_name', lead.business_name)} style={{ display: 'block', minHeight: '1.2rem' }}>
                      {lead.business_name || '—'}
                    </span>
                  )}
                </td>

                {/* Phone */}
                <td className="cell-editable">
                  {editingCell && editingCell.leadId === lead.id && editingCell.field === 'phone' ? (
                    <input
                      className="cell-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellSave(lead, 'phone')}
                      onKeyDown={(e) => handleCellKeyDown(e, lead, 'phone')}
                      autoFocus
                    />
                  ) : (
                    <span onClick={() => handleCellClick(lead.id, 'phone', lead.phone)} style={{ display: 'block', minHeight: '1.2rem' }}>
                      {lead.phone || '—'}
                    </span>
                  )}
                </td>

                {/* Email */}
                <td className="cell-editable">
                  {editingCell && editingCell.leadId === lead.id && editingCell.field === 'email' ? (
                    <input
                      className="cell-input"
                      type="email"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellSave(lead, 'email')}
                      onKeyDown={(e) => handleCellKeyDown(e, lead, 'email')}
                      autoFocus
                    />
                  ) : (
                    <span onClick={() => handleCellClick(lead.id, 'email', lead.email)} style={{ display: 'block', minHeight: '1.2rem' }}>
                      {lead.email || '—'}
                    </span>
                  )}
                </td>

                {/* Status Inline Click Dropdown */}
                <td className="status-cell">
                  <div
                    className={`badge ${getStatusClass(lead.status)} ${readOnly ? '' : 'status-trigger'}`}
                    onClick={() => {
                      if (readOnly) return;
                      setActiveDropdown(activeDropdown === lead.id ? null : lead.id);
                    }}
                  >
                    {lead.status}
                  </div>
                  {activeDropdown === lead.id && !readOnly && (
                    <div className="status-dropdown" ref={dropdownRef}>
                      {['Cold', 'Warm', 'Hot', 'Meeting Booked', 'Closed Won', 'Closed Lost'].map(st => (
                        <div
                          key={st}
                          className="status-dropdown-item"
                          onClick={() => handleStatusChange(lead.id, st)}
                        >
                          {st}
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                {/* Priority Selector */}
                <td>
                  <div className="priority-container">
                    <span className={`priority-dot ${getPriorityDotClass(lead.priority)}`}></span>
                    <select
                      value={lead.priority}
                      onChange={(e) => onUpdateLead(lead.id, { priority: e.target.value })}
                      disabled={readOnly}
                      style={{ border: 'none', background: 'none', padding: 0, width: 'auto', cursor: readOnly ? 'default' : 'pointer', fontWeight: 500 }}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </td>

                {/* Lead Source */}
                <td>
                  <select
                    value={lead.lead_source}
                    onChange={(e) => onUpdateLead(lead.id, { lead_source: e.target.value })}
                    disabled={readOnly}
                    style={{ border: 'none', background: 'none', padding: 0, width: 'auto', cursor: readOnly ? 'default' : 'pointer' }}
                  >
                    {['Manual', 'PhantomBuster', 'Google Sheets', 'Referral', 'Website', 'LinkedIn', 'Instagram', 'Other'].map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </td>

                {/* Meeting Date */}
                <td>
                  <input
                    type="date"
                    value={lead.meeting_date || ''}
                    onChange={(e) => onUpdateLead(lead.id, { meeting_date: e.target.value || null })}
                    disabled={readOnly || lead.status !== 'Meeting Booked'}
                    style={{ 
                      border: 'none', 
                      background: 'none', 
                      padding: 0, 
                      width: 'auto', 
                      cursor: (readOnly || lead.status !== 'Meeting Booked') ? 'default' : 'pointer',
                      color: lead.status !== 'Meeting Booked' ? '#999999' : '#111111'
                    }}
                  />
                </td>


                {/* Instagram Handle Badge */}
                <td className="cell-editable">
                  {editingCell && editingCell.leadId === lead.id && editingCell.field === 'instagram_handle' ? (
                    <input
                      className="cell-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        let val = editValue.trim();
                        if (val && !val.startsWith('@')) val = `@${val}`;
                        onUpdateLead(lead.id, { instagram_handle: val });
                        setEditingCell(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          let val = editValue.trim();
                          if (val && !val.startsWith('@')) val = `@${val}`;
                          onUpdateLead(lead.id, { instagram_handle: val });
                          setEditingCell(null);
                        } else if (e.key === 'Escape') {
                          setEditingCell(null);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span onClick={() => handleCellClick(lead.id, 'instagram_handle', lead.instagram_handle)} style={{ display: 'block', minHeight: '1.2rem' }}>
                      {lead.instagram_handle ? (
                        <span className="instagram-badge">
                          <Instagram size={12} /> {lead.instagram_handle}
                        </span>
                      ) : (
                        readOnly ? '—' : <span style={{ color: '#ccc', fontSize: '0.75rem' }}>+ Add IG</span>
                      )}
                    </span>
                  )}
                </td>

                {/* Instagram Notes */}
                <td className="cell-editable">
                  {editingCell && editingCell.leadId === lead.id && editingCell.field === 'instagram_notes' ? (
                    <input
                      className="cell-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellSave(lead, 'instagram_notes')}
                      onKeyDown={(e) => handleCellKeyDown(e, lead, 'instagram_notes')}
                      autoFocus
                    />
                  ) : (
                    <span onClick={() => handleCellClick(lead.id, 'instagram_notes', lead.instagram_notes)} style={{ display: 'block', minHeight: '1.2rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.instagram_notes || '—'}
                    </span>
                  )}
                </td>

                {/* General Notes */}
                <td className="cell-editable">
                  {editingCell && editingCell.leadId === lead.id && editingCell.field === 'general_notes' ? (
                    <input
                      className="cell-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellSave(lead, 'general_notes')}
                      onKeyDown={(e) => handleCellKeyDown(e, lead, 'general_notes')}
                      autoFocus
                    />
                  ) : (
                    <span onClick={() => handleCellClick(lead.id, 'general_notes', lead.general_notes)} style={{ display: 'block', minHeight: '1.2rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.general_notes || '—'}
                    </span>
                  )}
                </td>

                {/* Custom fields cells */}
                {customColumns.map(col => (
                  <td key={col} className="cell-editable">
                    {editingCell && editingCell.leadId === lead.id && editingCell.field === col ? (
                      <input
                        className="cell-input"
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellSave(lead, col, true)}
                        onKeyDown={(e) => handleCellKeyDown(e, lead, col, true)}
                        autoFocus
                      />
                    ) : (
                      <span onClick={() => handleCellClick(lead.id, col, lead.custom_fields && lead.custom_fields[col])} style={{ display: 'block', minHeight: '1.2rem' }}>
                        {(lead.custom_fields && lead.custom_fields[col]) || '—'}
                      </span>
                    )}
                  </td>
                ))}

                {/* Row Actions */}
                {!readOnly && (
                  <td>
                    <div className="row-actions">
                      <button onClick={() => onEditClick(lead)} title="Edit Details">
                        <Edit2 size={12} />
                      </button>
                      <button className="danger" onClick={() => onDeleteLead(lead.id)} title="Delete Lead">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
