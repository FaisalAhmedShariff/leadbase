import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Mail } from 'lucide-react';
import { getSupabaseClient } from '../supabaseClient';

export default function MembersModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Viewer');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch members.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setInviteUrl('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('collaborators')
        .insert([{
          email: email.trim().toLowerCase(),
          role: role
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const inviteToken = data[0].invite_token;
        const link = `${window.location.origin}/?invite_token=${inviteToken}`;
        setInviteUrl(link);
        setSuccessMsg(`Invite sent! Email simulated to ${email}. They can join instantly using this link:`);
        
        // Reset form
        setEmail('');
        setRole('Viewer');
        
        // Refresh members
        fetchMembers();
      }
    } catch (err) {
      setError(err.message || 'Failed to create invitation.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3 className="modal-title">CRM Collaborators</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-muted mb-4">
          Add team members to the CRM. Viewers can read all leads but cannot edit, import, or export. Editors have full write permissions. Members can join instantly by clicking the invitation link, without needing to sign up or sign in.
        </p>

        {error && <div className="text-error">{error}</div>}

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="mb-4" style={{ border: '1px solid #e5e7eb', padding: '1rem', backgroundColor: '#fafafa' }}>
          <h4 className="manager-title" style={{ marginBottom: '0.75rem' }}>Invite New Member</h4>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <div style={{ flexGrow: 1, minWidth: '200px' }}>
              <input
                type="email"
                placeholder="partner@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ height: '38px' }}
              />
            </div>
            <div style={{ width: '120px' }}>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ height: '38px' }}
              >
                <option value="Viewer">Viewer</option>
                <option value="Editor">Editor</option>
              </select>
            </div>
            <button type="submit" disabled={loading} style={{ height: '38px' }}>
              Send Invite
            </button>
          </div>
        </form>

        {/* Generated Invite Link */}
        {inviteUrl && (
          <div style={{ border: '1px solid #111', padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
            <span className="text-xs font-semibold text-success flex items-center gap-1 mb-2">
              <Mail size={12} /> {successMsg}
            </span>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                style={{ flexGrow: 1, backgroundColor: '#f9fafb', fontSize: '0.8rem', height: '34px' }}
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className="secondary"
                onClick={() => copyToClipboard(inviteUrl)}
                style={{ height: '34px', minWidth: '80px', padding: '0 0.5rem' }}
              >
                {copiedLink ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Members List */}
        <h4 className="manager-title" style={{ marginTop: '1.5rem' }}>Active Members</h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', marginTop: '0.5rem' }}>
          {loading && members.length === 0 ? (
            <div className="text-center text-muted p-4 text-xs">Loading members list...</div>
          ) : members.length === 0 ? (
            <div className="text-center text-muted p-4 text-xs">No collaborators invited yet.</div>
          ) : (
            <table style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem' }}>Email</th>
                  <th style={{ padding: '0.5rem' }}>Role</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Invite Link</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td style={{ padding: '0.5rem' }}>{member.email}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span className={`badge ${member.role === 'Editor' ? 'badge-meeting' : 'badge-closed-lost'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button
                        className="secondary"
                        onClick={() => copyToClipboard(`${window.location.origin}/?invite_token=${member.invite_token}`)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                        title="Copy Magic Invite Link"
                      >
                        Copy Link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
