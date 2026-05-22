// wf-kit.jsx — Modern, professional UI primitives for Rivox.
// Clean neutrals, single indigo accent, Inter throughout, refined shadows.

const wfTheme = {
  light: {
    appBg:     '#f6f6f4',
    surface:   '#ffffff',
    surface2:  '#fafafa',
    sidebar:   '#fbfbf9',
    ink:       '#0a0a0a',
    ink2:      '#27272a',
    muted:     '#71717a',
    mutedSoft: '#a1a1aa',
    border:    '#e5e5e1',
    borderHard:'#d4d4d0',
    accent:    '#5b5bd6',
    accentInk: '#ffffff',
    accentSoft:'#eeeefb',
    hoverBg:   '#f3f3f0',
    selectedBg:'#eff0fa',
    selectedBd:'#c7cbf2',
    // tonal stickies (muted)
    yellow:    '#fef3c7', yellowInk: '#854d0e',
    blue:      '#dbeafe', blueInk:   '#1e40af',
    green:     '#dcfce7', greenInk:  '#166534',
    pink:      '#fce7f3', pinkInk:   '#9d174d',
    purple:    '#ede9fe', purpleInk: '#5b21b6',
    neutral:   '#f4f4f0', neutralInk:'#3f3f46',
    // status dots
    prod:      '#ef4444',
    staging:   '#f59e0b',
    dev:       '#10b981',
  },
  dark: {
    appBg:     '#0a0a0a',
    surface:   '#141414',
    surface2:  '#101010',
    sidebar:   '#0d0d0d',
    ink:       '#fafafa',
    ink2:      '#e4e4e7',
    muted:     '#a1a1aa',
    mutedSoft: '#71717a',
    border:    '#27272a',
    borderHard:'#3f3f46',
    accent:    '#7c7cf0',
    accentInk: '#0a0a0a',
    accentSoft:'#1d1d35',
    hoverBg:   '#1c1c1c',
    selectedBg:'#1a1b2b',
    selectedBd:'#3b3d6a',
    yellow:    '#3a2e10', yellowInk: '#facc15',
    blue:      '#142042', blueInk:   '#93c5fd',
    green:     '#0f2a1c', greenInk:  '#86efac',
    pink:      '#2e1224', pinkInk:   '#f9a8d4',
    purple:    '#1d1838', purpleInk: '#c4b5fd',
    neutral:   '#1c1c1c', neutralInk:'#d4d4d8',
    prod:      '#ef4444',
    staging:   '#f59e0b',
    dev:       '#10b981',
  },
};

const wfFonts = {
  ui:    '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  mono:  '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

// ── Mac window chrome ──────────────────────────────────────────────────────
function WFMacFrame({ title, theme, width, height, children }) {
  const T = wfTheme[theme];
  return (
    <div style={{
      width, height,
      borderRadius: 12,
      overflow: 'hidden',
      background: T.surface,
      color: T.ink,
      fontFamily: wfFonts.ui,
      boxShadow: theme === 'dark'
        ? '0 0 0 1px rgba(255,255,255,0.06), 0 24px 60px -12px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)'
        : '0 0 0 1px rgba(0,0,0,0.05), 0 24px 60px -12px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        height: 38, flex: '0 0 38px',
        background: T.sidebar,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 14px',
        gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }}></div>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }}></div>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }}></div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 500, color: T.muted, letterSpacing: '-0.005em' }}>
          {title}
        </div>
        <div style={{ width: 52 }}></div>
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0, background: T.appBg }}>
        {children}
      </div>
    </div>
  );
}

