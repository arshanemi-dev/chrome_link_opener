'use client';

import { useState } from 'react';
import {
  Globe, ShoppingCart, ShoppingBag, Store, Package, Truck, Tag, Receipt, Wallet, CreditCard, ChartBar, Mail,
  MessageCircle, Phone, Users, Briefcase, Building2, Folder, FileText, FileSpreadsheet, Monitor, AppWindow,
  Settings, Star, ChevronDown, Check,
} from 'lucide-react';
import Popover from '@/components/table/Popover';
import { isApp } from '@/lib/linkOpener/linkRules';
import { ICON_PRESET_LIST, AUTO_ICON_LABEL, OWN_ICON_LABEL } from '@/lib/linkOpener/iconPresets';

// A row's icon, shown in the Profile column. Stored as `icon`:
//  - ''                   → the default: a web link's own favicon (from its
//                           site), a generic tile for an application
//  - 'preset:<key>'       → one of the built-in icons below
//  - 'data:image/png;…'   → an application's own icon, from a Desktop scan
// The admin panel accepts exactly these (its lib/linkOpener.js ICON_RE).

// The picture for each built-in icon; names and order come from
// lib/linkOpener/iconPresets.js (shared with the Excel backup).
const LOOK = {
  globe: [Globe, '#2563eb'],
  cart: [ShoppingCart, '#f97316'],
  bag: [ShoppingBag, '#db2777'],
  store: [Store, '#7c3aed'],
  package: [Package, '#b45309'],
  truck: [Truck, '#0891b2'],
  tag: [Tag, '#16a34a'],
  receipt: [Receipt, '#0d9488'],
  wallet: [Wallet, '#ca8a04'],
  card: [CreditCard, '#475569'],
  chart: [ChartBar, '#4f46e5'],
  mail: [Mail, '#dc2626'],
  chat: [MessageCircle, '#22c55e'],
  phone: [Phone, '#059669'],
  users: [Users, '#9333ea'],
  briefcase: [Briefcase, '#92400e'],
  building: [Building2, '#334155'],
  folder: [Folder, '#eab308'],
  doc: [FileText, '#3b82f6'],
  sheet: [FileSpreadsheet, '#15803d'],
  monitor: [Monitor, '#0f172a'],
  app: [AppWindow, '#64748b'],
  settings: [Settings, '#525252'],
  star: [Star, '#f59e0b'],
};

export const ICON_PRESETS = ICON_PRESET_LIST.map((p) => ({ ...p, Icon: LOOK[p.key][0], color: LOOK[p.key][1] }));
const PRESET_BY_KEY = Object.fromEntries(ICON_PRESETS.map((p) => [p.key, p]));

function Tile({ preset, size }) {
  const { Icon, color } = preset;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-md" style={{ width: size, height: size, backgroundColor: color }}>
      <Icon size={Math.round(size * 0.62)} color="#fff" strokeWidth={2.2} />
    </span>
  );
}

// The site's own /favicon.ico — loaded from the site itself (no third-party
// icon service sees the link), falling back to the Website tile.
function Favicon({ url, size }) {
  const [failedFor, setFailedFor] = useState(null);
  let src = null;
  try {
    src = `${new URL(url).origin}/favicon.ico`;
  } catch {
    // not a URL yet (still being typed)
  }
  if (!src || failedFor === src) return <Tile preset={PRESET_BY_KEY.globe} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element -- an arbitrary site's favicon; next/image can't optimise it
  return <img src={src} alt="" width={size} height={size} onError={() => setFailedFor(src)} className="shrink-0 rounded-sm" />;
}

// `link` = any row or draft: { kind, icon, link }.
export function LinkIcon({ link, size = 18 }) {
  const icon = link?.icon || '';
  if (icon.startsWith('data:image/')) {
    // eslint-disable-next-line @next/next/no-img-element -- a local data: URL
    return <img src={icon} alt="" width={size} height={size} className="shrink-0" />;
  }
  if (icon.startsWith('preset:') && PRESET_BY_KEY[icon.slice(7)]) return <Tile preset={PRESET_BY_KEY[icon.slice(7)]} size={size} />;
  if (isApp(link)) return <Tile preset={PRESET_BY_KEY.app} size={size} />;
  return <Favicon url={link?.link} size={size} />;
}

// The icon dropdown in the Add / Edit row: Auto (favicon / app tile), the
// app's own scanned icon when it has one (`scanIcon`), then every preset.
export function IconPicker({ draft, onChange }) {
  const options = [
    { value: '', label: `${AUTO_ICON_LABEL} — ${isApp(draft) ? 'app tile' : 'the site’s own icon'}` },
    ...(draft.scanIcon ? [{ value: draft.scanIcon, label: OWN_ICON_LABEL }] : []),
    ...ICON_PRESETS.map((p) => ({ value: `preset:${p.key}`, label: p.label })),
  ];
  const current = draft.icon || '';

  return (
    <Popover
      panelClass="p-2"
      trigger={() => (
        <button
          type="button"
          title="Choose an icon"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-accent/60 bg-surface px-1.5 hover:bg-card-hover"
        >
          <LinkIcon link={draft} size={18} />
          <ChevronDown size={12} className="text-subtle" />
        </button>
      )}
    >
      {(close) => (
        <div className="w-60">
          <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">Icon</p>
          <div className="grid grid-cols-6 gap-1">
            {options.map((o) => (
              <button
                key={o.value || 'auto'}
                type="button"
                title={o.label}
                aria-label={o.label}
                onClick={() => { onChange(o.value); close(); }}
                className={`relative flex h-9 items-center justify-center rounded-md border transition-colors hover:bg-card-hover ${
                  current === o.value ? 'border-accent bg-accent/10' : 'border-transparent'
                }`}
              >
                <LinkIcon link={{ ...draft, icon: o.value }} size={20} />
                {current === o.value && <Check size={10} className="absolute right-0.5 top-0.5 text-accent" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}
