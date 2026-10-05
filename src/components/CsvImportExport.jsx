import React, { useState, useRef } from 'react';
import { Download, Upload, X } from 'lucide-react';

const STANDARD_FIELDS = {
  full_name: { label: 'Full Name *', defaultKeys: ['name', 'fullname', 'contact', 'contactname'] },
  business_name: { label: 'Business Name', defaultKeys: ['company', 'business', 'businessname', 'companyname', 'co', 'biz'] },
  phone: { label: 'Phone', defaultKeys: ['phone', 'phonenumber', 'tel', 'telephone', 'mobile'] },
  email: { label: 'Email', defaultKeys: ['email', 'emailaddress'] },
  website: { label: 'Website URL', defaultKeys: ['website', 'site', 'url', 'domain', 'web'] },
  location: { label: 'Location / City', defaultKeys: ['location', 'city', 'address', 'state', 'country'] },
  niche: { label: 'Niche / Industry', defaultKeys: ['niche', 'industry', 'category', 'type'] },
  status: { label: 'Pipeline Status', defaultKeys: ['status', 'leadstatus', 'pipelinestatus'] },
  priority: { label: 'Priority', defaultKeys: ['priority'] },
  lead_source: { label: 'Lead Source', defaultKeys: ['source', 'leadsource', 'channel'] },
  ai_lead_score: { label: 'AI Lead Score (0-100)', defaultKeys: ['score', 'leadscore', 'aiscore'] },
  research_status: { label: 'Research Status', defaultKeys: ['researchstatus', 'research'] },
  outreach_status: { label: 'Outreach Status', defaultKeys: ['outreachstatus', 'outreach'] },
  primary_opportunity: { label: 'Primary Opportunity', defaultKeys: ['opportunity', 'service', 'primaryopportunity'] },
  general_notes: { label: 'General Notes', defaultKeys: ['notes', 'generalnotes', 'comment', 'comments', 'desc', 'description'] },
  instagram_handle: { label: 'Instagram Handle', defaultKeys: ['instagram', 'ig', 'ighandle', 'instagramhandle', 'handle', 'username'] }
};

// Helper function to parse CSV text into array of arrays
function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

