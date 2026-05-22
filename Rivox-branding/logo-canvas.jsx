// logo-canvas.jsx — Two complete identity systems on a design canvas.

// ── Shared frame ──────────────────────────────────────────────────────────
function Sheet({ children, dark, padding = 28, style }) {
  const bg = dark ? '#0a0a0a' : '#ffffff';
  const fg = dark ? '#fafafa' : '#0a0a0a';
  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg,
      color: fg,
      fontFamily: '"Inter", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
      padding,
      ...style,
    }}>{children}</div>
  );
}

function Eyebrow({ children, dark }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600,
      color: dark ? '#a1a1aa' : '#71717a',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 6,
    }}>{children}</div>
  );
}

function Caption({ children, dark }) {
  return (
    <div style={{
      fontSize: 12, color: dark ? '#a1a1aa' : '#71717a',
      letterSpacing: '-0.005em', lineHeight: 1.4,
    }}>{children}</div>
  );
}

function SizeRow({ items, dark }) {
  const border = dark ? '#27272a' : '#e5e5e1';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 28,
      padding: '20px 0 0',
      borderTop: `1px solid ${border}`,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 64 }}>{it.node}</div>
          <div style={{
            fontSize: 10, color: dark ? '#a1a1aa' : '#71717a',
            fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
            letterSpacing: '0',
          }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── DIRECTION A · VAULT sheets ────────────────────────────────────────────
function VaultHero({ dark }) {
  return (
    <Sheet dark={dark}>
      <Eyebrow dark={dark}>Direction A · Vault</Eyebrow>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Monogram system</div>
      <Caption dark={dark}>Bold geometric R inside an ink tile. A single indigo dot in the counter — the secret in the vault.</Caption>

      <div style={{
        flex: 1, display: 'grid', placeItems: 'center',
        gap: 26, padding: '28px 0',
      }}>
        <VaultMark size={148} tile={dark ? '#fafafa' : RIVOX.ink} fg={dark ? RIVOX.ink : RIVOX.paper} />
        <VaultLockup
          height={44}
          color={dark ? '#fafafa' : RIVOX.ink}
          tile={dark ? '#fafafa' : RIVOX.ink}
          fg={dark ? RIVOX.ink : RIVOX.paper}
        />
      </div>
    </Sheet>
  );
}

function VaultSizes({ dark }) {
  return (
    <Sheet dark={dark}>
      <Eyebrow dark={dark}>Vault · usage</Eyebrow>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', marginBottom: 4 }}>Sizes & monochrome</div>
      <Caption dark={dark}>The dot disappears below 32px so the form stays legible. Full mono is the fallback.</Caption>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 0' }}>
        {/* Mark scale */}
        <SizeRow dark={dark} items={[
          { node: <VaultMark size={64} tile={dark ? '#fafafa' : RIVOX.ink} fg={dark ? RIVOX.ink : RIVOX.paper} />, label: '64px' },
          { node: <VaultMark size={32} tile={dark ? '#fafafa' : RIVOX.ink} fg={dark ? RIVOX.ink : RIVOX.paper} />, label: '32px' },
          { node: <VaultMark size={20} tile={dark ? '#fafafa' : RIVOX.ink} fg={dark ? RIVOX.ink : RIVOX.paper} showAccent={false} />, label: '20px' },
          { node: <VaultMark size={14} tile={dark ? '#fafafa' : RIVOX.ink} fg={dark ? RIVOX.ink : RIVOX.paper} showAccent={false} />, label: '14px' },
        ]} />

        {/* Monochrome row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 4 }}>
          <Eyebrow dark={dark}>Monochrome</Eyebrow>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <VaultMark size={48} tile={dark ? RIVOX.paper : RIVOX.ink} fg={dark ? RIVOX.ink : RIVOX.paper} showAccent={false} />
            <VaultMark size={48} tile="transparent" fg={dark ? RIVOX.paper : RIVOX.ink} showAccent={false} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function VaultContext({ dark }) {
  return (
    <Sheet dark={dark} padding={0}>
      <div style={{ padding: '28px 28px 12px' }}>
        <Eyebrow dark={dark}>Vault · in context</Eyebrow>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Where it lives</div>
      </div>

      {/* Sidebar header preview */}
      <div style={{ padding: '14px 28px' }}>
        <div style={{
          background: dark ? '#0d0d0d' : '#fbfbf9',
          border: `1px solid ${dark ? '#27272a' : '#e5e5e1'}`,
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <VaultMark size={32} tile={dark ? '#fafafa' : RIVOX.ink} fg={dark ? RIVOX.ink : RIVOX.paper} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>Rivox</div>
            <div style={{ fontSize: 11, color: dark ? '#a1a1aa' : '#71717a' }}>Acme Inc · Team</div>
          </div>
          <div style={{ fontSize: 12, color: dark ? '#71717a' : '#a1a1aa' }}>›</div>
        </div>
      </div>

      {/* Dock / app-icon preview */}
      <div style={{ flex: 1, padding: '8px 28px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          padding: 18,
          background: dark
            ? 'linear-gradient(135deg, #1a1a1a, #0a0a0a)'
            : 'linear-gradient(135deg, #f4f4f0, #e5e5e1)',
          borderRadius: 28,
          display: 'grid', placeItems: 'center',
        }}>
          <div style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.18))' }}>
            <VaultMark size={88} tile={dark ? '#fafafa' : RIVOX.ink} fg={dark ? RIVOX.ink : RIVOX.paper} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>App icon</div>
          <Caption dark={dark}>Tile mark sits inside the OS rounded square; safe area preserved.</Caption>
        </div>
      </div>
    </Sheet>
  );
}

// ── DIRECTION B · CIPHER sheets ───────────────────────────────────────────
function CipherHero({ dark }) {
  return (
    <Sheet dark={dark}>
      <Eyebrow dark={dark}>Direction B · Cipher</Eyebrow>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Abstract keyhole</div>
      <Caption dark={dark}>A geometric keyhole — circle + tapered stem. No letterform in the mark. Reads as lock + share node.</Caption>

      <div style={{
        flex: 1, display: 'grid', placeItems: 'center',
        gap: 26, padding: '28px 0',
      }}>
        <CipherTile size={148} color={dark ? RIVOX.ink : RIVOX.paper} tile={dark ? RIVOX.paper : RIVOX.ink} />
        <CipherLockup
          height={44}
          color={dark ? RIVOX.paper : RIVOX.ink}
          tile={dark ? RIVOX.paper : RIVOX.ink}
          fg={dark ? RIVOX.ink : RIVOX.paper}
        />
      </div>
    </Sheet>
  );
}

function CipherSizes({ dark }) {
  return (
    <Sheet dark={dark}>
      <Eyebrow dark={dark}>Cipher · usage</Eyebrow>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', marginBottom: 4 }}>Sizes & inverted</div>
      <Caption dark={dark}>Form holds at favicon size because the construction is two primitives. Pure monochrome.</Caption>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 0' }}>
        <SizeRow dark={dark} items={[
          { node: <CipherTile size={64} color={dark ? RIVOX.ink : RIVOX.paper} tile={dark ? RIVOX.paper : RIVOX.ink} />, label: '64px' },
          { node: <CipherTile size={32} color={dark ? RIVOX.ink : RIVOX.paper} tile={dark ? RIVOX.paper : RIVOX.ink} />, label: '32px' },
          { node: <CipherTile size={20} color={dark ? RIVOX.ink : RIVOX.paper} tile={dark ? RIVOX.paper : RIVOX.ink} />, label: '20px' },
          { node: <CipherTile size={14} color={dark ? RIVOX.ink : RIVOX.paper} tile={dark ? RIVOX.paper : RIVOX.ink} />, label: '14px' },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 4 }}>
          <Eyebrow dark={dark}>Outline / inverse</Eyebrow>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <CipherTile size={48} color={dark ? RIVOX.ink : RIVOX.paper} tile={dark ? RIVOX.paper : RIVOX.ink} />
            <div style={{
              width: 48, height: 48, borderRadius: 11,
              border: `1.6px solid ${dark ? RIVOX.paper : RIVOX.ink}`,
              display: 'grid', placeItems: 'center',
            }}>
              <CipherMark size={48} color={dark ? RIVOX.paper : RIVOX.ink} />
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function CipherContext({ dark }) {
  return (
    <Sheet dark={dark} padding={0}>
      <div style={{ padding: '28px 28px 12px' }}>
        <Eyebrow dark={dark}>Cipher · in context</Eyebrow>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Where it lives</div>
      </div>

      <div style={{ padding: '14px 28px' }}>
        <div style={{
          background: dark ? '#0d0d0d' : '#fbfbf9',
          border: `1px solid ${dark ? '#27272a' : '#e5e5e1'}`,
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CipherTile size={32} color={dark ? RIVOX.ink : RIVOX.paper} tile={dark ? RIVOX.paper : RIVOX.ink} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>rivox</div>
            <div style={{ fontSize: 11, color: dark ? '#a1a1aa' : '#71717a' }}>acme · team</div>
          </div>
          <div style={{ fontSize: 12, color: dark ? '#71717a' : '#a1a1aa' }}>›</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 28px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          padding: 18,
          background: dark
            ? 'linear-gradient(135deg, #1a1a1a, #0a0a0a)'
            : 'linear-gradient(135deg, #f4f4f0, #e5e5e1)',
          borderRadius: 28,
          display: 'grid', placeItems: 'center',
        }}>
          <div style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.18))' }}>
            <CipherTile size={88} color={dark ? RIVOX.ink : RIVOX.paper} tile={dark ? RIVOX.paper : RIVOX.ink} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>App icon</div>
          <Caption dark={dark}>Monochrome keeps it premium. Same construction; no chroma.</Caption>
        </div>
      </div>
    </Sheet>
  );
}

// ── App ───────────────────────────────────────────────────────────────────
function LogoApp() {
  return (
    <DesignCanvas background="#f4f4f0">
      <DCSection
        id="vault"
        title="Direction A · Vault"
        subtitle="Bold geometric R monogram inside an ink tile. A single indigo dot in the counter — the secret inside the vault. Heavy, confident, premium B2B."
      >
        <DCArtboard id="vault-hero-light" label="Hero · light" width={520} height={520}>
          <VaultHero />
        </DCArtboard>
        <DCArtboard id="vault-hero-dark" label="Hero · dark" width={520} height={520}>
          <VaultHero dark />
        </DCArtboard>
        <DCArtboard id="vault-sizes" label="Sizes & monochrome" width={520} height={520}>
          <VaultSizes />
        </DCArtboard>
        <DCArtboard id="vault-context" label="In context" width={520} height={520}>
          <VaultContext />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="cipher"
        title="Direction B · Cipher"
        subtitle="Abstract keyhole — circle + tapered stem. No letterform in the mark. Pure monochrome. Restrained, modern, minimal tech."
      >
        <DCArtboard id="cipher-hero-light" label="Hero · light" width={520} height={520}>
          <CipherHero />
        </DCArtboard>
        <DCArtboard id="cipher-hero-dark" label="Hero · dark" width={520} height={520}>
          <CipherHero dark />
        </DCArtboard>
        <DCArtboard id="cipher-sizes" label="Sizes & inverse" width={520} height={520}>
          <CipherSizes />
        </DCArtboard>
        <DCArtboard id="cipher-context" label="In context" width={520} height={520}>
          <CipherContext />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="compare"
        title="Side-by-side"
        subtitle="Same surfaces, both directions."
      >
        <DCArtboard id="cmp-mark" label="Marks compared" width={620} height={360}>
          <Sheet>
            <Eyebrow>The marks</Eyebrow>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>A vs B</div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1px 1fr', alignItems: 'center', gap: 0, padding: '20px 0' }}>
              <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
                <VaultMark size={108} />
                <div style={{ fontSize: 11, color: '#71717a', fontWeight: 500 }}>Vault</div>
              </div>
              <div style={{ background: '#e5e5e1', height: '60%', alignSelf: 'center' }}></div>
              <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
                <CipherTile size={108} />
                <div style={{ fontSize: 11, color: '#71717a', fontWeight: 500 }}>Cipher</div>
              </div>
            </div>
          </Sheet>
        </DCArtboard>
        <DCArtboard id="cmp-lockup" label="Lockups compared" width={620} height={360}>
          <Sheet>
            <Eyebrow>The lockups</Eyebrow>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>A vs B</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '12px 0' }}>
              <VaultLockup height={44} />
              <div style={{ borderTop: '1px solid #e5e5e1' }}></div>
              <CipherLockup height={44} />
            </div>
          </Sheet>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

const logoRoot = ReactDOM.createRoot(document.getElementById('root'));
logoRoot.render(<LogoApp />);
