// Sahna ustidagi sarlavha: hozir qayerdamiz (Bino / 2-qavat) va nima qilish mumkin.
export function ViewHeader({ view, hoverFloor, config, snapshot, onOverview }) {
  const present = (snapshot?.staff ?? []).filter((s) => s.present);
  const rooms = (f) => config.rooms.filter((r) => r.floor === f && r.type !== 'koridor').length;
  let title;
  let sub;
  let hint;
  if (view.mode === 'overview') {
    title = 'Klinika binosi';
    sub = `${config.floors.length} qavat · ${config.rooms.filter((r) => r.type !== 'koridor').length} xona · ${present.length} xodim binoda`;
    hint = hoverFloor ? `${hoverFloor}-qavatga kirish uchun bosing` : 'Qavatni bosing — ichkariga kirasiz';
  } else if (view.mode === 'floor') {
    const n = present.filter((s) => s.floor === view.floor).length;
    title = `${view.floor}-qavat`;
    sub = `${rooms(view.floor)} xona · ${n} xodim`;
    hint = 'Odamchani bosing — ma\'lumot ochiladi';
  } else {
    title = 'Barcha qavatlar';
    sub = `${present.length} xodim binoda`;
    hint = 'Qavatni bosing — o\'sha qavatga o\'tasiz';
  }
  return (
    <div className="view-header">
      <div className="crumbs">
        <button className={view.mode === 'overview' ? 'on' : ''} onClick={onOverview}>Bino</button>
        {view.mode !== 'overview' && <><span>›</span><span className="on">{view.mode === 'floor' ? `${view.floor}-qavat` : 'Barchasi'}</span></>}
      </div>
      <h2>{title}</h2>
      <p>{sub}</p>
      <div className="hint">{hint}</div>
    </div>
  );
}
