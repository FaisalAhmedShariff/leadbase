import React, { useState, useRef } from 'react';
import { Download, Upload, X } from 'lucide-react';

const STANDARD_FIELDS = {
  full_name: { label: 'Full Name *', defaultKeys: ['name', 'fullname', 'contact', 'contactname'] },
  business_name: { label: 'Business Name', defaultKeys: ['company', 'business', 'businessname', 'companyname', 'co', 'biz'] },
  phone: { label: 'Phone', defaultKeys: ['phone', 'phonenumber', 'tel', 'telephone', 'mobile'] },
  email: { label: 'Email', defaultKeys: ['email', 'emailaddress'] },
  status: { label: 'Status', defaultKeys: ['status', 'leadstatus'] },
  priority: { label: 'Priority', defaultKeys: ['priority'] },
  lead_source: { label: 'Lead Source', defaultKeys: ['source', 'leadsource', 'channel'] },
  meeting_date: { label: 'Meeting Date', defaultKeys: ['meeting', 'meetingdate', 'date'] },
  general_notes: { label: 'General Notes', defaultKeys: ['notes', 'generalnotes', 'comment', 'comments', 'desc', 'description'] },
  instagram_handle: { label: 'Instagram Handle', defaultKeys: ['instagram', 'ig', 'ighandle', 'instagramhandle', 'handle', 'username'] },
  approached: { label: 'Approached', defaultKeys: ['approached', 'whenapproached', 'approacheddate', 'approached_date'] }
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

    // Detect custom headers (headers that weren't mapped automatically)
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

    // Validate that Full Name is mapped
    const nameMapIndex = parseInt(mappings.full_name);
    if (isNaN(nameMapIndex)) {
      setError('Please map a CSV column to the "Full Name" field.');
      return;
    }

    // Register new custom columns in the app
    customImportHeaders.forEach(headerIdx => {
      const headerName = csvData.headers[headerIdx];
      if (!customColumns.includes(headerName)) {
        onAddCustomColumn(headerName);
      }
    });

    const parsedLeads = csvData.rows.map(row => {
      const lead = {
        full_name: row[nameMapIndex] ? row[nameMapIndex].trim() : 'Unknown Lead',
        business_name: getMappedValue(row, mappings.business_name) || '',
        phone: getMappedValue(row, mappings.phone) || '',
        email: getMappedValue(row, mappings.email) || '',
        status: getCleanStatus(getMappedValue(row, mappings.status)),
        priority: getCleanPriority(getMappedValue(row, mappings.priority)),
        lead_source: getCleanSource(getMappedValue(row, mappings.lead_source)),
        meeting_date: getCleanDate(getMappedValue(row, mappings.meeting_date)),
        general_notes: getMappedValue(row, mappings.general_notes) || '',
        instagram_handle: getCleanInstagramHandle(getMappedValue(row, mappings.instagram_handle)),
        approached: getMappedValue(row, mappings.approached) || '',
        custom_fields: {}
      };

      // Populate custom fields
      customImportHeaders.forEach(headerIdx => {
        const headerName = csvData.headers[headerIdx];
        lead.custom_fields[headerName] = row[headerIdx] ? row[headerIdx].trim() : '';
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
    const valid = ['Cold', 'Warm', 'Hot', 'Meeting Booked', 'Closed Won', 'Closed Lost'];
    const cleaned = val.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const match = valid.find(v => v.toLowerCase() === cleaned);
    return match || 'Cold';
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

  const getCleanDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  const getCleanInstagramHandle = (val) => {
    if (!val) return '';
    let handle = val.trim();
    if (handle && !handle.startsWith('@')) {
      handle = `@${handle}`;
    }
    return handle;
  };

  const handleExport = () => {
    // Collect all unique custom columns across existing leads
    const allCustomCols = new Set(customColumns);
    leads.forEach(l => {
      if (l.custom_fields) {
        Object.keys(l.custom_fields).forEach(k => allCustomCols.add(k));
      }
    });
    const customColList = Array.from(allCustomCols);

    // Build headers
    const csvHeaders = [
      'Full Name', 'Business Name', 'Phone', 'Email', 
      'Status', 'Priority', 'Lead Source', 'Meeting Date', 
      'General Notes', 'Instagram Handle', 'Approached',
      ...customColList
    ];

    // Build rows
    const csvRows = leads.map(l => {
      const row = [
        l.full_name || '',
        l.business_name || '',
        l.phone || '',
        l.email || '',
        l.status || '',
        l.priority || '',
        l.lead_source || '',
        l.meeting_date || '',
        l.general_notes || '',
        l.instagram_handle || '',
        l.approached || ''
      ];

      // Append custom fields
      customColList.forEach(col => {
        row.push((l.custom_fields && l.custom_fields[col]) || '');
      });

      // Escape quotes and format cells
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
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
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
              <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 mb-4" style={{ height: '50px' }}>
                <Download size={16} /> Export All Leads to CSV
              </button>
            </div>

            <div style={{ borderBottom: '1px solid #e5e7eb', margin: '2rem 0' }}></div>

            <h4 className="manager-title">Import Leads from CSV</h4>
            <div className="csv-import-box" onClick={() => fileInputRef.current.click()}>
              <Upload size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block', color: '#666' }} />
              <span className="text-sm font-semibold">Click to choose a CSV file</span>
              <p className="text-xs text-muted mt-4">We will auto-map common headers like Name, Phone, Email, etc.</p>
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
              Map the columns of your CSV file to the corresponding CRM fields. We automatically matched headers where possible.
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

            <h4 className="manager-title">Extra Columns (Rows Mapping)</h4>
            <p className="text-xs text-muted mb-4">
              The following columns do not match standard fields. Select the ones you want to import as extra columns. They will be stored in your leads' profiles dynamically.
            </p>

            <div className="column-chips" style={{ minHeight: '40px' }}>
              {csvData.headers.map((header, idx) => {
                // If it is NOT mapped in mappings
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
