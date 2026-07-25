import { useState, useEffect, useRef } from 'react';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

export default function SearchableSelect({ options = [], value, onChange, placeholder = 'Search…', isLoading = false, disabled = false }) {
  const [open,        setOpen]   = useState(false);
  const [query,       setQuery]  = useState('');
  const [highlighted, setHL]     = useState(-1);
  const inputRef    = useRef(null);
  const containerRef= useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = (() => {
    const q = query.toLowerCase();
    const list = q
      ? options.filter(o => (o.label||'').toLowerCase().includes(q) || (o.sublabel||'').toLowerCase().includes(q))
      : options;
    return list.slice(0, 8);
  })();

  useEffect(() => { if (!open) setHL(-1); }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault(); }
      return;
    }
    if      (e.key === 'Escape')                      { setOpen(false); setQuery(''); e.preventDefault(); }
    else if (e.key === 'ArrowDown')                   { setHL(h => Math.min(h+1, filtered.length-1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp')                     { setHL(h => Math.max(h-1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter' && highlighted >= 0)   { select(filtered[highlighted]); e.preventDefault(); }
  };

  const displayValue = open ? query : (selected?.label || '');
  const isFocused    = open;

  return (
    <div ref={containerRef} style={{ position:'relative', width:'100%' }}>
      <div style={{ position:'relative' }}>
        <input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected ? '' : placeholder}
          disabled={disabled}
          style={{
            width:'100%', padding:'10px 36px 10px 12px', fontSize:'14px',
            border:`1.5px solid ${isFocused ? NAVY : '#dee2e6'}`,
            borderRadius:'5px', outline:'none', fontFamily:'Inter,sans-serif',
            color:'#1a1a2e', background:disabled?'#f8f9fa':'#fff',
            transition:'border-color .15s', boxSizing:'border-box',
            cursor:disabled?'not-allowed':'text',
          }}
        />
        <div style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center', pointerEvents:value&&!disabled?'auto':'none' }}>
          {value && !disabled ? (
            <button onMouseDown={clear} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', padding:'2px', display:'flex', lineHeight:1 }}
              onMouseEnter={(e)=>e.currentTarget.style.color='#495057'} onMouseLeave={(e)=>e.currentTarget.style.color='#adb5bd'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="2" style={{ pointerEvents:'none' }}><polyline points="6 9 12 15 18 9"/></svg>
          )}
        </div>
      </div>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:`1.5px solid ${NAVY}`, borderRadius:'6px', boxShadow:'0 4px 16px rgba(0,0,0,.12)', zIndex:1000, maxHeight:'260px', overflowY:'auto' }}>
          {isLoading ? (
            <div style={{ padding:'14px 16px', fontSize:'13px', color:'#adb5bd' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:'14px 16px', fontSize:'13px', color:'#adb5bd' }}>No matches found</div>
          ) : (
            filtered.map((opt, i) => {
              const isHL  = i === highlighted;
              const isSel = String(opt.value) === String(value);
              return (
                <div key={opt.value} onMouseDown={()=>select(opt)} onMouseEnter={()=>setHL(i)}
                  style={{ padding:'10px 14px', cursor:'pointer', background:isHL?GOLD:isSel?'#fef3c7':'transparent', color:isHL?'#fff':'#1a1a2e', transition:'background .08s', borderBottom:i<filtered.length-1?'1px solid #f1f3f5':'none' }}>
                  <div style={{ fontSize:'13px', fontWeight:'500' }}>{opt.label}</div>
                  {opt.sublabel && <div style={{ fontSize:'11px', color:isHL?'rgba(255,255,255,.75)':'#6c757d', marginTop:'1px' }}>{opt.sublabel}</div>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
