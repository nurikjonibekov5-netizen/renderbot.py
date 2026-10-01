import { useState } from 'react';
import { useStore } from 'zustand';
import { CATALOG, type CatalogGroup, type IconName } from '../lib/catalog.ts';
import { getAppStore, useEditor, type Tool } from '../editor/store.ts';
import { clearDrafts, draftStore } from '../scene/interaction.ts';
import { Icon } from './icons.tsx';

type Group = CatalogGroup | 'facade';

interface Item {
  tool: Tool;
  icon: IconName;
  label: string;
  tip: string;
}

const FACADE_ITEMS: Item[] = [
  { tool: 'facade:brick', icon: 'brick', label: 'Zlín', tip: "Qizil g'isht fasad: bino tomonini bosing" },
  { tool: 'facade:white', icon: 'white', label: 'Oq', tip: 'Oq fasad (klinika uslubi): bino tomonini bosing' },
  { tool: 'facade:glass', icon: 'glass', label: 'Shisha', tip: 'Shisha fasad: bino tomonini bosing' },
  { tool: 'facade:storefront', icon: 'storefront', label: "Do'kon", tip: "Pastki qavatni do'kon vitrinasiga aylantirish: binoni bosing" },
];

const GROUPS: { id: Group; icon: IconName; label: string; tip: string }[] = [
  { id: 'facade', icon: 'facade', label: 'Fasad', tip: 'Fasad uslublari' },
  { id: 'buildings', icon: 'buildings', label: 'Binolar', tip: 'Tayyor binolar: klinika, 4 ta GLB model, Zlín bino' },
  { id: 'trees', icon: 'trees', label: 'Daraxtlar', tip: 'Daraxtlar va butazor' },
  { id: 'street', icon: 'street', label: "Ko'cha", tip: "Chiroq, svetofor, mashina" },
];

function itemsOf(g: Group): Item[] {
  if (g === 'facade') return FACADE_ITEMS;
  return CATALOG.filter((c) => c.group === g).map((c) => ({
    tool: `place:${c.id}` as Tool, icon: c.icon, label: c.label, tip: `${c.hint}. Joyni bosing. R — burish, Esc — bekor qilish`,
  }));
}
const groupOf = (t: Tool): Group | null => (['facade', 'buildings', 'trees', 'street'] as Group[]).find((g) => itemsOf(g).some((i) => i.tool === t)) ?? null;

/**
 * Bottom toolbar modelled on the video: the road tool alone on the left, one row of build tools,
 * active = orange, tooltips on hover; the row dims while a lot/footprint is being drawn (video 8 s).
 */
export function BuildToolbar() {
  const tool = useEditor((s) => s.tool);
  const drawing = useStore(draftStore, (s) => s.footprintStart !== null);
  // null = follow the active tool's group, false = closed by the user
  const [open, setOpen] = useState<Group | null | false>(null);
  const shownGroup = open === false ? null : open ?? groupOf(tool);

  const pick = (t: Tool) => {
    clearDrafts();
    if (!groupOf(t)) setOpen(null);
    const s = getAppStore().getState();
    s.setTool(s.tool === t && t !== 'select' ? 'select' : t);
  };
  const btn = (t: Tool, icon: IconName, label: string, tip: string) => (
    <button
      key={t}
      className={`tool ${tool === t ? 'active' : ''}`}
      data-testid={`tool-${t}`}
      aria-pressed={tool === t}
      aria-label={label}
      data-tip={tip}
      onClick={() => pick(t)}
    >
      <Icon name={icon as never} size={22} />
      <span className="tool-label">{label}</span>
    </button>
  );

  return (
    <nav className={`build-toolbar ${drawing ? 'dimmed' : ''}`} aria-label="Qurilish asboblari">
      {shownGroup && (
        <div className="tool-flyout" data-testid={`flyout-${shownGroup}`}>
          {itemsOf(shownGroup).map((i) => btn(i.tool, i.icon, i.label, i.tip))}
        </div>
      )}
      <div className="tool-row">
        <div className="tool-group road-group">{btn('road', 'road', "Yo'l", "Yo'l chizish: boshini va oxirini bosing. Mavjud yo'lga yopishadi. Esc — tugatish")}</div>
        <div className="tool-group">
          {btn('select', 'cursor', 'Tanlash', "Obyektni tanlash, ko'chirish, burish")}
          {btn('lot', 'lot', 'Uchastka', 'Uchastka chizish: bosib torting (kvartal chetiga yopishadi)')}
          {btn('parking', 'parking', 'Parking', 'Parking chizish: bosib torting')}
          {btn('footprint', 'footprint', 'Bino', 'Bino maydonini chizish: bosib torting, keyin tutqich bilan qavat qo\'shing')}
          <span className="tool-sep" />
          {GROUPS.map((g) => {
            const active = groupOf(tool) === g.id;
            return (
              <button
                key={g.id}
                className={`tool group ${active ? 'active' : ''} ${shownGroup === g.id ? 'open' : ''}`}
                data-testid={`group-${g.id}`}
                aria-expanded={shownGroup === g.id}
                data-tip={g.tip}
                onClick={() => setOpen(shownGroup === g.id ? false : g.id)}
              >
                <Icon name={g.icon as never} size={22} />
                <span className="tool-label">{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
