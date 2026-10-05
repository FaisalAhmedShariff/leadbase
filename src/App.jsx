import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient, getSupabaseConfig } from './supabaseClient';
import Auth from './components/Auth';
import StatsBar from './components/StatsBar';
import LeadTable from './components/LeadTable';
import LeadModal from './components/LeadModal';
import CsvImportExport from './components/CsvImportExport';
import MembersModal from './components/MembersModal';
import ServicesModal, { getInitialServices } from './components/ServicesModal';
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
  Bell,
  Briefcase,
  Sparkles,
  Filter
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
  const [servicesList, setServicesList] = useState(getInitialServices());
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
  const [researchFilter, setResearchFilter] = useState('All');
  const [outreachFilter, setOutreachFilter] = useState('All');
  const [kpiCardFilter, setKpiCardFilter] = useState('all');

  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [schemaError, setSchemaError] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Modals state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeCallbackPrompt, setActiveCallbackPrompt] = useState(null);

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

  // Fetch leads, services, and setup Realtime subscription
  useEffect(() => {
    if (!supabase || !session) {
      setLeads([]);
      return;
    }

    fetchLeads();
    fetchServices();

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

      setSession({
        user: { email: data.email },
        role: data.role,
        isCollaborator: true,
        token: token
      });

      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(err.message || 'Invitation validation failed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setServicesList(data);
      }
    } catch {
      // fallback to initial
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
    if (confirm(`Are you sure you want to remove custom column "${name}"? Data will be preserved.`)) {
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
          business_name: '----',
          phone: '----',
          email: '----',
          website: '----',
          location: '----',
          niche: '----',
          status: 'cold/ Not Contacted',
          priority: 'Medium',
          lead_source: 'Manual',
          ai_lead_score: 75,
          research_status: 'Not Researched',
          outreach_status: 'Not Drafted',
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
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', selectedLead.id);

        if (error) throw error;
      } else {
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
        fields.meeting_date = null;
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
      const updateData = { last_contacted_date: todayStr };

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
      const webMatch = lead.website?.toLowerCase().includes(query);
      const locMatch = lead.location?.toLowerCase().includes(query);
      const nicheMatch = lead.niche?.toLowerCase().includes(query);
      const igMatch = lead.instagram_handle?.toLowerCase().includes(query);
      
      const searchMatches = !query || nameMatch || bizMatch || phoneMatch || emailMatch || webMatch || locMatch || nicheMatch || igMatch;
      const statusMatches = statusFilter === 'All' || lead.status === statusFilter;
      const resMatches = researchFilter === 'All' || lead.research_status === researchFilter;
      const outMatches = outreachFilter === 'All' || lead.outreach_status === outreachFilter;

      // KPI card filter
      let kpiMatches = true;
      if (kpiCardFilter === 'new') kpiMatches = lead.status === 'cold/ Not Contacted';
      else if (kpiCardFilter === 'res_pending') kpiMatches = !lead.research_status || lead.research_status === 'Not Researched' || lead.research_status === 'Research Queued' || lead.research_status === 'Researching';
      else if (kpiCardFilter === 'res_complete') kpiMatches = lead.research_status === 'Research Complete';
      else if (kpiCardFilter === 'high_priority') kpiMatches = lead.priority === 'High';
      else if (kpiCardFilter === 'draft_ready') kpiMatches = lead.outreach_status === 'Draft Ready';
      else if (kpiCardFilter === 'needs_review') kpiMatches = lead.outreach_status === 'Needs Review';
      else if (kpiCardFilter === 'contacted') kpiMatches = lead.outreach_status === 'Sent' || lead.last_contacted_date;
      else if (kpiCardFilter === 'followups') kpiMatches = lead.status === 'Interested – Call Back Later' || lead.status === 'Uncertain – Call Back Later' || lead.outreach_status === 'Follow-up';
      else if (kpiCardFilter === 'converted') kpiMatches = lead.outreach_status === 'Converted' || lead.status === 'Closed';

      return searchMatches && statusMatches && resMatches && outMatches && kpiMatches;
    });
  }, [leads, searchQuery, statusFilter, researchFilter, outreachFilter, kpiCardFilter]);

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
      } else if (sortConfig.key === 'ai_lead_score') {
        aVal = a.ai_lead_score !== undefined ? a.ai_lead_score : 75;
        bVal = b.ai_lead_score !== undefined ? b.ai_lead_score : 75;
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
    <div style={{ maxWidth: '850px', margin: '4rem auto', border: '1px solid #111', padding: '2rem' }}>
      <h3 style={{ textTransform: 'uppercase', letterSpacing: '-0.01em', fontWeight: 800 }}>Database Schema Upgrade Script</h3>
      <p className="text-sm text-muted mb-4">
        Execute the SQL migration below in your Supabase SQL Editor to prepare your database schema for AI prospecting and service catalogue:
      </p>
      <pre style={{ backgroundColor: '#fafafa', padding: '1rem', border: '1px solid #e5e7eb', overflowX: 'auto', fontSize: '0.75rem', lineHeight: '1.4' }}>
{`-- Create services table if not exists
create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  starting_price numeric default 0,
  currency text default 'AUD',
  is_active boolean default true
);

-- Add AI Prospecting columns to leads table
alter table leads add column if not exists website text;
alter table leads add column if not exists location text;
alter table leads add column if not exists niche text;
alter table leads add column if not exists ai_lead_score integer default 75;
alter table leads add column if not exists research_status text default 'Not Researched';
alter table leads add column if not exists outreach_status text default 'Not Drafted';
alter table leads add column if not exists website_exists boolean default true;
alter table leads add column if not exists website_status text default 'Active';
alter table leads add column if not exists website_score integer default 72;
alter table leads add column if not exists research_completed_at timestamp with time zone;
alter table leads add column if not exists website_analysis jsonb default '{}'::jsonb;
alter table leads add column if not exists website_problems jsonb default '[]'::jsonb;
alter table leads add column if not exists website_strengths jsonb default '[]'::jsonb;
alter table leads add column if not exists business_opportunities jsonb default '[]'::jsonb;
alter table leads add column if not exists recommended_services jsonb default '[]'::jsonb;
alter table leads add column if not exists primary_opportunity text;
alter table leads add column if not exists secondary_opportunities jsonb default '[]'::jsonb;
alter table leads add column if not exists ai_reasoning text;
alter table leads add column if not exists message_template text;
alter table leads add column if not exists personalized_message text;
alter table leads add column if not exists message_edited boolean default false;
alter table leads add column if not exists approval_status text default 'Pending';
alter table leads add column if not exists contacted_at timestamp with time zone;
alter table leads add column if not exists follow_up_date date;
alter table leads add column if not exists follow_up_status text;
alter table leads add column if not exists activity_log jsonb default '[]'::jsonb;

-- Enable RLS policies
alter table leads enable row level security;
alter table services enable row level security;
alter table collaborators enable row level security;

create policy "Allow all users to manage leads" on leads for all using (true) with check (true);
create policy "Allow all users to manage services" on services for all using (true) with check (true);
create policy "Allow all users to manage collaborators" on collaborators for all using (true) with check (true);

alter publication supabase_realtime add table leads;`}
      </pre>
      <div className="flex gap-2 mt-4">
        <button onClick={fetchLeads}>I've Created/Migrated Tables (Retry)</button>
        <button className="secondary danger" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );

  if (!supabaseConfig) {
    return (
      <div style={{ maxWidth: '500px', margin: '8rem auto', border: '1px solid #111', padding: '2.5rem', textAlign: 'center' }}>
        <ShieldAlert size={32} style={{ margin: '0 auto 1rem auto', color: '#dc2626' }} />
        <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Environment Variables Missing</h3>
        <p className="text-sm text-muted mb-4">
          Supabase keys are missing. Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        {error && (
          <div style={{ maxWidth: '400px', margin: '2rem auto -1rem auto', border: '1px solid #dc2626', padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        <Auth onAuthSuccess={(supabaseSession) => setSession({
          user: supabaseSession.user,
          role: 'Owner',
          isCollaborator: false
        })} />
      </div>
    );
  }

  if (schemaError) {
    return renderSchemaInstructions();
  }

  return (
    <div>
      {/* Header */}
      <header className="app-header">
        <div className="app-title-area">
          <h1 className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Leadbase CRM <span style={{ fontSize: '0.65rem', backgroundColor: '#111', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '3px', fontWeight: 600 }}>AI READY</span>
          </h1>
          <span className="app-subtitle">
            Web Design Agency — {session.isCollaborator ? (
              <span className={`badge ${session.role === 'Editor' ? 'badge-meeting' : 'badge-closed-lost'}`} style={{ textTransform: 'uppercase', fontSize: '0.65rem', padding: '0.1rem 0.4rem', border: 'none' }}>
                {session.role} MODE
              </span>
            ) : 'Owner Mode'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted" style={{ marginRight: '0.5rem' }}>
            User: <strong>{session.user.email}</strong>
          </span>

          <button 
            className="secondary" 
            style={{ position: 'relative', padding: '0.45rem' }} 
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

          <button className="secondary" onClick={() => setIsServicesOpen(true)}>
            <Briefcase size={14} /> Services
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

      {/* KPI Stats Bar */}
      <StatsBar 
        leads={leads} 
        activeFilter={kpiCardFilter}
        onFilterClick={(cardId) => {
          if (kpiCardFilter === cardId) {
            setKpiCardFilter('all');
          } else {
            setKpiCardFilter(cardId);
          }
        }}
      />

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="search-filter-group" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="search-input-wrapper" style={{ minWidth: '240px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, company, website, location, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">Pipeline: All</option>
            {PIPELINE_STATUSES.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={researchFilter}
            onChange={(e) => setResearchFilter(e.target.value)}
          >
            <option value="All">Research: All</option>
            {['Not Researched', 'Research Queued', 'Researching', 'Research Complete', 'Research Failed'].map(rs => (
              <option key={rs} value={rs}>{rs}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={outreachFilter}
            onChange={(e) => setOutreachFilter(e.target.value)}
          >
            <option value="All">Outreach: All</option>
            {['Not Drafted', 'Draft Ready', 'Needs Review', 'Approved', 'Sent', 'Replied', 'Follow-up', 'Not Interested', 'Converted'].map(os => (
              <option key={os} value={os}>{os}</option>
            ))}
          </select>

          {(statusFilter !== 'All' || researchFilter !== 'All' || outreachFilter !== 'All' || kpiCardFilter !== 'all' || searchQuery) && (
            <button 
              className="secondary" 
              onClick={() => {
                setStatusFilter('All');
                setResearchFilter('All');
                setOutreachFilter('All');
                setKpiCardFilter('all');
                setSearchQuery('');
              }}
              style={{ fontSize: '0.75rem', height: '36px', padding: '0 0.5rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="actions-group">
          {!isViewer && (
            <>
              <button onClick={handleQuickAddRow} className="secondary" title="Quickly adds a blank row">
                <Plus size={14} /> Quick Add Row
              </button>
              <button onClick={() => { setSelectedLead(null); setIsLeadModalOpen(true); }}>
                <Plus size={14} /> Add Lead
              </button>
            </>
          )}
          <button className="secondary" onClick={() => setIsCsvModalOpen(true)}>
            <FileSpreadsheet size={14} /> CSV Import / Export
          </button>
        </div>
      </div>

      {/* Spreadsheet Column Manager (Hidden for Viewers) */}
      {!isViewer && (
        <div className="custom-columns-manager">
          <div className="manager-title">spreadsheet custom column manager</div>
          <div className="column-chips">
            {customColumns.map((col) => (
              <span key={col} className="column-chip">
                {col}
                <button onClick={() => handleDeleteCustomColumn(col)} aria-label={`Remove ${col}`}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {customColumns.length === 0 && (
              <span className="text-xs text-muted" style={{ padding: '0.25rem 0' }}>No custom columns added yet. Type below to add extra table columns.</span>
            )}
          </div>
          <div className="add-column-form">
            <input
              type="text"
              placeholder="e.g. Budget, Skype, IG Followers"
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

      {/* Main Clean Spreadsheet Table */}
      {loading && leads.length === 0 ? (
        <div className="text-center text-muted" style={{ padding: '4rem' }}>
          Loading Leadbase database...
        </div>
      ) : (
        <LeadTable
          leads={sortedLeads}
          allLeads={leads}
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

      {/* Lead Details Modal (5 Tabs & Progressive Disclosure) */}
      {isLeadModalOpen && (
        <LeadModal
          lead={selectedLead}
          allLeads={leads}
          customColumns={customColumns}
          servicesList={servicesList}
          onClose={() => {
            setIsLeadModalOpen(false);
            setSelectedLead(null);
          }}
          onSave={handleSaveLead}
          readOnly={isViewer}
        />
      )}

      {/* Services Catalogue Modal */}
      {isServicesOpen && (
        <ServicesModal
          services={servicesList}
          onSaveServices={(newList) => setServicesList(newList)}
          onClose={() => setIsServicesOpen(false)}
          readOnly={isViewer}
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
