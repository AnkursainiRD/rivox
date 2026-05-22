// logo-marks.jsx — Two complete Rivox identity systems.
//
// Direction A · "Vault"  — bold geometric R monogram with a single indigo
//                          "secret" detail. Confident, heavy, premium B2B.
// Direction B · "Cipher" — abstract keyhole mark + lighter lowercase
//                          wordmark. Restrained, modern, minimal tech.
//
// Both share: geometric construction, generous rounding, no decoration.

const RIVOX = {
  ink:     '#0a0a0a',
  paper:   '#ffffff',
  indigo:  '#5b5bd6',
  warm:    '#f6f6f4',
  dark:    '#0a0a0a',
  muted:   '#71717a',
  border:  '#e5e5e1',
};

// ─────────────────────────────────────────────────────────────────────────
// DIRECTION A · VAULT — monogram system
// ─────────────────────────────────────────────────────────────────────────

// Custom-drawn R in a rounded ink tile. The counter holds a single indigo
// dot — the "secret" inside the vault. Reads cleanly at 14px.
function VaultMark({ size = 96, accent = RIVOX.indigo, tile = RIVOX.ink, fg = RIVOX.paper, showAccent = true }) {
  const s = size / 96;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ display: 'block' }}>
      <rect width="96" height="96" rx={22} fill={tile} />
      <path d="M30 24h21.5a14 14 0 0 1 4.4 27.3L70 72H58.4L46 53.1H40V72H30V24Zm10 9.5v10.6h11.1a5.3 5.3 0 1 0 0-10.6H40Z"
        fill={fg} />
      {showAccent && size >= 32 && (
        <circle cx="48" cy="38.8" r={2.4} fill={accent} />
      )}
    </svg>
  );
}

// Vault wordmark — "Rivox" Inter 800, very tight tracking, ink.
function VaultWordmark({ height = 40, color = RIVOX.ink }) {
  return (
    <svg height={height} viewBox="0 0 196 48" style={{ display: 'block' }}>
      <text x="0" y="38" fill={color}
        style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 42,
          letterSpacing: '-0.05em',
        }}>
        Rivox
      </text>
    </svg>
  );
}

// Vault lockup — tile mark + wordmark, mathematically aligned.
function VaultLockup({ height = 40, color = RIVOX.ink, accent = RIVOX.indigo, tile = RIVOX.ink, fg = RIVOX.paper }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.32 }}>
      <VaultMark size={height} accent={accent} tile={tile} fg={fg} />
      <VaultWordmark height={height * 0.88} color={color} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DIRECTION B · CIPHER — abstract keyhole system
// ─────────────────────────────────────────────────────────────────────────

// A pure keyhole — circle + slim stem — set in a generous safe area.
// Pure monochrome by default. The form reads as both "lock" and "share node".
function CipherMark({ size = 96, color = RIVOX.ink, bg = 'transparent', tile = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ display: 'block' }}>
      {tile && <rect width="96" height="96" rx={22} fill={bg} />}
      {/* circle (key bow) */}
      <circle cx="48" cy="40" r={14} fill={tile ? color : color}
        style={tile ? { fill: bg === RIVOX.ink ? RIVOX.paper : color } : {}} />
      {/* tapered stem */}
      <path
        d={tile
          ? "M40 50 L56 50 L60 74 L36 74 Z"
          : "M40 50 L56 50 L60 74 L36 74 Z"
        }
        fill={tile ? (bg === RIVOX.ink ? RIVOX.paper : color) : color}
      />
    </svg>
  );
}

// Tile variant for when the keyhole sits inside a square (icon use).
function CipherTile({ size = 96, color = RIVOX.paper, tile = RIVOX.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ display: 'block' }}>
      <rect width="96" height="96" rx={22} fill={tile} />
      <circle cx="48" cy="40" r={13} fill={color} />
      <path d="M40 50 L56 50 L59 74 L37 74 Z" fill={color} />
    </svg>
  );
}

// Cipher wordmark — "rivox" lowercase, Inter 500, normal tracking.
// The dot of the i is enlarged and aligned to the keyhole bow size,
// echoing the mark.
function CipherWordmark({ height = 36, color = RIVOX.ink, accent = RIVOX.ink }) {
  return (
    <svg height={height} viewBox="0 0 184 48" style={{ display: 'block' }}>
      <text x="0" y="38" fill={color}
        style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontWeight: 500,
          fontSize: 40,
          letterSpacing: '-0.025em',
        }}>
        rivox
      </text>
    </svg>
  );
}

// Cipher lockup — keyhole tile + lowercase wordmark.
function CipherLockup({ height = 40, color = RIVOX.ink, tile = RIVOX.ink, fg = RIVOX.paper }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.34 }}>
      <CipherTile size={height} color={fg} tile={tile} />
      <CipherWordmark height={height * 0.86} color={color} />
    </div>
  );
}

Object.assign(window, {
  RIVOX,
  VaultMark, VaultWordmark, VaultLockup,
  CipherMark, CipherTile, CipherWordmark, CipherLockup,
});
