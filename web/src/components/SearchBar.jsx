import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import { locationText, searchStaff } from '../format.js';

// Qidiruv: "Dilnoza qayerda?" -> topilgan xodim tanlanadi va kamera o'sha xonaga uchadi.
export function SearchBar({ staff, roles, stateById, roomById, onPick, onNotFound }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchStaff(staff, query).slice(0, 6), [staff, query]);
  const pick = (s) => {
    onPick(s.id);
    setQuery('');
    setOpen(false);
    document.activeElement?.blur();
  };
  return (
    <form
      className="searchbar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (results[0]) pick(results[0]);
        else if (query.trim()) onNotFound();
      }}
    >
      <Icon name="search" size={17} />
      <input
        type="search"
        placeholder="Xodimni qidiring… masalan: Dilnoza qayerda?"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Xodimni qidirish"
      />
      {open && results.length > 0 && (
        <ul className="suggest">
          {results.map((s) => (
            <li key={s.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                <span className="avatar xs" style={{ '--role': roles[s.role]?.color }}>{initials(s.name)}</span>
                <span className="sg-main"><b>{s.name}</b><small>{s.role}</small></span>
                <span className="sg-loc">{locationText(stateById.get(s.id), roomById)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

export function initials(name) {
  return String(name).split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
