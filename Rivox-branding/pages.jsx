// pages.jsx — Modern Rivox page wireframes.

// ───────────────────────────────────────────────────────────────────────────
// API KEYS · Variation A — table with inline share popover
// ───────────────────────────────────────────────────────────────────────────
function ApiKeysA({ theme }) {
  const T = wfTheme[theme];
  const keys = [
    { name: 'prod-anthropic',  env: 'prod',    last: '2 min ago',  shared: 2, owner: 'MK', shares: ['JT'],                color: 'pink',   highlight: true },
    { name: 'prod-openai',     env: 'prod',    last: '11 min ago', shared: 4, owner: 'MK', shares: ['JT','AP','LR'],      color: 'pink' },
    { name: 'staging-stripe',  env: 'staging', last: '3 hr ago',   shared: 7, owner: 'AP', shares: ['MK','JT','LR','PS','DO','KH'], color: 'yellow' },
    { name: 'dev-github',      env: 'dev',     last: 'yesterday',  shared: 1, owner: 'JT', shares: [],                    color: 'green' },
    { name: 'segment-write',   env: 'prod',    last: '4 days ago', shared: 5, owner: 'MK', shares: ['AP','LR','PS','JT'], color: 'pink' },
    { name: 'sendgrid-mail',   env: 'prod',    last: '8 days ago', shared: 3, owner: 'AP', shares: ['MK','PS'],           color: 'pink' },
  ];
  return (
    <React.Fragment>
      <WFSidebar active="keys" theme={theme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.appBg }}>
        <WFPageHead theme={theme}
          title="API Keys"
          subtitle="Manage secrets and who on the team can use them."
          actions={<React.Fragment>
            <WFBtn theme={theme} leftIcon="filter">All environments</WFBtn>
            <WFBtn theme={theme} primary leftIcon="plus">New key</WFBtn>
          </React.Fragment>}
        />
        <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
          {/* Stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
            {[
              { l: 'Total keys',      v: '6',     d: '+1 this week',  acc: false },
              { l: 'In production',   v: '4',     d: 'monitored',     acc: true  },
              { l: 'Shared > 5 ppl',  v: '2',     d: 'review weekly', acc: false },
              { l: 'Calls today',     v: '14.2k', d: 'normal',        acc: false },
            ].map((s, i) => (
              <div key={i} style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: '12px 14px',
                boxShadow: theme === 'dark' ? 'none' : '0 1px 2px rgba(0,0,0,0.02)',
              }}>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{s.l}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.025em' }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: s.acc ? T.accent : T.muted }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 0.6fr 0.9fr 1.2fr 0.5fr',
              gap: 0,
              padding: '10px 16px',
              borderBottom: `1px solid ${T.border}`,
              background: T.surface2,
              fontSize: 10.5, color: T.muted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <div>Key</div><div>Env</div><div>Last used</div><div>Shared with</div><div></div>
            </div>
            {keys.map((k, i) => (
              <div key={k.name} style={{ position: 'relative' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 0.6fr 0.9fr 1.2fr 0.5fr',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: i < keys.length - 1 ? `1px solid ${T.border}` : 'none',
                  background: k.highlight ? T.selectedBg : 'transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: T.neutral,
                      display: 'grid', placeItems: 'center',
                    }}>
                      <WFIcon name="key" size={14} color={T.muted} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, letterSpacing: '-0.005em' }}>{k.name}</div>
                      <div style={{ fontFamily: wfFonts.mono, fontSize: 11, color: T.muted }}>
                        sk-•••••••••{k.name.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <WFChip theme={theme}
                      color={k.env === 'prod' ? 'pink' : k.env === 'staging' ? 'yellow' : 'green'}
                      dot>
                      {k.env}
                    </WFChip>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>{k.last}</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <WFAvatar theme={theme} size={22} initials={k.owner} />
                    {k.shares.slice(0, 3).map((ini, j) => (
                      <div key={j} style={{ marginLeft: -6 }}>
                        <WFAvatar theme={theme} size={22} initials={ini}
                          style={{ boxShadow: `0 0 0 2px ${k.highlight ? T.selectedBg : T.surface}` }} />
                      </div>
                    ))}
                    {k.shares.length > 3 && (
                      <div style={{
                        marginLeft: -6,
                        width: 22, height: 22, borderRadius: '50%',
                        background: T.neutral, color: T.ink2,
                        display: 'grid', placeItems: 'center',
                        fontSize: 10, fontWeight: 600,
                        boxShadow: `0 0 0 2px ${k.highlight ? T.selectedBg : T.surface}`,
                      }}>+{k.shares.length - 3}</div>
                    )}
                    <div style={{ marginLeft: 10, fontSize: 11.5, color: T.muted }}>
                      {k.shared} {k.shared === 1 ? 'person' : 'people'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center',
                      border: `1px solid ${T.border}`, background: T.surface,
                    }}><WFIcon name="copy" size={13} color={T.muted} /></div>
                    <WFBtn theme={theme} sm primary={k.highlight}>Share</WFBtn>
                  </div>
                </div>

                {/* Inline share popover on highlighted row */}
                {k.highlight && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% - 8px)',
                    right: 14,
                    width: 380,
                    background: T.surface,
                    border: `1px solid ${T.borderHard}`,
                    borderRadius: 12,
                    padding: 0,
                    zIndex: 5,
                    boxShadow: theme === 'dark'
                      ? '0 24px 60px -12px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.5)'
                      : '0 24px 60px -12px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
                  }}>
                    {/* notch */}
                    <div style={{
                      position: 'absolute', top: -7, right: 38,
                      width: 12, height: 12, background: T.surface,
                      borderLeft: `1px solid ${T.borderHard}`,
                      borderTop: `1px solid ${T.borderHard}`,
                      transform: 'rotate(45deg)',
                    }}></div>

                    <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <WFIcon name="share" size={14} color={T.accent} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>
                          Share access · prod-anthropic
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 3 }}>
                        Members can use this key. Access is audit-logged.
                      </div>
                    </div>

                    {/* invite */}
                    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        border: `1px solid ${T.border}`,
                        borderRadius: 7,
                        padding: 3,
                        background: T.surface2,
                      }}>
                        <div style={{
                          flex: 1, padding: '6px 8px',
                          fontSize: 12, color: T.muted,
                        }}>email, @handle, or group…</div>
                        <div style={{
                          fontSize: 11, color: T.muted, padding: '0 8px',
                          borderRight: `1px solid ${T.border}`,
                        }}>can use ▾</div>
                        <WFBtn theme={theme} sm primary>Invite</WFBtn>
                      </div>
                    </div>

                    {/* members */}
                    <div style={{ padding: '6px 8px' }}>
                      {[
                        { ini: 'MK', name: 'Maya Kapoor',    sub: 'maya@acme.com',     role: 'Owner',   you: true },
                        { ini: 'JT', name: 'Jordan Tan',      sub: 'jordan@acme.com',   role: 'Can use', you: false },
                      ].map((p, j) => (
                        <div key={j} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 8px', borderRadius: 6,
                        }}>
                          <WFAvatar theme={theme} size={28} initials={p.ini} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, color: T.ink, letterSpacing: '-0.005em' }}>
                              {p.name} {p.you && <span style={{ fontWeight: 400, color: T.muted, fontSize: 11 }}>(you)</span>}
                            </div>
                            <div style={{ fontSize: 11, color: T.muted }}>{p.sub}</div>
                          </div>
                          <div style={{
                            fontSize: 11.5, color: p.role === 'Owner' ? T.muted : T.ink2,
                            padding: '3px 8px',
                            border: `1px solid ${p.role === 'Owner' ? 'transparent' : T.border}`,
                            borderRadius: 5,
                          }}>{p.role}{p.role !== 'Owner' && ' ▾'}</div>
                        </div>
                      ))}

                      {/* group */}
                      <div style={{ borderTop: `1px solid ${T.border}`, margin: '6px 0' }}></div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 8px', borderRadius: 6,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: T.accentSoft,
                          color: T.accent,
                          display: 'grid', placeItems: 'center',
                        }}><WFIcon name="group" size={15} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: T.ink, letterSpacing: '-0.005em' }}>Backend</div>
                          <div style={{ fontSize: 11, color: T.muted }}>6 members inherit access</div>
                        </div>
                        <div style={{
                          fontSize: 11.5, color: T.ink2,
                          padding: '3px 8px',
                          border: `1px solid ${T.border}`,
                          borderRadius: 5,
                        }}>Can view ▾</div>
                      </div>
                    </div>

                    {/* footer options */}
                    <div style={{
                      padding: '10px 16px',
                      borderTop: `1px solid ${T.border}`,
                      background: T.surface2,
                      display: 'flex', alignItems: 'center', gap: 12,
                      fontSize: 11.5, color: T.muted,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <WFIcon name="rotate" size={13} color={T.muted} />
                        Auto-rotate · 90 days
                      </div>
                      <div style={{ flex: 1 }}></div>
                      <WFBtn theme={theme} sm ghost>Settings</WFBtn>
                      <WFBtn theme={theme} sm>Done</WFBtn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// API KEYS · Variation B — split-view drill-down
// ───────────────────────────────────────────────────────────────────────────
function ApiKeysB({ theme }) {
  const T = wfTheme[theme];
  const keys = [
    { name: 'prod-anthropic', env: 'prod',    color: 'pink',   sel: true },
    { name: 'prod-openai',    env: 'prod',    color: 'pink' },
    { name: 'staging-stripe', env: 'staging', color: 'yellow' },
    { name: 'dev-github',     env: 'dev',     color: 'green' },
    { name: 'segment-write',  env: 'prod',    color: 'pink' },
    { name: 'sendgrid-mail',  env: 'prod',    color: 'pink' },
  ];
  return (
    <React.Fragment>
      <WFSidebar active="keys" theme={theme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.appBg }}>
        <WFPageHead theme={theme}
          title="API Keys"
          subtitle="Select a key to manage permissions and rotation."
          actions={<React.Fragment>
            <WFBtn theme={theme} leftIcon="search">Search</WFBtn>
            <WFBtn theme={theme} primary leftIcon="plus">New key</WFBtn>
          </React.Fragment>}
        />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* keys list */}
          <div style={{
            width: 256, flex: '0 0 256px',
            borderRight: `1px solid ${T.border}`,
            background: T.surface,
            padding: 12,
            display: 'flex', flexDirection: 'column', gap: 2,
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 10px' }}>
              <WFEyebrow theme={theme}>All keys · 6</WFEyebrow>
              <div style={{ fontSize: 11, color: T.muted }}>↕ sort</div>
            </div>
            {keys.map(k => (
              <div key={k.name} style={{
                padding: '9px 10px',
                borderRadius: 7,
                background: k.sel ? T.selectedBg : 'transparent',
                border: k.sel ? `1px solid ${T.selectedBd}` : '1px solid transparent',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: k.sel ? T.surface : T.neutral,
                  display: 'grid', placeItems: 'center',
                }}>
                  <WFIcon name="key" size={13} color={k.sel ? T.accent : T.muted} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: T.ink, letterSpacing: '-0.005em' }}>{k.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: T[k.env === 'prod' ? 'prod' : k.env === 'staging' ? 'staging' : 'dev'] }}></span>
                    <span style={{ fontSize: 10.5, color: T.muted }}>{k.env}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* detail */}
          <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.025em' }}>prod-anthropic</div>
              <WFChip theme={theme} color="pink" dot>prod</WFChip>
              <WFChip theme={theme} color="green" dot>active</WFChip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ fontFamily: wfFonts.mono, fontSize: 12, color: T.muted, background: T.neutral, padding: '4px 10px', borderRadius: 5 }}>
                sk-ant-•••••••••••••••••••••dpc
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: T.surface, border: `1px solid ${T.border}`,
                display: 'grid', placeItems: 'center',
              }}>
                <WFIcon name="copy" size={13} color={T.muted} />
              </div>
              <div style={{ fontSize: 11.5, color: T.muted }}>Created Mar 14 by Maya</div>
            </div>

            {/* stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
              {[
                { l: 'Calls this month',  v: '1,294',     d: '↑ 18%'  },
                { l: 'Shared with',       v: '2 + 1 group', d: '8 people total' },
                { l: 'Next rotation',     v: '63 days',   d: 'auto'   },
              ].map((s, i) => (
                <div key={i} style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{s.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: T.ink, marginTop: 4, letterSpacing: '-0.02em' }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{s.d}</div>
                </div>
              ))}
            </div>

            {/* Access section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>Access</div>
              <WFBtn theme={theme} sm primary leftIcon="plus">Share</WFBtn>
            </div>
            <div style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 18,
            }}>
              {[
                { who: 'Maya Kapoor',  sub: 'maya@acme.com',    role: 'Owner',    ini: 'MK', isGroup: false },
                { who: 'Jordan Tan',   sub: 'jordan@acme.com',  role: 'Can use',  ini: 'JT', isGroup: false },
                { who: 'Backend',      sub: '6 members inherit',role: 'Can view', ini: null, isGroup: true },
              ].map((p, j, arr) => (
                <div key={j} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderBottom: j < arr.length - 1 ? `1px solid ${T.border}` : 'none',
                }}>
                  {p.isGroup ? (
                    <div style={{
                      width: 30, height: 30, borderRadius: 7,
                      background: T.accentSoft, color: T.accent,
                      display: 'grid', placeItems: 'center',
                    }}><WFIcon name="group" size={15} /></div>
                  ) : (
                    <WFAvatar theme={theme} size={30} initials={p.ini} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, letterSpacing: '-0.005em' }}>{p.who}</div>
                    <div style={{ fontSize: 11.5, color: T.muted }}>{p.sub}</div>
                  </div>
                  <div style={{
                    fontSize: 11.5, color: p.role === 'Owner' ? T.muted : T.ink2,
                    padding: '4px 10px',
                    border: `1px solid ${p.role === 'Owner' ? 'transparent' : T.border}`,
                    borderRadius: 6,
                  }}>{p.role}{p.role !== 'Owner' && ' ▾'}</div>
                  {p.role !== 'Owner' && (
                    <div style={{
                      width: 26, height: 26, borderRadius: 6,
                      display: 'grid', placeItems: 'center',
                    }}><WFIcon name="close" size={13} color={T.muted} /></div>
                  )}
                </div>
              ))}
            </div>

            {/* Activity */}
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', marginBottom: 8 }}>Activity</div>
            <div style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: '6px 14px',
            }}>
              {[
                { ini: 'MK', text: 'Maya shared access with Jordan Tan',     time: '2 hours ago' },
                { ini: '⟳',  text: 'Auto-rotated · new value issued',          time: '3 days ago', sys: true },
                { ini: 'JT', text: 'Jordan used key from staging.acme.com',  time: 'Mar 16' },
                { ini: 'MK', text: 'Maya created key',                         time: 'Mar 14' },
              ].map((a, j, arr) => (
                <div key={j} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: j < arr.length - 1 ? `1px solid ${T.border}` : 'none',
                }}>
                  {a.sys ? (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: T.neutral, color: T.muted,
                      display: 'grid', placeItems: 'center', fontSize: 13,
                    }}>⟳</div>
                  ) : (
                    <WFAvatar theme={theme} size={24} initials={a.ini} />
                  )}
                  <div style={{ flex: 1, fontSize: 12.5, color: T.ink2, letterSpacing: '-0.005em' }}>{a.text}</div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// STICKY — scope toggle (shared)
