// Umumiy tuzilma: chapda panel, tepada sarlavha, qolgan joy - asosiy sahna.
export function AppLayout({ side, top, children }) {
  return (
    <div className="app-layout">
      {side}
      <div className="app-main">
        {top}
        {children}
      </div>
    </div>
  );
}