// ── Inline icon set (16px, stroke style) ───────────────────────────────────
const WFIcon = ({ name, size = 16, color = 'currentColor', style }) => {
  const paths = {
    key:    <React.Fragment><circle cx="8" cy="15" r="3.5"/><path d="M11 13l9-9m-3 0l3 3m-6 0l3 3"/></React.Fragment>,
    sticky: <React.Fragment><path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4"/></React.Fragment>,
    users:  <React.Fragment><circle cx="9" cy="9" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.5"/><path d="M15 14c2.8 0 5 2.2 5 5"/></React.Fragment>,
    cog:    <React.Fragment><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></React.Fragment>,
    help:   <React.Fragment><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.6-2.4 2-2.4 3.6M12 17h.01"/></React.Fragment>,
    plus:   <React.Fragment><path d="M12 5v14M5 12h14"/></React.Fragment>,
    search: <React.Fragment><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></React.Fragment>,
    chev:   <React.Fragment><path d="M9 6l6 6-6 6"/></React.Fragment>,
    dot3:   <React.Fragment><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/></React.Fragment>,
    close:  <React.Fragment><path d="M6 6l12 12M18 6L6 18"/></React.Fragment>,
    copy:   <React.Fragment><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></React.Fragment>,
    share:  <React.Fragment><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/></React.Fragment>,
    user:   <React.Fragment><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/></React.Fragment>,
    group:  <React.Fragment><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 19c0-2.8 2.7-5 6-5M22 19c0-2.8-2.7-5-6-5M9 19c0-2.2 1.3-4 3-4s3 1.8 3 4"/></React.Fragment>,
    eye:    <React.Fragment><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></React.Fragment>,
    lock:   <React.Fragment><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></React.Fragment>,
    rotate: <React.Fragment><path d="M21 12a9 9 0 0 1-15.4 6.4M3 12a9 9 0 0 1 15.4-6.4M21 4v5h-5M3 20v-5h5"/></React.Fragment>,
    filter: <React.Fragment><path d="M3 5h18l-7 9v5l-4 2v-7L3 5z"/></React.Fragment>,
    grip:   <React.Fragment><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></React.Fragment>,
    grid:   <React.Fragment><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></React.Fragment>,
    kanban: <React.Fragment><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/></React.Fragment>,
    canvas: <React.Fragment><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h4v4H8zM14 13h3v4h-3z"/></React.Fragment>,
    check:  <React.Fragment><path d="M4 12l5 5L20 6"/></React.Fragment>,
    pin:    <React.Fragment><path d="M12 17v5M8 7l8 0 1 6-4 2v0H11l-4-2 1-6z"/></React.Fragment>,
    bolt:   <React.Fragment><path d="M13 3L4 14h7l-1 7 9-11h-7z"/></React.Fragment>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}>
      {paths[name]}
    </svg>
  );
};