// ───────────────────────────────────────────────────────────────────────────
function StickyScopeToggle({ theme, scope }) {
  const T = wfTheme[theme];
  return (
    <div style={{
      display: 'inline-flex',
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 7,
      padding: 2,
      fontSize: 12, fontWeight: 500,
    }}>
      {[
        { id: 'me',   label: 'My board',   icon: 'user'  },
        { id: 'team', label: 'Team board', icon: 'users' },
      ].map((s, i) => {
        const active = s.id === scope;
        return (
          <div key={s.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            borderRadius: 5,
            background: active ? T.neutral : 'transparent',
            color: active ? T.ink : T.muted,
            letterSpacing: '-0.005em',
          }}>
            <WFIcon name={s.icon} size={13} color={active ? T.ink : T.muted} />
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

// ── Layout switcher pill ──────────────────────────────────────────────────
function StickyLayoutSwitcher({ theme, active }) {
  const T = wfTheme[theme];
  const layouts = [
    { id: 'canvas', icon: 'canvas' },
    { id: 'kanban', icon: 'kanban' },
    { id: 'grid',   icon: 'grid' },
  ];
  return (
    <div style={{
      display: 'inline-flex',
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 7, padding: 2,
    }}>
      {layouts.map(l => (
        <div key={l.id} style={{
          width: 28, height: 24, borderRadius: 5,
          display: 'grid', placeItems: 'center',
          background: l.id === active ? T.neutral : 'transparent',
        }}>
          <WFIcon name={l.icon} size={13} color={l.id === active ? T.ink : T.muted} />
        </div>
      ))}
    </div>
  );
}

function StickyNote({ theme, color = 'yellow', title, body, meta, transform, style }) {
  const T = wfTheme[theme];
  return (
    <div style={{
      background: T[color],
      color: T[color + 'Ink'],
      border: theme === 'dark' ? `1px solid ${T.border}` : 'none',
      borderRadius: 10,
      padding: 12,
      transform: transform || 'none',
      boxShadow: theme === 'dark'
        ? '0 1px 2px rgba(0,0,0,0.4)'
        : '0 1px 2px rgba(0,0,0,0.04), 0 1px 0 rgba(0,0,0,0.02)',
      display: 'flex', flexDirection: 'column', gap: 6,
      ...style,
    }}>
      {title && (
        <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</div>
      )}
      {body && (
        <div style={{ fontSize: 11.5, lineHeight: 1.4, opacity: 0.85, whiteSpace: 'pre-line' }}>{body}</div>
      )}
      {meta}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// STICKY · Free canvas
// ───────────────────────────────────────────────────────────────────────────
function StickyFree({ theme, scope = 'me' }) {
  const T = wfTheme[theme];
  const notes = [
    { x: 28,  y: 24,  w: 168, h: 110, color: 'yellow', title: 'Onboarding flow', body: 'Hero copy · sign-up · first key creation' },
    { x: 220, y: 60,  w: 178, h: 132, color: 'blue',   title: 'Ship Friday', body: '☑ Rotate API\n☐ Admin invites\n☐ Audit log v1', meta: 'Due Fri 5pm' },
    { x: 80,  y: 192, w: 160, h: 104, color: 'pink',   title: 'Idea', body: 'Share keys via group, not individual user.' },
    { x: 268, y: 224, w: 180, h: 120, color: 'green',  title: 'Standup notes', body: 'Maya — keys UI\nJordan — sticky\nAlex — perms' },
    { x: 472, y: 100, w: 168, h: 134, color: 'yellow', title: 'Questions for legal', body: 'Key ownership · audit retention · SSO scope' },
    { x: 512, y: 264, w: 140, h: 90,  color: 'purple', title: 'Heads up', body: 'Sticky board needs export by EOM.' },
  ];
  return (
    <React.Fragment>
      <WFSidebar active="sticky" theme={theme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.appBg }}>
        <WFPageHead theme={theme}
          title="Sticky Board"
          subtitle="Capture, arrange and connect — your personal canvas."
          actions={<React.Fragment>
            <StickyScopeToggle theme={theme} scope={scope} />
            <StickyLayoutSwitcher theme={theme} active="canvas" />
            <WFBtn theme={theme} primary leftIcon="plus">Note</WFBtn>
          </React.Fragment>}
        />
        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          backgroundImage: `radial-gradient(circle, ${theme === 'dark' ? '#262626' : '#dcdcd8'} 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
          backgroundPosition: '0 0',
        }}>
          {/* connection line */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
            <path d="M 200 140 Q 250 100 290 140" fill="none"
              stroke={T.accent} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.55" />
          </svg>

          {notes.map((n, i) => (
            <div key={i} style={{ position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h }}>
              <StickyNote theme={theme}
                color={n.color}
                title={n.title}
                body={n.body}
                meta={n.meta && (
                  <div style={{ marginTop: 'auto', fontSize: 10.5, opacity: 0.7, letterSpacing: '-0.005em' }}>{n.meta}</div>
                )}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ))}

          {/* Toolbar */}
          <div style={{
            position: 'absolute', left: '50%', bottom: 18,
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 2,
            padding: 4,
            background: T.surface, border: `1px solid ${T.borderHard}`,
            borderRadius: 999,
            boxShadow: theme === 'dark'
              ? '0 8px 24px rgba(0,0,0,0.5)'
              : '0 8px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {[
              { c: 'yellow' }, { c: 'blue' }, { c: 'pink' }, { c: 'green' }, { c: 'purple' },
            ].map((b, i) => (
              <div key={i} style={{
                width: 26, height: 26, borderRadius: '50%',
                background: T[b.c],
                border: theme === 'dark' ? `1px solid ${T.border}` : 'none',
                margin: 2,
              }}></div>
            ))}
            <div style={{ width: 1, height: 18, background: T.border, margin: '0 4px' }}></div>
            {['plus', 'pin', 'bolt'].map((ic, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i === 0 ? T.ink : 'transparent',
                color: i === 0 ? T.surface : T.ink2,
                display: 'grid', placeItems: 'center',
              }}>
                <WFIcon name={ic} size={14} color={i === 0 ? T.surface : T.muted} />
              </div>
            ))}
          </div>

          {/* Zoom indicator */}
          <div style={{
            position: 'absolute', right: 16, bottom: 18,
            padding: '5px 10px',
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 6,
            fontSize: 11, color: T.muted, fontFamily: wfFonts.mono,
          }}>100%</div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// STICKY · Kanban
// ───────────────────────────────────────────────────────────────────────────
function StickyKanban({ theme, scope = 'team' }) {
  const T = wfTheme[theme];
  const cols = [
    { name: 'Inbox',  dot: T.muted,   notes: [
      { c: 'yellow', t: 'Review key sharing UX', sub: 'Compare A vs B with engineering', who: 'MK', tag: 'design' },
      { c: 'blue',   t: 'SSO scoping question',  sub: 'Confirm Okta groups → Rivox roles', who: 'JT', tag: 'auth' },
      { c: 'pink',   t: 'Audit retention policy?', sub: 'Legal needs answer by Wed',     who: 'AP', tag: 'legal' },
    ]},
    { name: 'In progress', dot: T.staging, notes: [
      { c: 'green',  t: 'Wireframe admin page',   sub: 'Groups + permission matrix',     who: 'MK', tag: 'design' },
      { c: 'yellow', t: 'Auto-rotation timer',     sub: 'Cron + slack alert on rotate',   who: 'LR', tag: 'backend' },
    ]},
    { name: 'In review',  dot: T.accent, notes: [
      { c: 'pink',   t: 'Group invite flow',       sub: '@username, bulk paste, CSV',    who: 'JT', tag: 'frontend' },
    ]},
    { name: 'Done',       dot: T.dev,    notes: [
      { c: 'blue',   t: 'Design system colors',    sub: 'Light + dark tokens',           who: 'MK', tag: 'design' },
      { c: 'green',  t: 'Mac frame component',     sub: 'Used across mocks',             who: 'AP', tag: 'design' },
      { c: 'yellow', t: 'Login screen v1',         sub: 'Email + magic link',            who: 'JT', tag: 'frontend' },
    ]},
  ];
  return (
    <React.Fragment>
      <WFSidebar active="sticky" theme={theme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.appBg }}>
        <WFPageHead theme={theme}
          title="Sticky Board"
          subtitle="Team tasks · 9 notes across 4 columns."
          actions={<React.Fragment>
            <StickyScopeToggle theme={theme} scope={scope} />
            <StickyLayoutSwitcher theme={theme} active="kanban" />
            <WFBtn theme={theme} primary leftIcon="plus">Note</WFBtn>
          </React.Fragment>}
        />
        <div style={{ flex: 1, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, overflow: 'auto' }}>
          {cols.map(col => (
            <div key={col.name} style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              minHeight: 0,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '2px 6px',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot }}></span>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>{col.name}</div>
                <div style={{ fontSize: 11.5, color: T.muted }}>{col.notes.length}</div>
                <div style={{ flex: 1 }}></div>
                <WFIcon name="plus" size={14} color={T.muted} />
              </div>
              {col.notes.map((n, ni) => (
                <StickyNote key={ni}
                  theme={theme}
                  color={n.c}
                  title={n.t}
                  body={n.sub}
                  meta={
                    <div style={{
                      marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
                      paddingTop: 8,
                      borderTop: `1px solid rgba(0,0,0,0.06)`,
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 500,
                        padding: '1px 6px',
                        background: 'rgba(0,0,0,0.06)',
                        borderRadius: 3,
                        letterSpacing: '0',
                      }}>{n.tag}</span>
                      <div style={{ flex: 1 }}></div>
                      <WFAvatar theme={theme} size={20} initials={n.who} style={{ boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.6)' }} />
                    </div>
                  }
                />
              ))}
              <div style={{
                padding: '8px 10px',
                border: `1px dashed ${T.borderHard}`,
                borderRadius: 8,
                fontSize: 11.5, color: T.muted,
                textAlign: 'center', letterSpacing: '-0.005em',
              }}>+ Add note</div>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// STICKY · Grid
// ───────────────────────────────────────────────────────────────────────────
function StickyGrid({ theme, scope = 'me' }) {
  const T = wfTheme[theme];
  const notes = [
    { c: 'yellow', t: 'Rotate prod keys',    d: 'Every 90 days · auto',         date: 'Today' },
    { c: 'blue',   t: 'Invite Alex',          d: 'Admin → Team',                 date: 'Today' },
    { c: 'pink',   t: 'Design review',        d: 'Thu 3pm with Jordan & Maya',   date: 'Thu' },
    { c: 'green',  t: 'Export audit log',     d: 'Last 30 days · CSV',           date: 'Fri' },
    { c: 'yellow', t: 'Docs for SSO',         d: 'Okta + Google Workspace',      date: '—' },
    { c: 'blue',   t: 'Sticky drag bug',      d: 'Safari only, free canvas',     date: 'Mon' },
    { c: 'purple', t: 'Pricing page copy',    d: 'Pair with Mira',               date: 'Next week' },
    { c: 'green',  t: 'Jordan’s birthday',    d: 'Cake at 4pm',                  date: 'Fri' },
  ];
  return (
    <React.Fragment>
      <WFSidebar active="sticky" theme={theme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.appBg }}>
        <WFPageHead theme={theme}
          title="Sticky Board"
          subtitle="All notes · sorted by date · 8 items."
          actions={<React.Fragment>
            <StickyScopeToggle theme={theme} scope={scope} />
            <StickyLayoutSwitcher theme={theme} active="grid" />
            <WFBtn theme={theme} primary leftIcon="plus">Note</WFBtn>
          </React.Fragment>}
        />
        <div style={{
          flex: 1, padding: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          overflow: 'auto',
          alignContent: 'start',
        }}>
          {notes.map((n, i) => (
            <StickyNote
              key={i}
              theme={theme}
              color={n.c}
              title={n.t}
              body={n.d}
              style={{ minHeight: 130 }}
              meta={
                <div style={{
                  marginTop: 'auto', paddingTop: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 10.5, fontWeight: 500, letterSpacing: '-0.005em',
                  borderTop: `1px solid rgba(0,0,0,0.06)`,
                  opacity: 0.85,
                }}>
                  <WFIcon name="pin" size={11} />
                  {n.date}
                  <div style={{ flex: 1 }}></div>
                  <WFIcon name="dot3" size={12} />
                </div>
              }
            />
          ))}
          {/* Add tile */}
          <div style={{
            border: `1px dashed ${T.borderHard}`,
            borderRadius: 10,
            minHeight: 130,
            display: 'grid', placeItems: 'center',
            fontSize: 12, color: T.muted, fontWeight: 500, letterSpacing: '-0.005em',
            background: T.surface,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <WFIcon name="plus" size={13} />
              New note
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// ADMIN · Variation A — groups + member detail
// ───────────────────────────────────────────────────────────────────────────
function AdminTeamA({ theme }) {
  const T = wfTheme[theme];
  const groups = [
    { name: 'Backend',     desc: 'API & infrastructure',  members: 6, keys: 4, role: 'Engineer', color: T.accent,    sel: true },
    { name: 'Frontend',    desc: 'Product UI',            members: 4, keys: 2, role: 'Engineer', color: '#3b82f6' },
    { name: 'Design',      desc: 'Product design',        members: 3, keys: 0, role: 'Designer', color: '#ec4899' },
    { name: 'Ops',         desc: 'DevOps & SRE',          members: 2, keys: 6, role: 'Admin',    color: '#f59e0b' },
    { name: 'Contractors', desc: 'Time-boxed access',     members: 5, keys: 1, role: 'Viewer',   color: '#10b981' },
  ];
  return (
    <React.Fragment>
      <WFSidebar active="team" theme={theme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.appBg }}>
        <WFPageHead theme={theme}
          title="Team & Groups"
          subtitle="20 people · 5 groups · 2 admins"
          actions={<React.Fragment>
            <WFBtn theme={theme} leftIcon="users">Invite</WFBtn>
            <WFBtn theme={theme} primary leftIcon="plus">New group</WFBtn>
          </React.Fragment>}
        />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* groups list */}
          <div style={{
            flex: 1.05, padding: 18,
            display: 'flex', flexDirection: 'column', gap: 8,
            overflow: 'auto',
            borderRight: `1px solid ${T.border}`,
          }}>
            <WFEyebrow theme={theme} style={{ padding: '0 4px 4px' }}>Groups</WFEyebrow>
            {groups.map(g => (
              <div key={g.name} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 14px',
                background: T.surface,
                border: `1px solid ${g.sel ? T.selectedBd : T.border}`,
                borderRadius: 10,
                outline: g.sel ? `2px solid ${T.accentSoft}` : 'none',
                outlineOffset: -1,
                boxShadow: theme === 'dark' ? 'none' : '0 1px 2px rgba(0,0,0,0.02)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: g.color, color: '#fff',
                  display: 'grid', placeItems: 'center',
                  fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
                }}>{g.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>{g.name}</div>
                    <WFChip theme={theme} color="neutral">{g.role}</WFChip>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{g.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right', minWidth: 60 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>{g.members}</div>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>members</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 50 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>{g.keys}</div>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>keys</div>
                  </div>
                  <WFIcon name="chev" size={14} color={T.muted} />
                </div>
              </div>
            ))}
          </div>

          {/* Group detail */}
          <div style={{ flex: 1, padding: 22, overflow: 'auto' }}>
            <WFEyebrow theme={theme}>Group</WFEyebrow>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 4 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: T.accent, color: '#fff',
                display: 'grid', placeItems: 'center',
                fontSize: 17, fontWeight: 600,
              }}>B</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.025em', lineHeight: 1.2 }}>Backend</div>
                <div style={{ fontSize: 11.5, color: T.muted }}>API & infrastructure · created Feb 2 by Maya</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 14, marginBottom: 20 }}>
              <WFBtn theme={theme} primary sm leftIcon="plus">Add member</WFBtn>
              <WFBtn theme={theme} sm>Rename</WFBtn>
              <WFBtn theme={theme} sm>Permissions</WFBtn>
              <div style={{ flex: 1 }}></div>
              <WFBtn theme={theme} sm danger>Delete</WFBtn>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Members · 6</div>
              <div style={{ fontSize: 11.5, color: T.muted }}>Sort by name ▾</div>
            </div>
            <div style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 20,
            }}>
              {[
                { who: 'Maya Kapoor', email: 'maya@acme.com',   role: 'Admin',    ini: 'MK' },
                { who: 'Jordan Tan',  email: 'jordan@acme.com', role: 'Engineer', ini: 'JT' },
                { who: 'Alex Park',   email: 'alex@acme.com',   role: 'Engineer', ini: 'AP' },
                { who: 'Liam Reyes',  email: 'liam@acme.com',   role: 'Engineer', ini: 'LR' },
                { who: 'Priya Singh', email: 'priya@acme.com',  role: 'Viewer',   ini: 'PS' },
                { who: 'Daniel Oh',   email: 'daniel@acme.com', role: 'Engineer', ini: 'DO' },
              ].map((m, j, arr) => (
                <div key={j} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderBottom: j < arr.length - 1 ? `1px solid ${T.border}` : 'none',
                }}>
                  <WFAvatar theme={theme} size={26} initials={m.ini} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: T.ink, letterSpacing: '-0.005em' }}>{m.who}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{m.email}</div>
                  </div>
                  <div style={{
                    fontSize: 11.5, color: T.ink2,
                    padding: '3px 8px',
                    border: `1px solid ${T.border}`,
                    borderRadius: 5,
                  }}>{m.role} ▾</div>
                  <WFIcon name="dot3" size={14} color={T.muted} />
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Inherited access</div>
            <div style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: 12,
              display: 'flex', flexWrap: 'wrap', gap: 6,
            }}>
              {[
                ['prod-anthropic', 'pink'],
                ['prod-openai',    'pink'],
                ['staging-stripe', 'yellow'],
                ['dev-github',     'green'],
              ].map(([n, c]) => (
                <div key={n} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  background: T[c], color: T[c + 'Ink'],
                  borderRadius: 6,
                  fontSize: 11.5, fontWeight: 500, letterSpacing: '-0.005em',
                }}>
                  <WFIcon name="key" size={12} />
                  {n}
                </div>
              ))}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px',
                background: 'transparent',
                color: T.muted,
                border: `1px dashed ${T.borderHard}`,
                borderRadius: 6,
                fontSize: 11.5, fontWeight: 500,
              }}>
                <WFIcon name="plus" size={12} />
                Assign key
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// ADMIN · Variation B — permission matrix
// ───────────────────────────────────────────────────────────────────────────
function AdminTeamB({ theme }) {
  const T = wfTheme[theme];
  const groups = [
    { name: 'Backend',     color: T.accent,    members: 6,  perms: [3,2,2,1,3] },
    { name: 'Frontend',    color: '#3b82f6',  members: 4,  perms: [2,1,2,0,2] },
    { name: 'Design',      color: '#ec4899',  members: 3,  perms: [1,0,2,0,1] },
    { name: 'Ops',         color: '#f59e0b',  members: 2,  perms: [3,3,3,3,3] },
    { name: 'Contractors', color: '#10b981',  members: 5,  perms: [1,0,1,0,0] },
  ];
  const caps = [
    { name: 'View keys',     icon: 'eye'    },
    { name: 'Use keys',      icon: 'key'    },
    { name: 'Sticky board',  icon: 'sticky' },
    { name: 'Manage team',   icon: 'users'  },
    { name: 'Billing',       icon: 'lock'   },
  ];

  const legend = [
    { lvl: 0, label: 'No access',  bg: 'transparent',    border: T.border,     fg: T.mutedSoft },
    { lvl: 1, label: 'View',       bg: T.surface,        border: T.borderHard, fg: T.ink2 },
    { lvl: 2, label: 'Use',        bg: T.accentSoft,     border: T.accent,     fg: T.accent },
    { lvl: 3, label: 'Admin',      bg: T.accent,         border: T.accent,     fg: T.accentInk },
  ];

  const cell = (lvl) => {
    const m = legend[lvl];
    return (
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: m.bg,
        border: `1px solid ${m.border}`,
        display: 'grid', placeItems: 'center',
        color: m.fg,
      }}>
        {lvl === 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.mutedSoft }}></span>}
        {lvl === 1 && <WFIcon name="eye" size={13} color={m.fg} />}
        {lvl === 2 && <WFIcon name="check" size={14} color={m.fg} />}
        {lvl === 3 && <WFIcon name="bolt" size={13} color={m.fg} />}
      </div>
    );
  };

  return (
    <React.Fragment>
      <WFSidebar active="team" theme={theme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.appBg }}>
        <WFPageHead theme={theme}
          title="Team & Permissions"
          subtitle="Configure what each group can do. Click a cell to change level."
          actions={<React.Fragment>
            <WFBtn theme={theme} leftIcon="users">List view</WFBtn>
            <WFBtn theme={theme} primary leftIcon="plus">New group</WFBtn>
          </React.Fragment>}
        />

        {/* Legend strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '12px 24px',
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          fontSize: 12, color: T.muted,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</span>
          {legend.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {cell(i)}
              <span style={{ fontSize: 12, color: T.ink2 }}>{l.label}</span>
            </div>
          ))}
          <div style={{ flex: 1 }}></div>
          <span style={{ fontSize: 11.5, color: T.muted }}>5 groups · 20 people · changes auto-save</span>
        </div>

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <div style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: theme === 'dark' ? 'none' : '0 1px 2px rgba(0,0,0,0.02)',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `220px repeat(${caps.length}, 1fr)`,
              background: T.surface2,
              borderBottom: `1px solid ${T.border}`,
            }}>
              <div style={{
                padding: '12px 16px',
                fontSize: 10.5, fontWeight: 600,
                color: T.muted,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Group</div>
              {caps.map(c => (
                <div key={c.name} style={{
                  padding: '12px 8px',
                  borderLeft: `1px solid ${T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 12, fontWeight: 500,
                  color: T.ink2, letterSpacing: '-0.005em',
                }}>
                  <WFIcon name={c.icon} size={13} color={T.muted} />
                  {c.name}
                </div>
              ))}
            </div>

            {/* Body */}
            {groups.map((g, gi) => (
              <div key={g.name} style={{
                display: 'grid',
                gridTemplateColumns: `220px repeat(${caps.length}, 1fr)`,
                borderBottom: gi < groups.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: g.color, color: '#fff',
                    display: 'grid', placeItems: 'center',
                    fontSize: 12, fontWeight: 600,
                  }}>{g.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, letterSpacing: '-0.005em' }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{g.members} members</div>
                  </div>
                </div>
                {g.perms.map((lvl, ci) => (
                  <div key={ci} style={{
                    padding: '14px 8px',
                    borderLeft: `1px solid ${T.border}`,
                    display: 'grid', placeItems: 'center',
                  }}>{cell(lvl)}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            fontSize: 12, color: T.muted,
          }}>
            <WFIcon name="bolt" size={14} color={T.accent} />
            <span>Tip — shift-click to bulk-edit cells across a column or row.</span>
            <div style={{ flex: 1 }}></div>
            <WFBtn theme={theme} sm>Export CSV</WFBtn>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, {
  ApiKeysA, ApiKeysB,
  StickyFree, StickyKanban, StickyGrid,
  StickyScopeToggle, StickyLayoutSwitcher, StickyNote,
  AdminTeamA, AdminTeamB,
});
