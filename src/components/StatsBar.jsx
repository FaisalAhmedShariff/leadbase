import React from 'react';

export default function StatsBar({ leads = [] }) {
  const totalLeads = leads.length;

  const warmAndHot = leads.filter(
    (lead) => lead.status === 'Warm' || lead.status === 'Hot'
  ).length;

  const meetingsBooked = leads.filter(
    (lead) => lead.status === 'Meeting Booked'
  ).length;

  const closedWon = leads.filter(
    (lead) => lead.status === 'Closed Won'
  ).length;

  const instagramLeads = leads.filter(
    (lead) =>
      lead.lead_source === 'Instagram' ||
      (lead.instagram_handle && lead.instagram_handle.trim().replace(/^@/, '').length > 0)
  ).length;

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <span className="stat-label">Total Leads</span>
        <span className="stat-value">{totalLeads}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Warm + Hot</span>
        <span className="stat-value">{warmAndHot}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Meetings Booked</span>
        <span className="stat-value">{meetingsBooked}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Closed Won</span>
        <span className="stat-value">{closedWon}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Instagram Leads</span>
        <span className="stat-value">{instagramLeads}</span>
      </div>
    </div>
  );
}
