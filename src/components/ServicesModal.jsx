import React, { useState } from 'react';
import { X, Plus, Edit2, Check, Trash2 } from 'lucide-react';

export const INITIAL_SERVICES = [
  {
    id: 'srv-1',
    name: 'Custom Interactive Website',
    description: 'High-converting, responsive custom interactive website built for conversions and lead capture.',
    starting_price: 970,
    currency: 'AUD',
    is_active: true
  },
  {
    id: 'srv-2',
    name: 'Google Ads',
    description: 'Targeted search engine marketing and high-intent Google Search & Maps campaigns.',
    starting_price: 500,
    currency: 'AUD',
    is_active: true
  },
  {
    id: 'srv-3',
    name: 'Meta Ads',
    description: 'Facebook and Instagram targeted lead generation and retargeting ad campaigns.',
    starting_price: 450,
    currency: 'AUD',
    is_active: true
  },
  {
    id: 'srv-4',
    name: 'SEO',
    description: 'Search engine optimization, Google Business Profile optimization, and local search visibility.',
    starting_price: 600,
    currency: 'AUD',
    is_active: true
  },
  {
    id: 'srv-5',
    name: 'Social Media Marketing',
    description: 'Organic content management, profile optimization, and social audience growth.',
    starting_price: 400,
    currency: 'AUD',
    is_active: true
  },
  {
    id: 'srv-6',
    name: 'Content Creation',
    description: 'Professional copywriting, visual brand assets, and service showcase media.',
    starting_price: 350,
    currency: 'AUD',
    is_active: true
  },
  {
    id: 'srv-7',
    name: 'Lead Follow-up / Sales Automation',
    description: 'Automated SMS, email, and WhatsApp lead nurturing and instant booking workflows.',
    starting_price: 550,
    currency: 'AUD',
    is_active: true
  }
];

export function getInitialServices() {
  try {
    const saved = localStorage.getItem('leadbase_services');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return INITIAL_SERVICES;
}

export default function ServicesModal({ services = [], onSaveServices, onClose, readOnly = false }) {
  const [serviceList, setServiceList] = useState(() => services.length > 0 ? services : getInitialServices());
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    starting_price: '',
    currency: 'AUD',
    is_active: true
  });

  const handleStartAdd = () => {
    setFormData({
      name: '',
      description: '',
      starting_price: '',
      currency: 'AUD',
      is_active: true
    });
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (service) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      starting_price: service.starting_price !== undefined ? service.starting_price : '',
      currency: service.currency || 'AUD',
      is_active: service.is_active !== false
    });
    setEditingId(service.id);
    setIsAdding(false);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    let updatedList = [];
    if (isAdding) {
      const newService = {
        id: `srv-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        starting_price: formData.starting_price ? parseFloat(formData.starting_price) : 0,
        currency: formData.currency || 'AUD',
        is_active: formData.is_active
      };
      updatedList = [...serviceList, newService];
    } else if (editingId) {
      updatedList = serviceList.map(s => s.id === editingId ? {
        ...s,
        name: formData.name.trim(),
        description: formData.description.trim(),
        starting_price: formData.starting_price !== '' ? parseFloat(formData.starting_price) : 0,
        currency: formData.currency || 'AUD',
        is_active: formData.is_active
      } : s);
    }

    setServiceList(updatedList);
    onSaveServices(updatedList);
    localStorage.setItem('leadbase_services', JSON.stringify(updatedList));
    setIsAdding(false);
    setEditingId(null);
  };

  const handleToggleActive = (id) => {
    if (readOnly) return;
    const updated = serviceList.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s);
    setServiceList(updated);
    onSaveServices(updated);
    localStorage.setItem('leadbase_services', JSON.stringify(updated));
  };

  const handleDelete = (id) => {
    if (readOnly) return;
    if (!confirm('Are you sure you want to remove this service from the catalogue?')) return;
    const updated = serviceList.filter(s => s.id !== id);
    setServiceList(updated);
    onSaveServices(updated);
    localStorage.setItem('leadbase_services', JSON.stringify(updated));
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Service Catalogue</h3>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              Configured services offered by your agency. AI recommendations match leads to this catalogue.
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!readOnly && !isAdding && !editingId && (
          <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
            <button onClick={handleStartAdd} className="flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
              <Plus size={14} /> Add Service
            </button>
          </div>
        )}

        {(isAdding || editingId) && (
          <form onSubmit={handleSaveItem} style={{ border: '1px solid #111', padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#fafafa' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase' }}>
              {isAdding ? 'Add New Service' : 'Edit Service'}
            </h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Service Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Custom Interactive Website"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Starting Price ({formData.currency})</label>
                <input
                  type="number"
                  placeholder="970"
                  min="0"
                  value={formData.starting_price}
                  onChange={(e) => setFormData({ ...formData, starting_price: e.target.value })}
                />
              </div>
              <div className="form-group-full">
                <label>Description</label>
                <textarea
                  rows="2"
                  placeholder="Brief service description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="form-group flex items-center gap-2" style={{ marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_active_chk"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <label htmlFor="is_active_chk" style={{ margin: 0, cursor: 'pointer' }}>
                  Active (available for AI recommendations)
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" className="secondary" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                Cancel
              </button>
              <button type="submit">
                Save Service
              </button>
            </div>
          </form>
        )}

        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e5e7eb' }}>
          <table style={{ fontSize: '0.8125rem' }}>
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Starting Price</th>
                <th>Status</th>
                {!readOnly && <th style={{ textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {serviceList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-muted" style={{ padding: '2rem' }}>
                    No services configured. Click "Add Service" to populate catalogue.
                  </td>
                </tr>
              ) : (
                serviceList.map((service) => (
                  <tr key={service.id} style={{ opacity: service.is_active ? 1 : 0.6 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{service.name}</div>
                      {service.description && (
                        <div className="text-xs text-muted">{service.description}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {service.starting_price ? `${service.currency || 'AUD'} ${service.starting_price}` : 'Quote required'}
                    </td>
                    <td>
                      <span
                        className={`badge ${service.is_active ? 'badge-warm' : 'badge-closed-lost'}`}
                        style={{ cursor: readOnly ? 'default' : 'pointer' }}
                        onClick={() => handleToggleActive(service.id)}
                        title="Click to toggle active status"
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {!readOnly && (
                      <td style={{ textAlign: 'center' }}>
                        <div className="row-actions">
                          <button onClick={() => handleStartEdit(service)} title="Edit service">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDelete(service.id)} className="danger" title="Delete service">
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

        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
