import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  MapPin, 
  Building, 
  User, 
  Phone, 
  Mail, 
  Sparkles, 
  Target, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  Plus, 
  RotateCw,
  ExternalLink
} from 'lucide-react';
import { INITIAL_SERVICES } from './ServicesModal';

const STATUS_OPTIONS = [
  'cold/ Not Contacted',
  'Warm',
  'Interested – Call Back Later',
  'Uncertain – Call Back Later',
  'Proposal Sent',
  'No Answer / Ghosted',
  'Closed'
];

const RESEARCH_STATUS_OPTIONS = [
  'Not Researched',
  'Research Queued',
  'Researching',
  'Research Complete',
  'Research Failed'
];

const OUTREACH_STATUS_OPTIONS = [
  'Not Drafted',
  'Draft Ready',
  'Needs Review',
  'Approved',
  'Sent',
  'Replied',
  'Follow-up',
  'Not Interested',
  'Converted'
];

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const SOURCE_OPTIONS = ['Manual', 'PhantomBuster', 'Google Sheets', 'Referral', 'Website', 'LinkedIn', 'Instagram', 'Other'];

const getTodayString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function LeadModal({ 
  lead, 
  allLeads = [], 
  customColumns = [], 
  servicesList = [], 
  onClose, 
  onSave,
  readOnly = false 
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'research' | 'opportunity' | 'outreach' | 'activity'
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);

  // Core Form State
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    email: '',
    status: 'cold/ Not Contacted',
    priority: 'Medium',
    lead_source: 'Manual',
    general_notes: '',
    instagram_handle: '',
    last_contacted_date: getTodayString(),
    follow_up_days: '',
    follow_up_channel: 'none',

    // New AI & Prospecting Fields
    website: '',
    location: '',
    niche: '',
    ai_lead_score: '',
    research_status: 'Not Researched',
    outreach_status: 'Not Drafted',
    website_exists: true,
    website_status: 'Active',
    website_score: '',
    primary_opportunity: 'Custom Interactive Website',
    secondary_opportunities: ['Google Ads', 'Local SEO'],
    ai_reasoning: 'The business is active but has a visually dated website with a weak booking flow, resulting in lost conversions.',
    personalized_message: '',
    message_template: 'Website Opportunity Pitch',
    message_edited: false,
    approval_status: 'Pending',
    contacted_at: '',
    follow_up_date: '',
    follow_up_status: ''
  });

  const [customFields, setCustomFields] = useState({});
  const [customCallbackDate, setCustomCallbackDate] = useState('');
  
  // Research breakdown & activity log state
  const [problems, setProblems] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [newActivityNote, setNewActivityNote] = useState('');

  // Available services list for opportunity selection
  const availableServices = servicesList.length > 0 ? servicesList : INITIAL_SERVICES;

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
        general_notes: lead.general_notes || '',
        instagram_handle: lead.instagram_handle || '',
        last_contacted_date: lead.last_contacted_date || getTodayString(),
        follow_up_days: lead.follow_up_days !== null && lead.follow_up_days !== undefined ? lead.follow_up_days : '',
        follow_up_channel: lead.follow_up_channel || 'none',

        website: lead.website || '',
        location: lead.location || '',
        niche: lead.niche || '',
        ai_lead_score: lead.ai_lead_score !== undefined && lead.ai_lead_score !== null && lead.ai_lead_score !== '' ? lead.ai_lead_score : '',
        research_status: lead.research_status || 'Not Researched',
        outreach_status: lead.outreach_status || 'Not Drafted',
        website_exists: lead.website_exists !== false,
        website_status: lead.website_status || 'Active',
        website_score: lead.website_score !== undefined && lead.website_score !== null ? lead.website_score : '',
        primary_opportunity: lead.primary_opportunity || 'Custom Interactive Website',
        secondary_opportunities: Array.isArray(lead.secondary_opportunities) 
          ? lead.secondary_opportunities 
          : ['Google Ads', 'Local SEO'],
        ai_reasoning: lead.ai_reasoning || 'The website is functional but has poor mobile CTA visibility and an outdated booking flow.',
        personalized_message: lead.personalized_message || generateDefaultMessage(lead),
        message_template: lead.message_template || 'Website Pitch',
        message_edited: lead.message_edited || false,
        approval_status: lead.approval_status || 'Pending',
        contacted_at: lead.contacted_at || '',
        follow_up_date: lead.follow_up_date || '',
        follow_up_status: lead.follow_up_status || ''
      });

      setCustomFields(lead.custom_fields || {});

      // Setup research problems if available
      if (Array.isArray(lead.website_problems) && lead.website_problems.length > 0) {
        setProblems(lead.website_problems);
      } else {
        setProblems([
          {
            problem: 'No clear booking CTA above the fold',
            impact: 'Visitors leave without discovering how to book an appointment.',
            opportunity: 'Add a high-contrast sticky booking button.',
            solution: 'Custom Interactive Website'
          },
          {
            problem: 'Mobile page load speed is slow',
            impact: 'High bounce rate from mobile visitors.',
            opportunity: 'Optimize images and streamline layout structure.',
            solution: 'Custom Interactive Website'
          }
        ]);
      }

      // Setup activity log
      if (Array.isArray(lead.activity_log) && lead.activity_log.length > 0) {
        setActivityLog(lead.activity_log);
      } else {
        setActivityLog([
          {
            id: 'act-1',
            timestamp: lead.created_at || new Date().toISOString(),
            type: 'System',
            description: 'Lead created in CRM database.',
            actor: 'System'
          }
        ]);
      }
    } else {
      // New lead creation defaults
      setFormData(prev => ({
        ...prev,
        personalized_message: generateDefaultMessage(null)
      }));
    }
  }, [lead]);

  function generateDefaultMessage(targetLead) {
    const name = targetLead?.full_name || '[Name]';
    const biz = targetLead?.business_name || '[Business Name]';
    return `Hey ${name}, I came across ${biz} and really liked your work.\n\nI noticed a few opportunities on your website that could help convert more visitors into direct enquiries.\n\nWe build custom interactive websites starting at AUD 970 designed specifically to increase bookings. Would love to send over a quick 2-minute video showing what can be improved!`;
  }

  // Duplicate Check Helper
  const duplicateLead = allLeads.find(l => {
    if (!lead && !formData.phone && !formData.website && !formData.business_name) return false;
    if (lead && l.id === lead.id) return false;

    const matchPhone = formData.phone && formData.phone !== '----' && l.phone && l.phone !== '----' && l.phone.trim() === formData.phone.trim();
    const matchWebsite = formData.website && formData.website !== '----' && l.website && l.website !== '----' && l.website.toLowerCase().trim() === formData.website.toLowerCase().trim();
    const matchBizLoc = formData.business_name && formData.location && l.business_name && l.location &&
      l.business_name.toLowerCase().trim() === formData.business_name.toLowerCase().trim() &&
      l.location.toLowerCase().trim() === formData.location.toLowerCase().trim();

    return matchPhone || matchWebsite || matchBizLoc;
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (colName, value) => {
    setCustomFields(prev => ({ ...prev, [colName]: value }));
  };

  const handleCopyMessage = () => {
    if (!formData.personalized_message) return;
    navigator.clipboard.writeText(formData.personalized_message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleApproveMessage = () => {
    setFormData(prev => ({
      ...prev,
      approval_status: 'Approved',
      outreach_status: 'Approved'
    }));
    addActivityLog('Outreach message approved for delivery.');
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    if (!newActivityNote.trim()) return;
    addActivityLog(newActivityNote.trim(), 'Manual Note');
    setNewActivityNote('');
  };

  const addActivityLog = (description, type = 'System') => {
    const newEntry = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: type,
      description: description,
      actor: 'User'
    };
    setActivityLog(prev => [newEntry, ...prev]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;

    // Clean inputs: default empty string fields to '----' where suitable
    const cleanName = formData.full_name.trim() !== '' ? formData.full_name.trim() : '----';
    const cleanBiz = formData.business_name.trim() !== '' ? formData.business_name.trim() : '----';
    const cleanPhone = formData.phone.trim() !== '' ? formData.phone.trim() : '----';
    const cleanEmail = formData.email.trim() !== '' ? formData.email.trim() : '----';
    const cleanNotes = formData.general_notes.trim() !== '' ? formData.general_notes.trim() : '----';
    const cleanHandle = formData.instagram_handle.trim() !== '' ? formData.instagram_handle.trim() : '----';
    const cleanWebsite = formData.website.trim() !== '' ? formData.website.trim() : '----';
    const cleanLocation = formData.location.trim() !== '' ? formData.location.trim() : '----';
    const cleanNiche = formData.niche.trim() !== '' ? formData.niche.trim() : '----';

    const cleanCustomFields = {};
    customColumns.forEach(col => {
      const val = customFields[col];
      cleanCustomFields[col] = val && val.trim() !== '' ? val.trim() : '----';
    });

    const leadData = {
      ...formData,
      full_name: cleanName,
      business_name: cleanBiz,
      phone: cleanPhone,
      email: cleanEmail,
      general_notes: cleanNotes,
      instagram_handle: cleanHandle,
      website: cleanWebsite,
      location: cleanLocation,
      niche: cleanNiche,
      custom_fields: cleanCustomFields,
      website_problems: problems,
      activity_log: activityLog
    };

    onSave(leadData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '850px', padding: '1.75rem' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>
                {lead ? formData.full_name || 'Lead Details' : 'Add New Lead'}
              </h3>
              {duplicateLead && (
                <span className="badge badge-cold flex items-center gap-1" style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.7rem' }}>
                  <AlertTriangle size={12} /> Possible Duplicate Lead
                </span>
              )}
            </div>
            {formData.business_name && formData.business_name !== '----' && (
              <div className="text-xs text-muted mt-1">{formData.business_name} • {formData.location || 'Location N/A'}</div>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Duplicate Lead Warning Alert */}
        {duplicateLead && (
          <div style={{ border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem 1rem', fontSize: '0.8rem', marginBottom: '1rem' }} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>Matching record detected in database: <strong>{duplicateLead.full_name}</strong> ({duplicateLead.business_name})</span>
            </div>
          </div>
        )}

        {/* Progressive Disclosure Tabs Header */}
        <div className="auth-tabs" style={{ marginBottom: '1.25rem' }}>
          <div className={`auth-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            1. Overview
          </div>
          <div className={`auth-tab ${activeTab === 'research' ? 'active' : ''}`} onClick={() => setActiveTab('research')}>
            2. Research
          </div>
          <div className={`auth-tab ${activeTab === 'opportunity' ? 'active' : ''}`} onClick={() => setActiveTab('opportunity')}>
            3. Opportunity
          </div>
          <div className={`auth-tab ${activeTab === 'outreach' ? 'active' : ''}`} onClick={() => setActiveTab('outreach')}>
            4. Outreach
          </div>
          <div className={`auth-tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            5. Activity
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Top Highlights Grid */}
              <div className="form-grid mb-4">
                
                {/* Business Info Card */}
                <div style={{ border: '1px solid #e5e7eb', padding: '1rem', backgroundColor: '#fafafa' }}>
                  <h4 className="manager-title" style={{ color: '#111', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building size={14} /> Business & Contact
                  </h4>
                  <div className="text-xs flex-col gap-1 mt-2" style={{ lineHeight: '1.6' }}>
                    <div>Business: <strong>{formData.business_name || '----'}</strong></div>
                    <div>Contact: <strong>{formData.full_name || '----'}</strong></div>
                    <div>Niche: <strong>{formData.niche || '----'}</strong></div>
                    <div>Location: <strong>{formData.location || '----'}</strong></div>
                    <div>Website: {formData.website && formData.website !== '----' ? (
                      <a href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} target="_blank" rel="noreferrer" className="text-muted font-semibold underline">
                        {formData.website} <ExternalLink size={10} style={{ display: 'inline' }} />
                      </a>
                    ) : '----'}</div>
                    <div>Phone: <strong>{formData.phone || '----'}</strong></div>
                    <div>Email: <strong>{formData.email || '----'}</strong></div>
                    <div>Instagram: <strong>{formData.instagram_handle || '----'}</strong></div>
                  </div>
                </div>

                {/* Lead Status & Score Card */}
                <div style={{ border: '1px solid #e5e7eb', padding: '1rem', backgroundColor: '#fafafa' }}>
                  <h4 className="manager-title" style={{ color: '#111', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={14} /> Lead Status & AI Score
                  </h4>
                  <div className="flex items-center gap-3 my-2">
                    <div style={{ border: '2px solid #111', width: '54px', height: '54px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: formData.ai_lead_score !== '' ? '1.1rem' : '1.3rem', backgroundColor: formData.ai_lead_score !== '' ? '#fff' : '#f3f4f6', color: formData.ai_lead_score !== '' ? '#111' : '#666' }}>
                      {formData.ai_lead_score !== '' && formData.ai_lead_score !== null && formData.ai_lead_score !== undefined ? formData.ai_lead_score : '—'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">
                        {formData.ai_lead_score !== '' && formData.ai_lead_score !== null && formData.ai_lead_score !== undefined ? 'AI Lead Score' : 'Not Scored'}
                      </div>
                      <div className="text-xs text-muted">
                        {formData.ai_lead_score !== '' && formData.ai_lead_score !== null && formData.ai_lead_score !== undefined ? 'Fit & Prospect Viability Rating' : 'Pending Research Completion'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs flex-col gap-1 mt-3" style={{ lineHeight: '1.6' }}>
                    <div>Pipeline Status: <span className="badge badge-warm">{formData.status}</span></div>
                    <div>Priority: <strong>{formData.priority}</strong></div>
                    <div>Research Status: <span className="badge badge-cold">{formData.research_status}</span></div>
                    <div>Outreach Status: <span className="badge badge-hot">{formData.outreach_status}</span></div>
                  </div>
                </div>

              </div>

              {/* Primary Opportunity Summary Banner */}
              <div style={{ border: '1px solid #111', padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }} className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-muted text-uppercase" style={{ letterSpacing: '0.05em' }}>Primary Opportunity</div>
                  <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.05rem', fontWeight: 800 }}>
                    {formData.primary_opportunity || 'Custom Interactive Website'}
                  </h4>
                  <div className="text-xs text-muted mt-1">{formData.ai_reasoning}</div>
                </div>
                <button type="button" className="secondary" onClick={() => setActiveTab('opportunity')} style={{ fontSize: '0.75rem', height: '32px' }}>
                  View Opportunity
                </button>
              </div>

              {/* Core Fields Form Grid */}
              <h4 className="manager-title">Edit Core Attributes</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="full_name">Full Name / Contact *</label>
                  <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} required readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="business_name">Business Name</label>
                  <input id="business_name" name="business_name" type="text" value={formData.business_name} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" name="phone" type="text" value={formData.phone} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="website">Website URL</label>
                  <input id="website" name="website" type="text" placeholder="https://company.com" value={formData.website} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="location">Location / City</label>
                  <input id="location" name="location" type="text" placeholder="e.g. Sydney, AU" value={formData.location} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="niche">Niche / Industry</label>
                  <input id="niche" name="niche" type="text" placeholder="e.g. Car Detailing" value={formData.niche} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="status">Pipeline Status</label>
                  <select id="status" name="status" value={formData.status} onChange={handleChange} disabled={readOnly}>
                    {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="priority">Priority</label>
                  <select id="priority" name="priority" value={formData.priority} onChange={handleChange} disabled={readOnly}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="lead_source">Lead Source</label>
                  <select id="lead_source" name="lead_source" value={formData.lead_source} onChange={handleChange} disabled={readOnly}>
                    {SOURCE_OPTIONS.map(src => <option key={src} value={src}>{src}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="instagram_handle">Instagram Handle</label>
                  <input id="instagram_handle" name="instagram_handle" type="text" placeholder="@handle" value={formData.instagram_handle} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="ai_lead_score">AI Lead Score (0–100)</label>
                  <input id="ai_lead_score" name="ai_lead_score" type="number" min="0" max="100" value={formData.ai_lead_score} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group-full">
                  <label htmlFor="general_notes">General Notes</label>
                  <textarea id="general_notes" name="general_notes" rows="2" value={formData.general_notes} onChange={handleChange} readOnly={readOnly} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESEARCH */}
          {activeTab === 'research' && (
            <div>
              {/* Website Overview Banner */}
              <div style={{ border: '1px solid #111', padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Website Research Analysis</h4>
                    <div className="text-xs text-muted mt-1">
                      URL: {formData.website ? <a href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} target="_blank" rel="noreferrer" className="underline">{formData.website}</a> : 'Not set'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-warm" style={{ fontSize: '0.75rem' }}>{formData.research_status}</span>
                  </div>
                </div>

                {/* High Level Health Meter */}
                <div className="flex items-center gap-4 my-3" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111' }}>{formData.website_score}/100</div>
                    <div className="text-xs text-muted">WEBSITE HEALTH</div>
                  </div>
                  <div className="text-xs" style={{ lineHeight: '1.5', borderLeft: '1px solid #e5e7eb', paddingLeft: '1rem' }}>
                    <strong>AI Research Summary:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#4b5563' }}>
                      {formData.ai_reasoning || 'The website is functional and has basic service information, but the booking journey and conversion elements could be significantly improved.'}
                    </p>
                  </div>
                </div>

                {/* Progressive Disclosure Toggle: View Full Analysis */}
                <div className="mt-3">
                  <button 
                    type="button" 
                    className="secondary w-full flex items-center justify-center gap-1" 
                    style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                    onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                  >
                    {showFullAnalysis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showFullAnalysis ? 'Hide Detailed Analysis Metrics' : 'View Full Technical Analysis (15+ Metrics)'}
                  </button>
                </div>

                {/* Expanded Technical Metrics */}
                {showFullAnalysis && (
                  <div className="mt-4" style={{ borderTop: '1px dashed #ccc', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem' }}>
                    <div>Overall Design Quality: <strong>Good (7/10)</strong></div>
                    <div>Mobile Responsiveness: <strong>Needs Work (5/10)</strong></div>
                    <div>Page Structure: <strong>Clear (8/10)</strong></div>
                    <div>CTA Visibility: <strong>Low (4/10)</strong></div>
                    <div>Booking / Contact Flow: <strong>Multi-step (5/10)</strong></div>
                    <div>Services Presentation: <strong>Detailed (8/10)</strong></div>
                    <div>Pricing Presentation: <strong>Missing / Quote only</strong></div>
                    <div>Portfolio / Showcase: <strong>Present</strong></div>
                    <div>Before / After Presentation: <strong>None</strong></div>
                    <div>Testimonials & Reviews: <strong>3 Reviews</strong></div>
                    <div>Social Proof Signals: <strong>Moderate</strong></div>
                    <div>WhatsApp Direct Link: <strong>Not Configured</strong></div>
                    <div>Local SEO Signals: <strong>Basic Meta tags</strong></div>
                    <div>Basic SEO Health: <strong>Indexed</strong></div>
                    <div>Conversion Opportunity: <strong>High</strong></div>
                  </div>
                )}
              </div>

              {/* Identified Problems Breakdown */}
              <h4 className="manager-title">Problem → Impact → Opportunity Breakdown</h4>
              {problems.length === 0 ? (
                <div className="text-center text-muted text-xs p-4" style={{ border: '1px solid #e5e7eb' }}>
                  No research problems recorded yet.
                </div>
              ) : (
                problems.map((item, idx) => (
                  <div key={idx} style={{ border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '0.75rem', backgroundColor: '#fafafa' }}>
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem' }}>Problem {idx + 1}: {item.problem}</div>
                    <div className="text-xs mt-1"><strong>Business Impact:</strong> {item.impact}</div>
                    <div className="text-xs mt-1"><strong>Opportunity:</strong> {item.opportunity}</div>
                    <div className="text-xs mt-1" style={{ color: '#16a34a' }}><strong>Recommended Solution:</strong> {item.solution}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: OPPORTUNITY */}
          {activeTab === 'opportunity' && (
            <div>
              {/* Primary Opportunity Banner */}
              <div style={{ border: '2px solid #111', padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-warm" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>Primary Recommended Opportunity</span>
                  <span className="text-xs font-semibold">Starting Price: AUD 970</span>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 800 }}>
                  {formData.primary_opportunity}
                </h3>
                <div className="text-xs" style={{ lineHeight: '1.6', color: '#374151' }}>
                  <strong>WHY THIS SERVICE:</strong>
                  <p style={{ margin: '0.25rem 0 0 0' }}>{formData.ai_reasoning}</p>
                </div>
              </div>

              {/* Secondary Opportunities */}
              <h4 className="manager-title">Secondary Opportunities</h4>
              <div className="column-chips mb-4">
                {formData.secondary_opportunities.map((sec, idx) => (
                  <span key={idx} className="column-chip" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db', fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}>
                    {sec}
                  </span>
                ))}
              </div>

              {/* Select Primary Service Form */}
              <h4 className="manager-title mt-4">Select Recommended Services from Catalogue</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="primary_opportunity">Primary Opportunity</label>
                  <select id="primary_opportunity" name="primary_opportunity" value={formData.primary_opportunity} onChange={handleChange} disabled={readOnly}>
                    {availableServices.filter(s => s.is_active !== false).map(srv => (
                      <option key={srv.id} value={srv.name}>{srv.name} (AUD {srv.starting_price})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-full">
                  <label htmlFor="ai_reasoning">AI Opportunity Reasoning</label>
                  <textarea id="ai_reasoning" name="ai_reasoning" rows="3" value={formData.ai_reasoning} onChange={handleChange} readOnly={readOnly} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OUTREACH */}
          {activeTab === 'outreach' && (
            <div>
              {/* Outreach Controls Header */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Outreach Workflow Status:</span>
                  <select name="outreach_status" value={formData.outreach_status} onChange={handleChange} disabled={readOnly} style={{ height: '32px', fontSize: '0.8rem' }}>
                    {OUTREACH_STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <span className={`badge ${formData.approval_status === 'Approved' ? 'badge-meeting' : 'badge-warm'}`}>
                  Approval: {formData.approval_status}
                </span>
              </div>

              {/* Personalized Message Editor */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="personalized_message" style={{ margin: 0 }}>Personalized Outreach Message</label>
                  <div className="flex gap-2">
                    <button type="button" className="secondary" onClick={handleCopyMessage} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      {copiedMessage ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={12} />}
                      {copiedMessage ? 'Copied' : 'Copy Message'}
                    </button>
                    {!readOnly && formData.approval_status !== 'Approved' && (
                      <button type="button" onClick={handleApproveMessage} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#fff' }}>
                        <CheckCircle size={12} /> Approve
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  id="personalized_message"
                  name="personalized_message"
                  rows="7"
                  value={formData.personalized_message}
                  onChange={(e) => {
                    handleChange(e);
                    if (!formData.message_edited) setFormData(prev => ({ ...prev, message_edited: true }));
                  }}
                  readOnly={readOnly}
                  style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', lineHeight: '1.5' }}
                />
              </div>

              {/* Outreach Metadata Grid */}
              <div className="form-grid" style={{ fontSize: '0.8rem' }}>
                <div className="form-group">
                  <label htmlFor="contacted_at">Contacted Date</label>
                  <input id="contacted_at" name="contacted_at" type="date" value={formData.contacted_at ? formData.contacted_at.slice(0,10) : ''} onChange={handleChange} readOnly={readOnly} />
                </div>
                <div className="form-group">
                  <label htmlFor="follow_up_date">Follow-up Date</label>
                  <input id="follow_up_date" name="follow_up_date" type="date" value={formData.follow_up_date} onChange={handleChange} readOnly={readOnly} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACTIVITY */}
          {activeTab === 'activity' && (
            <div>
              {/* Add New Activity Log */}
              {!readOnly && (
                <div className="mb-4" style={{ border: '1px solid #e5e7eb', padding: '1rem', backgroundColor: '#fafafa' }}>
                  <h4 className="manager-title" style={{ marginBottom: '0.5rem' }}>Log Contact / Activity Event</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Sent WhatsApp intro message / Followed up via phone call..."
                      value={newActivityNote}
                      onChange={(e) => setNewActivityNote(e.target.value)}
                      style={{ flexGrow: 1, height: '36px' }}
                    />
                    <button type="button" onClick={handleAddActivity} style={{ height: '36px' }}>
                      Add Event
                    </button>
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <h4 className="manager-title">Activity Timeline</h4>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {activityLog.length === 0 ? (
                  <div className="text-center text-muted text-xs p-4">No activity logged yet.</div>
                ) : (
                  activityLog.map((act) => (
                    <div key={act.id} style={{ borderBottom: '1px solid #e5e7eb', padding: '0.75rem 0' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold">{act.type || 'Event'}</span>
                        <span className="text-xs text-muted">{new Date(act.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs mt-1" style={{ margin: '0.25rem 0 0 0', color: '#374151' }}>{act.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            {!readOnly && (
              <button type="submit" className="flex items-center gap-1">
                <Save size={14} /> Save Lead Details
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
