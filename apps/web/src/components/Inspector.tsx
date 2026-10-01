import type { BuildingStyle, SceneEntity, Vec3 } from '@scene/schema';
import { FLOORS_MAX } from '@scene/schema';
import { getAppStore, useEditor, type TransformMode } from '../editor/store.ts';
import { catalogById } from '../lib/catalog.ts';
import { buildingMeta, roadMeta } from '../lib/geometry.ts';
import { Icon } from './icons.tsx';
import { NumberField } from './NumberField.tsx';

const TYPE_LABEL: Record<SceneEntity['type'], string> = {
  building: 'Bino', road: "Yo'l", tree: 'Daraxt', prop: 'Jihoz', vehicle: 'Mashina', character: 'Odam',
};
const STYLE_LABEL: Record<BuildingStyle, string> = { brick: "G'isht", white: 'Oq', glass: 'Shisha' };
const deg = (r: number) => Math.round((r * 180) / Math.PI * 10) / 10;

export function Inspector() {
  const entity = useEditor((s) => s.doc.entities.find((e) => e.id === s.selectedId) ?? null);
  const mode = useEditor((s) => s.transformMode);
  if (!entity) return null;
  const st = getAppStore().getState();
  const upd = (label: string, fn: (e: SceneEntity) => SceneEntity) => st.updateEntity(entity.id, fn, label);
  const setPos = (i: 0 | 2, v: number) => upd("Ko'chirish", (e) => {
    const p = [...e.position] as Vec3;
    p[i] = v;
    return { ...e, position: p };
  });
  const meta = (patch: Record<string, unknown>, label: string) => upd(label, (e) => ({ ...e, metadata: { ...e.metadata, ...patch } }));
  const title = (entity.metadata?.name as string | undefined) ?? catalogById.get(entity.assetId ?? '')?.label ?? TYPE_LABEL[entity.type];
  const modeBtn = (m: TransformMode, icon: 'move' | 'rotate' | 'scale', label: string, key: string) => (
    <button
      className={`seg ${mode === m ? 'active' : ''}`}
      data-testid={`mode-${m}`}
      onClick={() => st.setTransformMode(m)}
      data-tip={`${label} (${key})`}
    >
      <Icon name={icon} size={16} /> {label}
    </button>
  );

  return (
    <aside className="inspector" data-testid="inspector" aria-label="Tanlangan obyekt">
      <div className="insp-head">
        <div>
          <div className="insp-type">{TYPE_LABEL[entity.type]}</div>
          <div className="insp-title" data-testid="inspector-title">{title}</div>
        </div>
        <button className="icon-btn" aria-label="Yopish" onClick={() => st.select(null)}><Icon name="close" size={18} /></button>
      </div>

      {entity.type !== 'road' && (
        <div className="segmented">
          {modeBtn('translate', 'move', "Ko'chirish", 'W')}
          {modeBtn('rotate', 'rotate', 'Burish', 'E')}
          {modeBtn('scale', 'scale', "O'lcham", 'T')}
        </div>
      )}

      <div className="insp-grid">
        <NumberField label="X" suffix="m" value={entity.position[0]} onCommit={(v) => setPos(0, v)} testId="field-x" />
        <NumberField label="Z" suffix="m" value={entity.position[2]} onCommit={(v) => setPos(2, v)} testId="field-z" />
        <NumberField
          label="Burilish" suffix="°" step={15} value={deg(entity.rotation[1])} testId="field-rot"
          onCommit={(v) => upd('Aylantirish', (e) => ({ ...e, rotation: [e.rotation[0], (v * Math.PI) / 180, e.rotation[2]] }))}
        />
        {entity.type !== 'building' && entity.type !== 'road' && (
          <NumberField
            label="Masshtab" step={0.1} min={0.05} max={50} value={entity.scale[0]} testId="field-scale"
            onCommit={(v) => upd("O'lcham", (e) => ({ ...e, scale: [v, v * (e.scale[1] / (e.scale[0] || 1)), v] }))}
          />
        )}
      </div>

      {entity.type === 'building' && <BuildingFields entity={entity} meta={meta} />}
      {entity.type === 'road' && (
        <div className="insp-grid">
          <NumberField label="Uzunlik" suffix="m" min={4} max={400} value={roadMeta(entity).length}
            onCommit={(v) => meta({ length: v }, "Yo'l uzunligi")} testId="field-length" />
        </div>
      )}

      <div className="insp-actions">
        <button className="btn" data-testid="rotate-90" onClick={() => st.rotateSelected(90)} data-tip="90° burish (R)">
          <Icon name="rotate" size={16} /> 90°
        </button>
        <button className="btn" data-testid="duplicate" onClick={() => st.duplicateSelected()} data-tip="Nusxa olish (Ctrl+D)">
          <Icon name="copy" size={16} /> Nusxa
        </button>
        <button className="btn danger" data-testid="delete" onClick={() => st.deleteSelected()} data-tip="O'chirish (Delete)">
          <Icon name="trash" size={16} /> O'chirish
        </button>
      </div>
    </aside>
  );
}

function BuildingFields({ entity, meta }: { entity: SceneEntity; meta: (p: Record<string, unknown>, l: string) => void }) {
  const m = buildingMeta(entity);
  return (
    <>
      <div className="floors" data-testid="floors">
        <span>Qavatlar</span>
        <button className="icon-btn" data-testid="floors-minus" disabled={m.floors <= 1}
          onClick={() => meta({ floors: m.floors - 1 }, 'Qavat kamaytirish')}>−</button>
        <strong data-testid="floors-value">{m.floors}</strong>
        <button className="icon-btn" data-testid="floors-plus" disabled={m.floors >= FLOORS_MAX}
          onClick={() => meta({ floors: m.floors + 1 }, "Qavat qo'shish")}>+</button>
      </div>
      <div className="insp-grid">
        <NumberField label="Eni" suffix="m" min={2} max={200} value={m.width} onCommit={(v) => meta({ width: v }, 'Eni')} testId="field-width" />
        <NumberField label="Bo'yi" suffix="m" min={2} max={200} value={m.depth} onCommit={(v) => meta({ depth: v }, "Bo'yi")} testId="field-depth" />
      </div>
      <div className="segmented">
        {(Object.keys(STYLE_LABEL) as BuildingStyle[]).map((s) => (
          <button key={s} className={`seg ${m.style === s ? 'active' : ''}`} data-testid={`style-${s}`}
            onClick={() => meta({ style: s }, "Uslub")}>{STYLE_LABEL[s]}</button>
        ))}
      </div>
    </>
  );
}