export default function CsvImportExport({ leads = [], onImportComplete, onClose, customColumns = [], onAddCustomColumn }) {
  const [csvData, setCsvData] = useState(null); // { headers: [], rows: [] }
  const [mappings, setMappings] = useState({}); // fieldName -> csvHeaderIndex
  const [customImportHeaders, setCustomImportHeaders] = useState([]); // Array of CSV header indices to import as custom columns
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCSV(text);
        
        if (parsed.length === 0) {
          setError('The CSV file is empty.');
          return;
        }

        const headers = parsed[0].map(h => h.trim());
        const rows = parsed.slice(1).filter(r => r.length > 0 && r.some(cell => cell.trim().length > 0));

        if (headers.length === 0 || rows.length === 0) {
          setError('The CSV file does not contain valid headers or rows.');
          return;
        }

        setCsvData({ headers, rows });
        autoMapHeaders(headers);
      } catch (err) {
        setError('Error parsing CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const autoMapHeaders = (headers) => {
    const newMappings = {};
    const autoMappedIndices = new Set();

    // Map standard fields
    Object.keys(STANDARD_FIELDS).forEach(fieldName => {
      const fieldInfo = STANDARD_FIELDS[fieldName];
      const matchIndex = headers.findIndex(header => {
        const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        return fieldInfo.defaultKeys.some(key => cleanHeader.includes(key) || key.includes(cleanHeader));
      });

      if (matchIndex !== -1) {
        newMappings[fieldName] = matchIndex.toString();
        autoMappedIndices.add(matchIndex);
      } else {
        newMappings[fieldName] = ''; // unmapped
      }
    });

    // Detect custom headers
    const newCustomImports = [];
    headers.forEach((header, index) => {
      if (!autoMappedIndices.has(index)) {
        newCustomImports.push(index);
      }
    });

    setMappings(newMappings);
    setCustomImportHeaders(newCustomImports);
  };

  const handleMappingChange = (fieldName, headerIndex) => {
    setMappings(prev => ({ ...prev, [fieldName]: headerIndex }));
  };

  const toggleCustomImport = (index) => {
    setCustomImportHeaders(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const executeImport = () => {
    if (!csvData) return;

    // Validate Full Name mapping
    const nameMapIndex = parseInt(mappings.full_name);
    if (isNaN(nameMapIndex)) {
      setError('Please map a CSV column to the "Full Name" field.');
      return;
    }

    // Register custom columns
    customImportHeaders.forEach(headerIdx => {
      const headerName = csvData.headers[headerIdx];
      if (!customColumns.includes(headerName)) {
        onAddCustomColumn(headerName);
      }
    });

    const parsedLeads = csvData.rows.map(row => {
      const lead = {
        full_name: row[nameMapIndex] ? row[nameMapIndex].trim() : 'Unknown Lead',
        business_name: getMappedValue(row, mappings.business_name) || '----',
        phone: getMappedValue(row, mappings.phone) || '----',
        email: getMappedValue(row, mappings.email) || '----',
        website: getMappedValue(row, mappings.website) || '----',
        location: getMappedValue(row, mappings.location) || '----',
        niche: getMappedValue(row, mappings.niche) || '----',
        status: getCleanStatus(getMappedValue(row, mappings.status)),
        priority: getCleanPriority(getMappedValue(row, mappings.priority)),
        lead_source: getCleanSource(getMappedValue(row, mappings.lead_source)),
        ai_lead_score: getMappedValue(row, mappings.ai_lead_score) ? (parseInt(getMappedValue(row, mappings.ai_lead_score), 10) || null) : null,
        research_status: getMappedValue(row, mappings.research_status) || 'Not Researched',
        outreach_status: getMappedValue(row, mappings.outreach_status) || 'Not Drafted',
        primary_opportunity: getMappedValue(row, mappings.primary_opportunity) || 'Custom Interactive Website',
        general_notes: getMappedValue(row, mappings.general_notes) || '----',
        instagram_handle: getCleanInstagramHandle(getMappedValue(row, mappings.instagram_handle)),
        custom_fields: {}
      };

      // Custom fields
      customImportHeaders.forEach(headerIdx => {
        const headerName = csvData.headers[headerIdx];
        lead.custom_fields[headerName] = row[headerIdx] ? row[headerIdx].trim() : '----';
      });

      return lead;
    });

    onImportComplete(parsedLeads);
  };

  const getMappedValue = (row, mappingIndexStr) => {
    if (!mappingIndexStr) return '';
    const idx = parseInt(mappingIndexStr);
    return row[idx] ? row[idx].trim() : '';
  };

  const getCleanStatus = (val) => {
    if (!val) return 'cold/ Not Contacted';
    const valid = [
      'cold/ Not Contacted',
      'Warm',
      'Interested – Call Back Later',
      'Uncertain – Call Back Later',
      'Proposal Sent',
      'No Answer / Ghosted',
      'Closed'
    ];
    const cleaned = val.toLowerCase().trim();
    
    const match = valid.find(v => {
      const cleanV = v.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanInput = cleaned.replace(/[^a-z0-9]/g, '');
      return cleanV === cleanInput || cleanV.includes(cleanInput) || cleanInput.includes(cleanV);
    });

    if (match) return match;

    if (cleaned.includes('cold')) return 'cold/ Not Contacted';
    if (cleaned.includes('warm') || cleaned.includes('hot')) return 'Warm';
    if (cleaned.includes('proposal')) return 'Proposal Sent';
    if (cleaned.includes('answer') || cleaned.includes('ghost')) return 'No Answer / Ghosted';
    if (cleaned.includes('closed')) return 'Closed';

    return 'cold/ Not Contacted';
  };

  const getCleanPriority = (val) => {
    const valid = ['High', 'Medium', 'Low'];
    const cleaned = val.toLowerCase().trim();
    const match = valid.find(v => v.toLowerCase() === cleaned);
    return match || 'Medium';
  };

  const getCleanSource = (val) => {
    const valid = ['Manual', 'PhantomBuster', 'Google Sheets', 'Referral', 'Website', 'LinkedIn', 'Instagram', 'Other'];
    const cleaned = val.toLowerCase().replace(/[^a-z]/g, '').trim();
    const match = valid.find(v => v.toLowerCase() === cleaned);
    return match || 'Manual';
  };

  const getCleanInstagramHandle = (val) => {
    if (!val) return '----';
    let handle = val.trim();
    if (handle && handle !== '----' && !handle.startsWith('@')) {
      handle = `@${handle}`;
    }
    return handle;
  };

  const handleExport = () => {
    const allCustomCols = new Set(customColumns);
    leads.forEach(l => {
      if (l.custom_fields) {
        Object.keys(l.custom_fields).forEach(k => allCustomCols.add(k));
      }
    });
    const customColList = Array.from(allCustomCols);

    const csvHeaders = [
      'Full Name', 'Business Name', 'Phone', 'Email', 'Website', 'Location', 'Niche',
      'Status', 'Priority', 'Lead Source', 'AI Lead Score', 'Research Status',
      'Outreach Status', 'Primary Opportunity', 'General Notes', 'Instagram Handle',
      ...customColList
    ];

    const csvRows = leads.map(l => {
      const row = [
        l.full_name || '',
        l.business_name || '',
        l.phone || '',
        l.email || '',
        l.website || '',
        l.location || '',
        l.niche || '',
        l.status || '',
        l.priority || '',
        l.lead_source || '',
        l.ai_lead_score !== undefined ? l.ai_lead_score : 75,
        l.research_status || '',
        l.outreach_status || '',
        l.primary_opportunity || '',
        l.general_notes || '',
        l.instagram_handle || ''
      ];

      customColList.forEach(col => {
        row.push((l.custom_fields && l.custom_fields[col]) || '');
      });

      return row.map(cell => {
        const text = cell.toString().replace(/"/g, '""');
        return text.includes(',') || text.includes('\n') || text.includes('"') ? `"${text}"` : text;
      }).join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leadbase_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: csvData ? '750px' : '550px' }}>
        <div className="modal-header">
          <h3 className="modal-title">CSV Import & Export</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && <div className="text-error">{error}</div>}

        {!csvData ? (
          <div>
            <div className="mb-4 text-center">
              <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 mb-4" style={{ height: '48px' }}>
                <Download size={16} /> Export All Leads to CSV
              </button>
            </div>

            <div style={{ borderBottom: '1px solid #e5e7eb', margin: '1.5rem 0' }}></div>

            <h4 className="manager-title">Import Leads from CSV</h4>
            <div className="csv-import-box" onClick={() => fileInputRef.current.click()}>
              <Upload size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block', color: '#666' }} />
              <span className="text-sm font-semibold">Click to choose a CSV file</span>
              <p className="text-xs text-muted mt-2">Auto-maps Name, Phone, Email, Website, Location, Status, Score, etc.</p>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h4 className="manager-title">Verify Column Mappings</h4>
            <p className="text-xs text-muted mb-4">
              Map the columns of your CSV file to Leadbase fields.
            </p>

            <div className="csv-mapping-container">
              {Object.keys(STANDARD_FIELDS).map(fieldName => {
                const fieldInfo = STANDARD_FIELDS[fieldName];
                return (
                  <div className="csv-mapping-row" key={fieldName}>
                    <label>{fieldInfo.label}</label>
                    <select
                      value={mappings[fieldName] || ''}
                      onChange={(e) => handleMappingChange(fieldName, e.target.value)}
                    >
                      <option value="">-- Ignore Field --</option>
                      {csvData.headers.map((header, idx) => (
                        <option key={idx} value={idx}>{header}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div style={{ borderBottom: '1px solid #e5e7eb', margin: '1.5rem 0' }}></div>

            <h4 className="manager-title">Extra Custom Columns</h4>
            <div className="column-chips" style={{ minHeight: '40px' }}>
              {csvData.headers.map((header, idx) => {
                const isMappedToStandard = Object.values(mappings).includes(idx.toString());
                if (isMappedToStandard) return null;

                const isSelected = customImportHeaders.includes(idx);
                return (
                  <span
                    key={idx}
                    className={`column-chip ${isSelected ? 'active' : ''}`}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#111111' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#111111',
                      borderColor: '#111111'
                    }}
                    onClick={() => toggleCustomImport(idx)}
                  >
                    {header}
                  </span>
                );
              })}
            </div>

            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setCsvData(null)}>
                Back
              </button>
              <button type="button" onClick={executeImport}>
                Import {csvData.rows.length} Leads
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
