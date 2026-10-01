// Umumiy tuzilma (1-rasm): tepada ingichka panel, keyin sarlavha qatori, qolgan joy - sahna.
export function AppLayout({ top, header, children }) {
  return (
    <div className="app-layout">
      {top}
      {header}
      {children}
    </div>
  );
}