// ── App sidebar ────────────────────────────────────────────────────────────
function WFSidebar({ active, theme }) {
  const T = wfTheme[theme];
  const items = [
    { id: 'keys',     label: 'API Keys',     icon: 'key' },
    { id: 'sticky',   label: 'Sticky Board', icon: 'sticky' },
    { id: 'team',     label: 'Team',         icon: 'users' },
    { id: 'settings', label: 'Settings',     icon: 'cog' },
    { id: 'help',     label: 'Help',         icon: 'help' },
  ];
  return (
    <div style={{
      width: 220, flex: '0 0 220px',
      background: T.sidebar,
      borderRight: `1px solid ${T.border}`,
      padding: '14px 10px',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {/* Workspace */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 8px 14px',
      }}>
        <svg width="28" height="28" viewBox="0 0 96 96" style={{ flexShrink: 0 }}>
          <rect width="96" height="96" rx="22" fill={T.ink} />
          <circle cx="48" cy="40" r="13" fill={T.surface} />
          <path d="M40 50 L56 50 L59 74 L37 74 Z" fill={T.surface} />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, letterSpacing: '-0.02em' }}>rivox</div>
          <div style={{ fontSize: 11, color: T.muted }}>Acme Inc · Team</div>
        </div>
        <WFIcon name="chev" size={14} color={T.mutedSoft} />
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 7,
        marginBottom: 12,
      }}>
        <WFIcon name="search" size={14} color={T.muted} />
        <div style={{ fontSize: 12, color: T.muted, flex: 1 }}>Search</div>
        <div style={{ fontSize: 10.5, color: T.mutedSoft, fontFamily: wfFonts.mono }}>⌘K</div>
      </div>

      {items.map(it => {
        const sel = it.id === active;
        return (
          <div key={it.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 10px',
            borderRadius: 6,
            background: sel ? T.surface : 'transparent',
            boxShadow: sel ? (theme === 'dark'
              ? '0 0 0 1px ' + T.border
              : '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px ' + T.border) : 'none',
            fontSize: 13,
            fontWeight: sel ? 500 : 400,
            color: sel ? T.ink : T.ink2,
            letterSpacing: '-0.005em',
          }}>
            <WFIcon name={it.icon} size={16} color={sel ? T.accent : T.muted} />
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.id === 'sticky' && (
              <span style={{
                fontSize: 10, fontWeight: 500,
                padding: '1px 6px',
                background: T.accentSoft, color: T.accent,
                borderRadius: 4,
              }}>3</span>
            )}
          </div>
        );
      })}

      <div style={{ flex: 1 }}></div>

      {/* Profile pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px',
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        background: T.surface,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #818cf8, #c084fc)',
          color: '#fff',
          display: 'grid', placeItems: 'center',
          fontSize: 11, fontWeight: 600,
        }}>MK</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.ink, letterSpacing: '-0.005em' }}>Maya Kapoor</div>
          <div style={{ fontSize: 10.5, color: T.muted }}>Admin</div>
        </div>
        <WFIcon name="dot3" size={14} color={T.muted} />
      </div>
    </div>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────
function WFBtn({ children, theme, primary, ghost, danger, sm, leftIcon, rightIcon, style }) {
  const T = wfTheme[theme];
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: sm ? '4px 9px' : '6px 12px',
    fontSize: sm ? 12 : 12.5,
    fontWeight: 500,
    letterSpacing: '-0.005em',
    borderRadius: 6,
    whiteSpace: 'nowrap',
    cursor: 'default',
    transition: 'all .12s',
    lineHeight: 1.4,
  };
  let styleVariant;
  if (primary) {
    styleVariant = {
      background: T.ink,
      color: T.surface,
      border: `1px solid ${T.ink}`,
    };
  } else if (danger) {
    styleVariant = {
      background: 'transparent', color: '#dc2626',
      border: `1px solid ${T.border}`,
    };
  } else if (ghost) {
    styleVariant = {
      background: 'transparent', color: T.ink2,
      border: `1px solid transparent`,
    };
  } else {
    styleVariant = {
      background: T.surface, color: T.ink2,
      border: `1px solid ${T.border}`,
      boxShadow: theme === 'dark' ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
    };
  }
  return (
    <div style={{ ...base, ...styleVariant, ...style }}>
      {leftIcon && <WFIcon name={leftIcon} size={sm ? 12 : 14} />}
      {children}
      {rightIcon && <WFIcon name={rightIcon} size={sm ? 12 : 14} />}
    </div>
  );
}

function WFChip({ children, theme, color = 'neutral', dot, style }) {
  const T = wfTheme[theme];
  const bg = T[color] || T.neutral;
  const ink = T[color + 'Ink'] || T.ink2;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px',
      borderRadius: 4,
      background: bg,
      color: ink,
      fontSize: 10.5,
      fontWeight: 500,
      letterSpacing: '0',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: ink }}></span>}
      {children}
    </span>
  );
}

function WFAvatar({ theme, size = 28, initials, hue = 0, style }) {
  // generate a deterministic, harmonious gradient from initials
  const T = wfTheme[theme];
  const palettes = [
    ['#818cf8', '#c084fc'], // indigo→purple
    ['#fb923c', '#f472b6'], // orange→pink
    ['#34d399', '#22d3ee'], // emerald→cyan
    ['#facc15', '#fb923c'], // yellow→orange
    ['#60a5fa', '#a78bfa'], // blue→violet
    ['#f472b6', '#fb7185'], // pink→rose
  ];
  const idx = initials
    ? (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palettes.length
    : hue % palettes.length;
  const [a, b] = palettes[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${a}, ${b})`,
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.4,
      fontWeight: 600, letterSpacing: '-0.01em',
      color: '#fff',
      flex: `0 0 ${size}px`,
      boxShadow: theme === 'dark'
        ? 'inset 0 0 0 1px rgba(255,255,255,0.06)'
        : 'inset 0 0 0 1px rgba(255,255,255,0.4)',
      ...style,
    }}>{initials}</div>
  );
}

// Page header
function WFPageHead({ title, subtitle, actions, theme, kicker }) {
  const T = wfTheme[theme];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 16,
      padding: '20px 24px 18px',
      borderBottom: `1px solid ${T.border}`,
      background: T.surface,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {kicker && (
          <div style={{ fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {kicker}
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ marginTop: 4, fontSize: 12.5, color: T.muted, letterSpacing: '-0.005em' }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{actions}</div>
    </div>
  );
}

// section/eyebrow label
function WFEyebrow({ children, theme, style }) {
  const T = wfTheme[theme];
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600,
      color: T.muted,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      ...style,
    }}>{children}</div>
  );
}

// Status dot
function WFStatus({ theme, kind = 'prod' }) {
  const T = wfTheme[theme];
  const color = T[kind] || T.prod;
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 11.5, color: T.muted, fontWeight: 500,
  }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }}></span>
  </span>;
}

Object.assign(window, {
  wfTheme, wfFonts,
  WFMacFrame, WFSidebar, WFIcon,
  WFBtn, WFChip, WFAvatar,
  WFPageHead, WFEyebrow, WFStatus,
});
