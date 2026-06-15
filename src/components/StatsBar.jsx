import React from 'react';

export default function StatsBar({ leads = [] }) {
  const totalLeads = leads.length;

  const warmLeads = leads.filter(
    (lead) => lead.status === 'Warm'
  ).length;

  const callbacksScheduled = leads.filter(
    (lead) => lead.status === 'Interested – Call Back Later' || lead.status === 'Uncertain – Call Back Later'
  ).length;

  const proposalsSent = leads.filter(
    (lead) => lead.status === 'Proposal Sent'
  ).length;

  const closedLeads = leads.filter(
    (lead) => lead.status === 'Closed'
  ).length;

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <span className="stat-label">Total Leads</span>
        <span className="stat-value">{totalLeads}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Warm Leads</span>
        <span className="stat-value">{warmLeads}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Callbacks Scheduled</span>
        <span className="stat-value">{callbacksScheduled}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Proposals Sent</span>
        <span className="stat-value">{proposalsSent}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Closed</span>
        <span className="stat-value">{closedLeads}</span>
      </div>
    </div>
  );
}
