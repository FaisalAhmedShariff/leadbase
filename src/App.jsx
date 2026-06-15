import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient, getSupabaseConfig } from './supabaseClient';
import Auth from './components/Auth';
import StatsBar from './components/StatsBar';
import LeadTable from './components/LeadTable';
import LeadModal from './components/LeadModal';
import CsvImportExport from './components/CsvImportExport';
import MembersModal from './components/MembersModal';
import NotificationDrawer from './components/NotificationDrawer';
import FollowUpPromptModal from './components/FollowUpPromptModal';
import { 
  Plus, 
  LogOut, 
  Search, 
  Database, 
  FileSpreadsheet, 
  Users,
  X,
  ShieldAlert,
  Bell
} from 'lucide-react';

const PIPELINE_STATUSES = [
  'cold/ Not Contacted',
  'Warm',
  'Interested – Call Back Later',
  'Uncertain – Call Back Later',
  'Proposal Sent',
  'No Answer / Ghosted',
  'Closed'
];

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

export default function App() {
  const [supabaseConfig] = useState(getSupabaseConfig());
  const [session, setSession] = useState(null);
  const [leads, setLeads] = useState([]);
  const [customColumns, setCustomColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_custom_columns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI Control states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [schemaError, setSchemaError] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Modals state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null); // lead to edit
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeCallbackPrompt, setActiveCallbackPrompt] = useState(null); // { lead, newStatus }

  const supabase = useMemo(() => getSupabaseClient(), [supabaseConfig]);

  const todayStr = getTodayString();
  const dueLeadsCount = useMemo(() => {
    return leads.filter(lead => {
      if (lead.status === 'Closed') return false;
      if (lead.follow_up_days === null || lead.follow_up_days === undefined) return false;
      const dueDate = getDueDateString(lead.last_contacted_date, lead.follow_up_days);
      if (!dueDate) return false;
      return dueDate <= todayStr;
    }).length;
  }, [leads, todayStr]);

  // Handle Authentication and Session Setup
  useEffect(() => {
    if (!supabase) return;

    // Check for invite token in URL first
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite_token');

    if (token) {
      validateInviteToken(token);
    } else {
      // Normal owner flow
      supabase.auth.getSession().then(({ data: { session: supabaseSession } }) => {
        if (supabaseSession) {
          setSession({
            user: supabaseSession.user,
            role: 'Owner',
            isCollaborator: false
          });
        }
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
        if (supabaseSession) {
          setSession({
            user: supabaseSession.user,
            role: 'Owner',
            isCollaborator: false
          });
        } else {
          setSession(null);
        }
      });

      return () => {
        if (subscription) subscription.unsubscribe();
      };
    }
  }, [supabase]);

  // Fetch leads and setup Realtime subscription
  useEffect(() => {
    if (!supabase || !session) {
      setLeads([]);
      return;
    }

    fetchLeads();

    // Setup realtime subscription
    const channel = supabase
      .channel('public:leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) => prev.map((l) => (l.id === payload.new.id ? payload.new : l)));
          } else if (payload.eventType === 'DELETE') {
            setLeads((prev) => prev.filter((l) => l.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, session]);

  const validateInviteToken = async (token) => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('collaborators')
        .select('*')
        .eq('invite_token', token)
        .single();

      if (fetchErr || !data) {
        throw new Error('Invalid or expired invitation link.');
      }

      // Setup guest collaborator session
      setSession({
        user: { email: data.email },
        role: data.role, // 'Viewer' | 'Editor'
        isCollaborator: true,
        token: token
      });

      // Clear the query parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(err.message || 'Invitation validation failed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    setSchemaError(false);

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message.includes('relation "public.leads" does not exist') || error.code === '42P01') {
          setSchemaError(true);
        } else {
          setError(error.message);
        }
      } else {
        setLeads(data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch leads.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (session?.isCollaborator) {
      setSession(null);
    } else {
      if (!supabase) return;
      await supabase.auth.signOut();
      setSession(null);
    }
  };

  // Custom Column Management
  const handleAddCustomColumn = (name) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (customColumns.includes(cleanName)) return;

    const updated = [...customColumns, cleanName];
    setCustomColumns(updated);
    localStorage.setItem('crm_custom_columns', JSON.stringify(updated));
    setNewColumnName('');
  };

  const handleDeleteCustomColumn = (name) => {
    if (confirm(`Are you sure you want to remove the custom column "${name}"? Row data in this column will be preserved in the database but hidden from the view.`)) {
      const updated = customColumns.filter((c) => c !== name);
      setCustomColumns(updated);
      localStorage.setItem('crm_custom_columns', JSON.stringify(updated));
    }
  };

  // Lead Operations
  const handleQuickAddRow = async () => {
    if (!supabase || session?.role === 'Viewer') return;
    try {
      const { error } = await supabase
        .from('leads')
        .insert([{
          full_name: 'New Lead',
          status: 'cold/ Not Contacted',
          priority: 'Medium',
          lead_source: 'Manual',
          custom_fields: {}
        }]);

      if (error) throw error;
    } catch (err) {
      alert('Error adding row: ' + err.message);
    }
  };

  const handleSaveLead = async (leadData) => {
    if (!supabase || session?.role === 'Viewer') return;
    try {
      if (selectedLead) {
        // Edit existing lead
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', selectedLead.id);

        if (error) throw error;
      } else {
        // Create new lead
        const { error } = await supabase
          .from('leads')
          .insert([leadData]);

        if (error) throw error;
      }
      setIsLeadModalOpen(false);
      setSelectedLead(null);
    } catch (err) {
      alert('Error saving lead: ' + err.message);
    }
  };

  const handleUpdateLeadField = async (leadId, updatedFields) => {
    if (!supabase || session?.role === 'Viewer') return;
    try {
      let fields = { ...updatedFields };
      if (fields.status) {
        fields.meeting_date = null; // meeting_date is removed, always keep null
        if (fields.status !== 'Uncertain – Call Back Later') {
          const rule = getAutoFollowUpRule(fields.status);
          fields.follow_up_days = rule.days;
          fields.follow_up_channel = rule.channel;
          fields.follow_up_time = null;
          fields.last_contacted_date = getTodayString();
        }
      }

      const { error } = await supabase
        .from('leads')
        .update(fields)
        .eq('id', leadId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating lead inline:', err);
    }
  };

  const handleTriggerCallbackPrompt = (lead, newStatus) => {
    setActiveCallbackPrompt({ lead, newStatus });
  };

  const handleSaveCallbackInline = async (leadId, newStatus, date) => {
    if (!supabase || session?.role === 'Viewer') return;
    try {
      const todayStr = getTodayString();
      const lead = leads.find(l => l.id === leadId);
      const lastContact = lead?.last_contacted_date || todayStr;
      
      const days = getDaysDifference(date, lastContact);

      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          follow_up_days: days,
          follow_up_time: null,
          follow_up_channel: 'Call',
          last_contacted_date: lastContact
        })
        .eq('id', leadId);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving callback inline:', err);
    }
  };

  const handleMarkAsContacted = async (leadId) => {
    if (!supabase || session?.role === 'Viewer') return;
    try {
      const todayStr = getTodayString();
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const isUncertain = lead.status === 'Uncertain – Call Back Later';
      
      const updateData = {
        last_contacted_date: todayStr
      };

      if (!isUncertain) {
        const rule = getAutoFollowUpRule(lead.status);
        updateData.follow_up_days = rule.days;
        updateData.follow_up_channel = rule.channel;
        updateData.follow_up_time = null;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking lead as contacted:', err);
    }
  };

  const handleViewLead = (lead) => {
    setIsNotificationsOpen(false);
    setSelectedLead(lead);
    setIsLeadModalOpen(true);
  };


  const handleDeleteLead = async (leadId) => {
    if (!supabase || session?.role === 'Viewer') return;
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    } catch (err) {
      alert('Error deleting lead: ' + err.message);
    }
  };

  const handleBulkImport = async (importedLeads) => {
    if (!supabase || session?.role === 'Viewer') return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('leads')
        .insert(importedLeads);

      if (error) throw error;
      setIsCsvModalOpen(false);
      fetchLeads();
    } catch (err) {
      alert('Error importing leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Searching, Filtering & Sorting logic
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = lead.full_name?.toLowerCase().includes(query);
      const bizMatch = lead.business_name?.toLowerCase().includes(query);
      const phoneMatch = lead.phone?.toLowerCase().includes(query);
      const emailMatch = lead.email?.toLowerCase().includes(query);
      const igMatch = lead.instagram_handle?.toLowerCase().includes(query);
      
      const searchMatches = !query || nameMatch || bizMatch || phoneMatch || emailMatch || igMatch;
      const statusMatches = statusFilter === 'All' || lead.status === statusFilter;

      return searchMatches && statusMatches;
    });
  }, [leads, searchQuery, statusFilter]);

  const sortedLeads = useMemo(() => {
    const sortableLeads = [...filteredLeads];
    if (!sortConfig.key) return sortableLeads;

    sortableLeads.sort((a, b) => {
      let aVal = '';
      let bVal = '';

      if (sortConfig.key.startsWith('custom_fields.')) {
        const colName = sortConfig.key.split('.')[1];
        aVal = (a.custom_fields && a.custom_fields[colName]) || '';
        bVal = (b.custom_fields && b.custom_fields[colName]) || '';
      } else if (sortConfig.key === 'priority') {
        const weights = { High: 3, Medium: 2, Low: 1 };
        aVal = weights[a.priority] || 0;
        bVal = weights[b.priority] || 0;
      } else {
        aVal = a[sortConfig.key] || '';
        bVal = b[sortConfig.key] || '';
      }

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
    return sortableLeads;
  }, [filteredLeads, sortConfig]);

  const handleRequestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const isViewer = session?.role === 'Viewer';

  // Render SQL schema missing block
  const renderSchemaInstructions = () => (
    <div style={{ maxWidth: '800px', margin: '4rem auto', border: '1px solid #111', padding: '2rem' }}>
      <h3 style={{ textTransform: 'uppercase', letterSpacing: '-0.01em', fontWeight: 800 }}>Database Schema Required</h3>
      <p className="text-sm text-muted mb-4">
        The database was successfully contacted, but required tables (<code>leads</code> or <code>collaborators</code>) are missing.
      </p>
      <p className="text-sm font-semibold">Please execute the SQL commands below in your Supabase SQL Editor to initialize the database:</p>
      <pre style={{ backgroundColor: '#fafafa', padding: '1rem', border: '1px solid #e5e7eb', overflowX: 'auto', fontSize: '0.8rem' }}>
{`create table leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  business_name text,
  phone text,
  email text,
  status text check (status in ('cold/ Not Contacted', 'Warm', 'Interested – Call Back Later', 'Uncertain – Call Back Later', 'Proposal Sent', 'No Answer / Ghosted', 'Closed')) default 'cold/ Not Contacted',
  priority text check (priority in ('High', 'Medium', 'Low')) default 'Medium',
  lead_source text check (lead_source in ('Manual', 'PhantomBuster', 'Google Sheets', 'Referral', 'Website', 'LinkedIn', 'Instagram', 'Other')) default 'Manual',
  meeting_date date,
  general_notes text,
  instagram_handle text,
  approached text,
  custom_fields jsonb default '{}'::jsonb
);

create table collaborators (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  role text check (role in ('Viewer', 'Editor')) not null,
  invite_token uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table leads enable row level security;
alter table collaborators enable row level security;

create policy "Allow all users to manage leads" on leads for all using (true) with check (true);
create policy "Allow all users to manage collaborators" on collaborators for all using (true) with check (true);

alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table collaborators;`}
      </pre>
      <div className="flex gap-2 mt-4">
        <button onClick={fetchLeads}>I've Created the Tables (Retry)</button>
        <button className="secondary danger" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );

  // If Supabase credentials are not configured in environment variables
  if (!supabaseConfig) {
    return (
      <div style={{ maxWidth: '500px', margin: '8rem auto', border: '1px solid #111', padding: '2.5rem', textAlign: 'center' }}>
        <ShieldAlert size={32} style={{ margin: '0 auto 1rem auto', color: '#dc2626' }} />
        <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Environment Variables Missing</h3>
        <p className="text-sm text-muted mb-4">
          Supabase keys are missing. Please configure your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
        </p>
        <p className="text-xs text-muted">Restart your Vite dev server after creating or updating the <code>.env</code> file.</p>
      </div>
    );
  }

  // If not authenticated
  if (!session) {
    return (
      <div>
        {error && (
          <div style={{ maxWidth: '400px', margin: '2rem auto -1rem auto', border: '1px solid #dc2626', padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        <Auth onAuthSuccess={(sess) => setSession(sess)} />
      </div>
    );
  }

  // Schema check warning
  if (schemaError) {
    return renderSchemaInstructions();
  }

  return (
    <div>
      {/* Header */}
      <header className="app-header">
        <div className="app-title-area">
          <h1 className="app-title">Lead CRM</h1>
          <span className="app-subtitle">
            Web Design Agency — {session.isCollaborator ? (
              <span className={`badge ${session.role === 'Editor' ? 'badge-meeting' : 'badge-closed-lost'}`} style={{ textTransform: 'uppercase', fontSize: '0.65rem', padding: '0.1rem 0.4rem', border: 'none' }}>
                {session.role} MODE
              </span>
            ) : 'Owner Mode'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted" style={{ marginRight: '1rem' }}>
            User: <strong>{session.user.email}</strong>
          </span>
          
          <button 
            className="secondary" 
            style={{ 
              position: 'relative', 
              padding: '0.45rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer' 
            }} 
            onClick={() => setIsNotificationsOpen(true)}
            title="Follow-up Alerts"
          >
            <Bell size={14} />
            {dueLeadsCount > 0 && (
              <span 
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  border: '1px solid #ffffff'
                }}
              />
            )}
          </button>

          {!isViewer && (
            <button className="secondary" onClick={() => setIsMembersOpen(true)}>
              <Users size={14} /> Team Members
            </button>
          )}
          <button className="secondary danger" onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <StatsBar leads={leads} />

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="search-filter-group">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, company, email, phone, IG..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {PIPELINE_STATUSES.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div className="actions-group">
          {!isViewer && (
            <>
              <button onClick={handleQuickAddRow} className="secondary" title="Directly adds a blank row inside spreadsheet">
                <Plus size={14} /> Quick Add Row
              </button>
              <button onClick={() => { setSelectedLead(null); setIsLeadModalOpen(true); }}>
                <Plus size={14} /> Add Lead Modal
              </button>
            </>
          )}
          <button className="secondary" onClick={() => setIsCsvModalOpen(true)}>
            <FileSpreadsheet size={14} /> CSV Import / Export
          </button>
        </div>
      </div>

      {/* Custom Columns Manager (Hidden for Viewers) */}
      {!isViewer && (
        <div className="custom-columns-manager">
          <div className="manager-title">spreadsheet column manager</div>
          <div className="column-chips">
            {customColumns.map((col) => (
              <span key={col} className="column-chip">
                {col}
                <button onClick={() => handleDeleteCustomColumn(col)} aria-label={`Remove ${col} column`}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {customColumns.length === 0 && (
              <span className="text-xs text-muted" style={{ padding: '0.25rem 0' }}>No custom columns added yet. Type below to add one.</span>
            )}
          </div>
          <div className="add-column-form">
            <input
              type="text"
              placeholder="e.g. Skype, Budget, Instagram followers"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustomColumn(newColumnName);
              }}
            />
            <button className="secondary" onClick={() => handleAddCustomColumn(newColumnName)}>
              Add Column
            </button>
          </div>
        </div>
      )}

      {/* Leads Main Spreadsheet Grid */}
      {loading && leads.length === 0 ? (
        <div className="text-center text-muted" style={{ padding: '4rem' }}>
          Loading agency database...
        </div>
      ) : (
        <LeadTable
          leads={sortedLeads}
          customColumns={customColumns}
          sortConfig={sortConfig}
          onRequestSort={handleRequestSort}
          onUpdateLead={handleUpdateLeadField}
          onDeleteLead={handleDeleteLead}
          onEditClick={(lead) => {
            setSelectedLead(lead);
            setIsLeadModalOpen(true);
          }}
          onTriggerCallbackPrompt={handleTriggerCallbackPrompt}
          readOnly={isViewer}
        />
      )}

      {/* Lead Add/Edit Modal */}
      {isLeadModalOpen && (
        <LeadModal
          lead={selectedLead}
          customColumns={customColumns}
          onClose={() => {
            setIsLeadModalOpen(false);
            setSelectedLead(null);
          }}
          onSave={handleSaveLead}
        />
      )}

      {/* CSV Import/Export Modal */}
      {isCsvModalOpen && (
        <CsvImportExport
          leads={leads}
          customColumns={customColumns}
          onAddCustomColumn={handleAddCustomColumn}
          onImportComplete={handleBulkImport}
          onClose={() => setIsCsvModalOpen(false)}
        />
      )}

      {/* Team Members Modal */}
      {isMembersOpen && (
        <MembersModal 
          onClose={() => setIsMembersOpen(false)} 
        />
      )}

      {/* Notification Drawer */}
      {isNotificationsOpen && (
        <NotificationDrawer
          leads={leads}
          onMarkAsContacted={handleMarkAsContacted}
          onViewLead={handleViewLead}
          onClose={() => setIsNotificationsOpen(false)}
        />
      )}

      {/* Callback Prompt Modal */}
      {activeCallbackPrompt && (
        <FollowUpPromptModal
          leadName={activeCallbackPrompt.lead.full_name}
          onConfirm={({ date }) => {
            handleSaveCallbackInline(activeCallbackPrompt.lead.id, activeCallbackPrompt.newStatus, date);
            setActiveCallbackPrompt(null);
          }}
          onCancel={() => {
            setActiveCallbackPrompt(null);
          }}
        />
      )}
    </div>
  );
}
