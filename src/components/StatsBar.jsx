import React from 'react';

export default function StatsBar({ leads = [], activeFilter = 'All', onFilterClick }) {
  const totalLeads = leads.length;

  const newLeads = leads.filter(
    (lead) => lead.status === 'cold/ Not Contacted'
  ).length;

  const researchPending = leads.filter(
    (lead) => !lead.research_status || lead.research_status === 'Not Researched' || lead.research_status === 'Research Queued' || lead.research_status === 'Researching'
  ).length;

  const researchComplete = leads.filter(
    (lead) => lead.research_status === 'Research Complete'
  ).length;

  const highPriority = leads.filter(
    (lead) => lead.priority === 'High'
  ).length;

  const draftMessages = leads.filter(
    (lead) => lead.outreach_status === 'Draft Ready'
  ).length;

  const needsReview = leads.filter(
    (lead) => lead.outreach_status === 'Needs Review'
  ).length;

  const contacted = leads.filter(
    (lead) => lead.outreach_status === 'Sent' || lead.outreach_status === 'Contacted' || lead.last_contacted_date
  ).length;

  const followupsDue = leads.filter(
    (lead) => lead.status === 'Interested – Call Back Later' || lead.status === 'Uncertain – Call Back Later' || lead.outreach_status === 'Follow-up'
  ).length;

  const converted = leads.filter(
    (lead) => lead.outreach_status === 'Converted' || lead.status === 'Closed'
  ).length;

  const cards = [
    { id: 'all', label: 'Total Leads', count: totalLeads },
    { id: 'new', label: 'New Leads', count: newLeads },
    { id: 'res_pending', label: 'Research Pending', count: researchPending },
    { id: 'res_complete', label: 'Research Complete', count: researchComplete },
    { id: 'high_priority', label: 'High Priority', count: highPriority },
    { id: 'draft_ready', label: 'Draft Messages', count: draftMessages },
    { id: 'needs_review', label: 'Needs Review', count: needsReview },
    { id: 'contacted', label: 'Contacted', count: contacted },
    { id: 'followups', label: 'Follow-ups', count: followupsDue },
    { id: 'converted', label: 'Converted', count: converted }
  ];

  return (
    <div className="stats-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
      {cards.map((card) => {
        const isActive = activeFilter === card.id;
        return (
          <div
            key={card.id}
            className="stat-card"
            style={{
              cursor: onFilterClick ? 'pointer' : 'default',
              borderColor: isActive ? '#111111' : '#e5e7eb',
              backgroundColor: isActive ? '#f9fafb' : '#ffffff',
              padding: '0.65rem 0.75rem'
            }}
            onClick={() => onFilterClick && onFilterClick(card.id)}
          >
            <span className="stat-label" style={{ fontSize: '0.68rem', letterSpacing: '0.03em' }}>{card.label}</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>{card.count}</span>
          </div>
        );
      })}
    </div>
  );
}
