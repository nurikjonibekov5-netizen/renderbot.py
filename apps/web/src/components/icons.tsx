import type { ReactNode } from 'react';
import type { IconName } from '../lib/catalog.ts';

type UiIcon = IconName | 'undo' | 'redo' | 'save' | 'camera' | 'grid' | 'magnet' | 'copy' | 'trash' | 'rotate'
  | 'move' | 'scale' | 'close' | 'reset' | 'help';

const P: Record<UiIcon, ReactNode> = {
  cursor: <path d="M6 3l12 9-5.5 1.2L15 20l-2.6 1.1-2.6-6.6L6 18z" />,
  road: <><path d="M8 3L4 21M16 3l4 18" /><path d="M12 4v3M12 10.5v3M12 17v3" /></>,
  footprint: <><rect x="4" y="6" width="16" height="12" strokeDasharray="3 2" /><circle cx="4" cy="6" r="1.6" fill="currentColor" /></>,
  brick: <><rect x="5" y="4" width="14" height="17" /><path d="M5 9h14M5 14h14M9 4v5M15 9v5M9 14v7" /></>,
  white: <><rect x="4" y="6" width="16" height="15" /><path d="M8 6v15M12 6v15M16 6v15M4 3h16" /></>,
  glass: <><rect x="7" y="2" width="10" height="19" /><path d="M7 6h10M7 10h10M7 14h10M7 18h10" /></>,
  cone: <><path d="M12 2l6 9h-3l4 6H5l4-6H6z" /><path d="M12 17v4" /></>,
  round: <><circle cx="12" cy="9" r="6" /><path d="M12 15v6" /></>,
  hedge: <><rect x="3" y="10" width="18" height="8" rx="3" /><path d="M7 18v2M17 18v2" /></>,
  lamp: <><path d="M9 21h6M12 21V5h5" /><path d="M15 5h4v2.5h-4z" /></>,
  undo: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />,
  redo: <path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />,
  save: <><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3M8 14h8v7H8z" /></>,
  camera: <><path d="M3 12a9 9 0 109-9" /><path d="M3 4v5h5" /></>,
  grid: <path d="M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" />,
  magnet: <path d="M6 3v9a6 6 0 0012 0V3h-4v9a2 2 0 01-4 0V3zM6 7h4M14 7h4" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V4h12" /></>,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />,
  rotate: <><path d="M20 12a8 8 0 11-3-6.2" /><path d="M20 4v5h-5" /></>,
  move: <path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" />,
  scale: <><rect x="3" y="11" width="10" height="10" /><path d="M13 11l8-8M15 3h6v6" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  reset: <><path d="M4 4v6h6" /><path d="M20 20a8 8 0 01-14.9-4M4 10a8 8 0 0114.9 4" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.2-1.5 2.5M12 17.5v.5" /></>,
};

export function Icon({ name, size = 20 }: { name: UiIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}
