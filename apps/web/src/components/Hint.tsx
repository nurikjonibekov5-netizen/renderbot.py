import { Icon } from './icons.tsx';

/** First-run help: the user is not a programmer, so controls are explained on screen. */
export function Hint({ onClose }: { onClose: () => void }) {
  return (
    <div className="hint" data-testid="hint" role="dialog" aria-label="Qisqa yo'riqnoma">
      <div className="hint-head">
        <strong>Qanday ishlatiladi</strong>
        <button className="icon-btn" aria-label="Yopish" onClick={onClose}><Icon name="close" size={16} /></button>
      </div>
      <ul>
        <li><b>Surish:</b> sichqonchaning chap tugmasi bilan torting (telefonda — bir barmoq)</li>
        <li><b>Aylantirish:</b> o'ng tugma bilan torting (telefonda — ikki barmoq)</li>
        <li><b>Yaqinlashtirish:</b> g'ildirak yoki ikki barmoq bilan</li>
        <li><b>Bino qo'shish:</b> pastdan bino tanlang va joyni bosing</li>
        <li><b>Tanlash:</b> obyektni bosing, o'ngda sozlamalari chiqadi</li>
        <li><b>Esc</b> — bekor qilish, <b>Delete</b> — o'chirish, <b>Ctrl+Z</b> — orqaga</li>
      </ul>
      <button className="btn primary" data-testid="hint-ok" onClick={onClose}>Tushunarli</button>
    </div>
  );
}
