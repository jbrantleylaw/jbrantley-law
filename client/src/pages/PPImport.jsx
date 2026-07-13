import { useState, useRef } from 'react';
import axios from 'axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseLine(line) {
  const fields = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { fields.push(cur); cur = ''; }
      else cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim().replace(/^"|"$/g, ''); });
    return row;
  });
}

// ── Contact mapping ───────────────────────────────────────────────────────────

function mapContact(row) {
  const addressParts = [row['Address']];
  const city = row['City'] || '';
  const state = row['State'] || '';
  const zip = row['Zip'] || '';
  const cityStateZip = [city, state].filter(Boolean).join(', ') + (zip ? ` ${zip}` : '');
  if (cityStateZip.trim()) addressParts.push(cityStateZip.trim());

  return {
    first_name:   row['First Name'] || '',
    last_name:    row['Last Name']  || '',
    company:      row['Company']    || '',
    email:        row['Email']      || '',
    phone:        row['Phone']      || '',
    address:      addressParts.filter(Boolean).join(', ') || '',
    contact_type: (row['Type'] || 'client').toLowerCase(),
    notes:        row['Notes'] || '',
    _valid: !!(row['First Name'] || row['Last Name']),
    _errors: [],
  };
}

function mapMatter(row) {
  const mapped = {
    matter_name:  row['Matter Name'] || '',
    client:       row['Client']      || '',
    practice_area: row['Practice Area'] || '',
    status:       row['Status']      || 'Active',
    open_date:    row['Open Date']   || '',
    close_date:   row['Close Date']  || '',
    description:  row['Description'] || '',
    assigned_to:  row['Assigned To'] || '',
    notes:        row['Notes']       || '',
    _valid: !!row['Matter Name'],
    _errors: [],
  };
  if (!mapped.matter_name) mapped._errors.push('Missing matter name');
  return mapped;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '32px 40px', maxWidth: 1100, margin: '0 auto' },
  heading: { fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 4 },
  sub: { fontSize: 14, color: '#6c757d', marginBottom: 24 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid #e9ecef`, marginBottom: 28 },
  tab: (active) => ({
    padding: '10px 22px', fontSize: 14, fontWeight: active ? 700 : 500,
    color: active ? NAVY : '#6c757d', background: 'none', border: 'none',
    borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
    marginBottom: -2, cursor: 'pointer',
  }),
  card: { background: '#fff', border: '1px solid #e9ecef', borderRadius: 8, padding: 24, marginBottom: 20 },
  dropzone: (drag) => ({
    border: `2px dashed ${drag ? GOLD : '#ced4da'}`,
    borderRadius: 8, padding: '36px 24px', textAlign: 'center',
    background: drag ? '#fffbeb' : '#f8f9fa', cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  btn: (color = NAVY, disabled = false) => ({
    background: disabled ? '#e9ecef' : color,
    color: disabled ? '#aaa' : '#fff',
    border: 'none', borderRadius: 6, padding: '9px 20px',
    fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  }),
  btnOutline: {
    background: '#fff', color: NAVY, border: `1px solid ${NAVY}`,
    borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { background: '#f8f9fa', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 600, color: '#555', position: 'sticky', top: 0 },
  td: (err) => ({ padding: '7px 10px', borderBottom: '1px solid #f1f3f5', background: err ? '#fff5f5' : 'transparent', verticalAlign: 'middle' }),
  badge: (ok) => ({ background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#166534' : '#9b2c2c', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }),
  resultCard: (type) => {
    const map = { success: ['#dcfce7','#166534'], warn: ['#fef3c7','#7c4a00'], error: ['#fee2e2','#9b2c2c'], info: ['#e0f2fe','#1d4ed8'] };
    const [bg, color] = map[type] || map.info;
    return { background: bg, color, borderRadius: 8, padding: '14px 18px', marginBottom: 12, fontSize: 14 };
  },
};

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target.result, file.name);
    reader.readAsText(file);
  };

  return (
    <div
      style={s.dropzone(drag)}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={drag ? GOLD : '#aaa'} strokeWidth="1.5" style={{ marginBottom: 10 }}>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <div style={{ fontSize: 14, fontWeight: 600, color: drag ? GOLD : '#555', marginBottom: 4 }}>
        Drop CSV file here or click to browse
      </div>
      <div style={{ fontSize: 12, color: '#aaa' }}>Exported from PracticePanther</div>
      <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  );
}

// ── Preview table (contacts) ──────────────────────────────────────────────────

function ContactPreview({ rows, selected, onToggle, onToggleAll }) {
  const allSelected = selected.size === rows.length;
  const COLS = ['first_name','last_name','company','email','phone','contact_type'];

  return (
    <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}><input type="checkbox" checked={allSelected} onChange={() => onToggleAll()} /></th>
            {COLS.map(c => <th key={c} style={s.th}>{c.replace(/_/g,' ')}</th>)}
            <th style={s.th}>status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const hasErr = !r._valid || r._errors.length > 0;
            return (
              <tr key={i}>
                <td style={s.td(hasErr)}><input type="checkbox" checked={selected.has(i)} onChange={() => onToggle(i)} /></td>
                {COLS.map(c => <td key={c} style={s.td(hasErr && !r[c])}>{r[c] || <span style={{ color: '#ccc' }}>—</span>}</td>)}
                <td style={s.td(hasErr)}>
                  {hasErr
                    ? <span style={s.badge(false)}>⚠ {r._errors.join(', ') || 'Missing name'}</span>
                    : <span style={s.badge(true)}>Ready</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Preview table (matters) ───────────────────────────────────────────────────

function MatterPreview({ rows, selected, onToggle, onToggleAll }) {
  const allSelected = selected.size === rows.length;
  const COLS = ['matter_name','client','practice_area','status','open_date'];

  return (
    <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}><input type="checkbox" checked={allSelected} onChange={() => onToggleAll()} /></th>
            {COLS.map(c => <th key={c} style={s.th}>{c.replace(/_/g,' ')}</th>)}
            <th style={s.th}>status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const hasErr = !r._valid || r._errors.length > 0;
            return (
              <tr key={i}>
                <td style={s.td(hasErr)}><input type="checkbox" checked={selected.has(i)} onChange={() => onToggle(i)} /></td>
                {COLS.map(c => <td key={c} style={s.td(hasErr && !r[c])}>{r[c] || <span style={{ color: '#ccc' }}>—</span>}</td>)}
                <td style={s.td(hasErr)}>
                  {hasErr
                    ? <span style={s.badge(false)}>⚠ {r._errors.join(', ')}</span>
                    : <span style={s.badge(true)}>Ready</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Results display ───────────────────────────────────────────────────────────

function ImportResults({ results, label, onReset }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Import Complete — {label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Imported', val: results.imported, color: '#166534', bg: '#dcfce7' },
          { label: 'Duplicates Skipped', val: results.duplicates, color: '#7c4a00', bg: '#fef3c7' },
          { label: 'Skipped', val: results.skipped - results.duplicates, color: '#9b2c2c', bg: '#fee2e2' },
          { label: 'Total Processed', val: results.imported + results.skipped, color: '#1d4ed8', bg: '#e0f2fe' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.val}</div>
            <div style={{ fontSize: 11, color: stat.color, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {results.errors.length > 0 && (
        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Details</div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {results.errors.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: '#555', padding: '4px 0', borderBottom: '1px solid #f1f3f5' }}>
                <strong>{e.record}</strong> — {e.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <button style={s.btn(NAVY)} onClick={onReset}>Import Another File</button>
    </div>
  );
}

// ── Tab panel ─────────────────────────────────────────────────────────────────

function ImportTab({ type }) {
  const [stage, setStage] = useState('upload'); // upload | preview | results
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const isContacts = type === 'contacts';

  const handleFile = (text, name) => {
    const raw = parseCSV(text);
    const mapped = raw.map(r => isContacts ? mapContact(r) : mapMatter(r));
    setRows(mapped);
    setFileName(name);
    setSelected(new Set(mapped.map((_, i) => i)));
    setStage('preview');
  };

  const toggleRow = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  };

  const handleImport = async () => {
    const records = [...selected].map(i => rows[i]);
    setImporting(true);
    try {
      const endpoint = isContacts ? '/api/ppimport/contacts' : '/api/ppimport/matters';
      const { data } = await axios.post(endpoint, { records });
      setResults(data);
      setStage('results');
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStage('upload'); setFileName(''); setRows([]); setSelected(new Set()); setResults(null);
  };

  const readyCount = [...selected].filter(i => rows[i]?._valid).length;
  const warnCount  = [...selected].filter(i => !rows[i]?._valid || rows[i]?._errors?.length).length;

  if (stage === 'results') return <ImportResults results={results} label={isContacts ? 'Contacts' : 'Matters'} onReset={reset} />;

  return (
    <div>
      {stage === 'upload' && (
        <>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
            {isContacts
              ? 'Upload a contacts CSV exported from PracticePanther. Required columns: First Name or Last Name, Email.'
              : 'Upload a matters CSV exported from PracticePanther. Contacts must be imported first for client linking. Required column: Matter Name.'}
          </div>
          <UploadZone onFile={handleFile} />
          <div style={{ marginTop: 12, fontSize: 12, color: '#aaa' }}>
            Expected columns: {isContacts
              ? 'First Name, Last Name, Company, Email, Phone, Address, City, State, Zip, Type, Notes'
              : 'Matter Name, Client, Practice Area, Status, Open Date, Close Date, Description, Assigned To, Notes'}
          </div>
        </>
      )}

      {stage === 'preview' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{fileName}</div>
              <div style={{ fontSize: 13, color: '#6c757d' }}>
                {rows.length} records parsed &nbsp;·&nbsp;
                <strong style={{ color: '#166534' }}>{readyCount} ready</strong>
                {warnCount > 0 && <> &nbsp;·&nbsp; <strong style={{ color: '#9b2c2c' }}>{warnCount} have issues</strong></>}
              </div>
            </div>
            <button style={s.btnOutline} onClick={reset}>← Start Over</button>
            <button
              style={s.btn(GOLD, selected.size === 0 || importing)}
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
            >
              {importing ? 'Importing…' : `Import ${selected.size} Record${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>

          {warnCount > 0 && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#9b2c2c', marginBottom: 12 }}>
              Records highlighted in red have missing required fields. They are still selected for import but will be skipped on the server if invalid. Uncheck them to exclude.
            </div>
          )}

          {isContacts
            ? <ContactPreview rows={rows} selected={selected} onToggle={toggleRow} onToggleAll={toggleAll} />
            : <MatterPreview  rows={rows} selected={selected} onToggle={toggleRow} onToggleAll={toggleAll} />}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PPImport() {
  const [tab, setTab] = useState('contacts');

  return (
    <div style={s.page}>
      <div style={s.heading}>Import from PracticePanther</div>
      <div style={s.sub}>Import contacts and matters exported from PracticePanther. Import contacts first so matters can be linked.</div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 16px', fontSize: 13, color: '#7c4a00', marginBottom: 24, display: 'flex', gap: 10 }}>
        <span>⚡</span>
        <span><strong>Import order matters:</strong> Import Contacts first, then Matters. Matters are linked to contacts by name match.</span>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'contacts')} onClick={() => setTab('contacts')}>Step 1 — Contacts</button>
        <button style={s.tab(tab === 'matters')}  onClick={() => setTab('matters')}>Step 2 — Matters</button>
      </div>

      <div style={s.card}>
        <ImportTab key={tab} type={tab} />
      </div>
    </div>
  );
}
