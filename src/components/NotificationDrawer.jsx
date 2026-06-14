import React, { useMemo } from 'react';
import { X, CheckCircle, Eye, AlertCircle } from 'lucide-react';

// Helper to format dates as DD/MM/YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getTodayString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDueDateString = (lastContactedStr, days) => {
  if (!lastContactedStr || days === null || days === undefined) return null;
  const parts = lastContactedStr.split('-');
  if (parts.length !== 3) return null;
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

export default function NotificationDrawer({ leads = [], onMarkAsContacted, onViewLead, onClose }) {
  const todayStr = getTodayString();

  const activeNotifications = useMemo(() => {
    return leads
      .filter(lead => {
        // Leads with status Closed Won never appear
        if (lead.status === 'Closed Won') return false;
        
        // Exclude if no follow up days set
        if (lead.follow_up_days === null || lead.follow_up_days === undefined) return false;
        
        const dueDate = getDueDateString(lead.last_contacted_date, lead.follow_up_days);
        if (!dueDate) return false;
        
        return dueDate <= todayStr;
      })
      .map(lead => {
        const dueDate = getDueDateString(lead.last_contacted_date, lead.follow_up_days);
        const daysOverdue = getDaysDifference(todayStr, dueDate);
        
        return {
          ...lead,
          daysOverdue,
          dueDateFormatted: formatDate(dueDate)
        };
      })
      // Sort by most overdue first
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [leads, todayStr]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="modal-overlay" 
        onClick={onClose}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', zIndex: 499 }}
      />

      {/* Drawer */}
      <div className="notification-drawer">
        <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #111111', paddingBottom: '0.75rem' }}>
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} style={{ color: '#dc2626' }} /> Follow-up Alerts
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto', marginRight: '-1rem', paddingRight: '1rem' }}>
          {activeNotifications.length === 0 ? (
            <div className="text-center text-muted text-sm" style={{ padding: '4rem 1rem' }}>
              All caught up! No follow-ups due today.
            </div>
          ) : (
            activeNotifications.map(lead => (
              <div 
                key={lead.id} 
                style={{ 
                  border: '1px solid #111111', 
                  padding: '1rem', 
                  marginBottom: '1rem',
                  backgroundColor: lead.daysOverdue > 0 ? '#fff5f5' : '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 'bold' }}>{lead.full_name}</h4>
                    {lead.business_name && (
                      <div className="text-xs text-muted mb-2">{lead.business_name}</div>
                    )}
                  </div>
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: '0.7rem', 
                      padding: '0.1rem 0.35rem', 
                      backgroundColor: lead.daysOverdue > 0 ? '#ef4444' : '#f59e0b',
                      color: '#ffffff',
                      borderColor: 'transparent'
                    }}
                  >
                    {lead.daysOverdue === 0 ? 'Due Today' : `${lead.daysOverdue}d Overdue`}
                  </span>
                </div>

                <div className="text-xs mb-3" style={{ lineHeight: '1.4' }}>
                  <div>Status: <strong>{lead.status}</strong></div>
                  <div>Last Contact: <strong>{formatDate(lead.last_contacted_date)}</strong></div>
                  <div style={{ marginTop: '0.25rem' }}>
                    Recommended: <strong style={{ textTransform: 'uppercase', color: '#be185d' }}>{lead.follow_up_channel || 'none'}</strong>
                    {lead.follow_up_time && ` at ${lead.follow_up_time.slice(0, 5)}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => onMarkAsContacted(lead.id)}
                    className="flex items-center gap-1"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', flexGrow: 1 }}
                  >
                    <CheckCircle size={12} /> Contacted
                  </button>
                  <button 
                    onClick={() => onViewLead(lead)}
                    className="secondary flex items-center gap-1"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    <Eye size={12} /> View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
