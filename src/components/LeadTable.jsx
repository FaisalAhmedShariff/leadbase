import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Edit2, 
  Eye, 
  ExternalLink, 
  AlertTriangle, 
  Globe, 
  Sparkles 
} from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '----';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const PIPELINE_STATUSES = [
  'cold/ Not Contacted',
  'Warm',
  'Interested – Call Back Later',
  'Uncertain – Call Back Later',
  'Proposal Sent',
  'No Answer / Ghosted',
  'Closed'
];

export default function LeadTable({
  leads = [],
  allLeads = [],
  customColumns = [],
  sortConfig,
  onRequestSort,
  onUpdateLead,
  onDeleteLead,
  onEditClick,
  onTriggerCallbackPrompt,
  readOnly = false
}) {
  const [editingCell, setEditingCell] = useState(null); // { leadId, field, isCustom }
  const [editValue, setEditValue] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null); // leadId
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'cold/ Not Contacted':
      case 'No Answer / Ghosted':
        return 'badge-cold';
      case 'Warm':
      case 'Interested – Call Back Later':
      case 'Uncertain – Call Back Later':
      case 'Proposal Sent':
        return 'badge-warm';
      case 'Closed':
        return 'badge-meeting';
      default:
        return '';
    }
  };

  const getResearchBadgeClass = (resStatus) => {
    switch (resStatus) {
      case 'Research Complete':
        return 'badge-meeting';
      case 'Researching':
      case 'Research Queued':
        return 'badge-warm';
      case 'Research Failed':
        return 'badge-closed-lost';
      default:
        return 'badge-cold';
    }
  };

  const getOutreachBadgeClass = (outStatus) => {
    switch (outStatus) {
      case 'Approved':
      case 'Sent':
      case 'Converted':
        return 'badge-meeting';
      case 'Draft Ready':
      case 'Needs Review':
      case 'Follow-up':
      case 'Replied':
        return 'badge-warm';
      case 'Not Interested':
        return 'badge-closed-lost';
      default:
        return 'badge-cold';
    }
  };

  const getPriorityDotClass = (priority) => {
    switch (priority) {
      case 'High':
        return 'priority-high';
      case 'Medium':
        return 'priority-medium';
      case 'Low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  const handleCellClick = (leadId, field, currentValue, isCustom = false) => {
    if (readOnly) return;
    setEditingCell({ leadId, field, isCustom });
    setEditValue(currentValue && currentValue !== '----' ? currentValue : '');
  };

  const handleCellSave = (lead, field, isCustom = false) => {
    if (!editingCell) return;
    if (readOnly) {
      setEditingCell(null);
      return;
    }
    
    const currentVal = isCustom 
      ? (lead.custom_fields && lead.custom_fields[field]) || '' 
      : lead[field] || '';

    if (editValue.trim() !== currentVal) {
      let updatedLead = {};
      if (isCustom) {
        const updatedCustomFields = { ...(lead.custom_fields || {}) };
        updatedCustomFields[field] = editValue.trim() !== '' ? editValue.trim() : '----';
        updatedLead = { custom_fields: updatedCustomFields };
      } else {
        updatedLead = { [field]: editValue.trim() !== '' ? editValue.trim() : '----' };
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
    if (newStatus === 'Uncertain – Call Back Later') {
      const targetLead = leads.find(l => l.id === leadId);
      onTriggerCallbackPrompt(targetLead, newStatus);
    } else {
      onUpdateLead(leadId, { status: newStatus });
    }
    setActiveDropdown(null);
  };

  // Helper to check for duplicate lead
  const isDuplicateLead = (targetLead) => {
    const list = allLeads.length > 0 ? allLeads : leads;
    return list.some(l => {
      if (l.id === targetLead.id) return false;
      const matchPhone = targetLead.phone && targetLead.phone !== '----' && l.phone && l.phone !== '----' && l.phone.trim() === targetLead.phone.trim();
      const matchWebsite = targetLead.website && targetLead.website !== '----' && l.website && l.website !== '----' && l.website.toLowerCase().trim() === targetLead.website.toLowerCase().trim();
      const matchBizLoc = targetLead.business_name && targetLead.location && l.business_name && l.location &&
        l.business_name.toLowerCase().trim() === targetLead.business_name.toLowerCase().trim() &&
        l.location.toLowerCase().trim() === targetLead.location.toLowerCase().trim();
      return matchPhone || matchWebsite || matchBizLoc;
    });
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
            <th onClick={() => onRequestSort('website')}>
              <div className="th-content">Website {renderSortIcon('website')}</div>
            </th>
            <th onClick={() => onRequestSort('location')}>
              <div className="th-content">Location {renderSortIcon('location')}</div>
            </th>
            <th onClick={() => onRequestSort('ai_lead_score')}>
              <div className="th-content">Score {renderSortIcon('ai_lead_score')}</div>
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
            <th onClick={() => onRequestSort('research_status')}>
              <div className="th-content">Research {renderSortIcon('research_status')}</div>
            </th>
            <th onClick={() => onRequestSort('outreach_status')}>
              <div className="th-content">Outreach {renderSortIcon('outreach_status')}</div>
            </th>

            {/* Custom columns */}
            {customColumns.map(col => (
              <th key={col} onClick={() => onRequestSort(`custom_fields.${col}`)}>
                <div className="th-content">{col} {renderSortIcon(`custom_fields.${col}`)}</div>
              </th>
            ))}

            <th className="actions-column">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan={12 + customColumns.length} className="text-center text-muted" style={{ padding: '3rem 1rem' }}>
                {readOnly ? 'No leads found.' : 'No leads found. Click "Add Lead", use CSV Import, or click "Quick Add Row" to begin.'}
              </td>
            </tr>
          ) : (
            leads.map(lead => {
              const hasDup = isDuplicateLead(lead);
              const hasScore = lead.ai_lead_score !== undefined && lead.ai_lead_score !== null && lead.ai_lead_score !== '';
              const scoreVal = hasScore ? parseInt(lead.ai_lead_score, 10) : null;

              return (
                <tr key={lead.id} style={{ backgroundColor: hasDup ? '#fffdf5' : undefined }}>
                  
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
                      <div onClick={() => handleCellClick(lead.id, 'full_name', lead.full_name)} style={{ minHeight: '1.2rem', cursor: readOnly ? 'default' : 'pointer' }}>
                        <span style={{ fontWeight: 600 }}>{lead.full_name || (readOnly ? '----' : <span style={{ color: '#ccc' }}>New Lead</span>)}</span>
                        {hasDup && (
                          <span title="Possible duplicate lead detected" style={{ marginLeft: '4px', color: '#d97706', display: 'inline-flex', verticalAlign: 'middle' }}>
                            <AlertTriangle size={12} />
                          </span>
                        )}
                      </div>
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
                        {lead.business_name || '----'}
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
                        {lead.phone || '----'}
                      </span>
                    )}
                  </td>

                  {/* Website */}
                  <td className="cell-editable">
                    {editingCell && editingCell.leadId === lead.id && editingCell.field === 'website' ? (
                      <input
                        className="cell-input"
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellSave(lead, 'website')}
                        onKeyDown={(e) => handleCellKeyDown(e, lead, 'website')}
                        autoFocus
                      />
                    ) : (
                      <span onClick={() => handleCellClick(lead.id, 'website', lead.website)} style={{ display: 'block', minHeight: '1.2rem' }}>
                        {lead.website && lead.website !== '----' ? (
                          <a 
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted font-semibold underline"
                            style={{ fontSize: '0.8rem' }}
                          >
                            {lead.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')} <ExternalLink size={10} style={{ display: 'inline' }} />
                          </a>
                        ) : '----'}
                      </span>
                    )}
                  </td>

                  {/* Location */}
                  <td className="cell-editable">
                    {editingCell && editingCell.leadId === lead.id && editingCell.field === 'location' ? (
                      <input
                        className="cell-input"
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellSave(lead, 'location')}
                        onKeyDown={(e) => handleCellKeyDown(e, lead, 'location')}
                        autoFocus
                      />
                    ) : (
                      <span onClick={() => handleCellClick(lead.id, 'location', lead.location)} style={{ display: 'block', minHeight: '1.2rem' }}>
                        {lead.location || '----'}
                      </span>
                    )}
                  </td>

                  {/* AI Lead Score */}
                  <td>
                    <div className="flex items-center gap-1 font-semibold" style={{ fontSize: '0.8rem' }}>
                      {hasScore && !isNaN(scoreVal) ? (
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: scoreVal >= 80 ? '#f0fdf4' : scoreVal >= 60 ? '#fffbe6' : '#fef2f2',
                            color: scoreVal >= 80 ? '#166534' : scoreVal >= 60 ? '#854d0e' : '#991b1b',
                            borderColor: 'transparent',
                            fontWeight: 700
                          }}
                        >
                          {scoreVal}/100
                        </span>
                      ) : (
                        <span className="badge badge-cold" style={{ color: '#999999', backgroundColor: '#f3f4f6', borderColor: 'transparent' }} title="Not scored yet">
                          —
                        </span>
                      )}
                    </div>
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
                      <div className="status-dropdown" ref={dropdownRef} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {PIPELINE_STATUSES.map(st => (
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

                  {/* Research Status */}
                  <td>
                    <span className={`badge ${getResearchBadgeClass(lead.research_status || 'Not Researched')}`}>
                      {lead.research_status || 'Not Researched'}
                    </span>
                  </td>

                  {/* Outreach Status */}
                  <td>
                    <span className={`badge ${getOutreachBadgeClass(lead.outreach_status || 'Not Drafted')}`}>
                      {lead.outreach_status || 'Not Drafted'}
                    </span>
                  </td>

                  {/* Custom Columns */}
                  {customColumns.map(col => {
                    const val = (lead.custom_fields && lead.custom_fields[col]) || '';
                    return (
                      <td key={col} className="cell-editable">
                        {editingCell && editingCell.leadId === lead.id && editingCell.field === col && editingCell.isCustom ? (
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
                          <span onClick={() => handleCellClick(lead.id, col, val, true)} style={{ display: 'block', minHeight: '1.2rem' }}>
                            {val || '----'}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Row Actions */}
                  <td className="actions-column">
                    <div className="row-actions">
                      <button 
                        onClick={() => onEditClick(lead)} 
                        title={readOnly ? 'View Lead Details' : 'View & Edit Lead Details'}
                      >
                        {readOnly ? <Eye size={13} /> : <Edit2 size={13} />}
                      </button>
                      {!readOnly && (
                        <button onClick={() => onDeleteLead(lead.id)} className="danger" title="Delete lead">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
