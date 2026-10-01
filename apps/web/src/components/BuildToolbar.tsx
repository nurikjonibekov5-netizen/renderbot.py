import { CATALOG } from '../lib/catalog.ts';
import { getAppStore, useEditor, type Tool } from '../editor/store.ts';
import { clearDrafts } from '../scene/interaction.ts';
import { Icon } from './icons.tsx';

/** Bottom toolbar modelled on the video: a separate road tool on the left, a row of build tools. Active = orange. */
export function BuildToolbar() {
  const tool = useEditor((s) => s.tool);
  const pick = (t: Tool) => {
    clearDrafts();
    const s = getAppStore().getState();
    s.setTool(s.tool === t && t !== 'select' ? 'select' : t);
  };
  const btn = (t: Tool, icon: Parameters<typeof Icon>[0]['name'], label: string, tip: string) => (
    <button
      key={t}
      className={`tool ${tool === t ? 'active' : ''}`}
      data-testid={`tool-${t}`}
      aria-pressed={tool === t}
      aria-label={label}
      data-tip={tip}
      onClick={() => pick(t)}
    >
      <Icon name={icon} size={22} />
      <span className="tool-label">{label}</span>
    </button>
  );
  return (
    <nav className="build-toolbar" aria-label="Qurilish asboblari">
      <div className="tool-group road-group">{btn('road', 'road', "Yo'l", "Yo'l chizish: boshini va oxirini bosing. Esc — bekor qilish")}</div>
      <div className="tool-group">
        {btn('select', 'cursor', 'Tanlash', 'Obyektni tanlash va ko\'chirish')}
        {btn('footprint', 'footprint', 'Maydon', "Bino maydonini chizish: sichqonchani bosib torting")}
        <span className="tool-sep" />
        {CATALOG.map((c) => btn(`place:${c.id}`, c.icon, c.label, `${c.hint}. Joyni bosing. R — burish, Esc — bekor qilish`))}
      </div>
    </nav>
  );
}
