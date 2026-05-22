// app.jsx — Rivox wireframe explorations on a design canvas

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light"
}/*EDITMODE-END*/;

const FRAME_W = 1100;
const FRAME_H = 700;

function FrameWrap({ title, theme, children }) {
  return (
    <WFMacFrame title={title} theme={theme} width={FRAME_W} height={FRAME_H}>
      {children}
    </WFMacFrame>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = t.theme;
  const canvasBg = theme === 'dark' ? '#0a0a0a' : '#f4f4f0';
  const canvasInk = theme === 'dark' ? '#fafafa' : '#0a0a0a';

  // override design-canvas root colors
  React.useEffect(() => {
    const id = 'wf-canvas-overrides';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = `
      body { background: ${canvasBg} !important; color: ${canvasInk}; }
      .dc-bg, .dc-canvas-bg, [data-dc-root] { background: ${canvasBg} !important; }
    `;
  }, [theme, canvasBg, canvasInk]);

  return (
    <React.Fragment>
      <DesignCanvas background={canvasBg}>
        <DCSection id="api-keys" title="API Keys — per-key sharing" subtitle="Two takes on managing who can see each key. Variation A: inline popover anchored to the row. Variation B: drill-down detail with bigger access list + audit.">
          <DCArtboard id="keys-a" label="A · inline popover" width={FRAME_W} height={FRAME_H}>
            <FrameWrap title="Rivox — API Keys" theme={theme}><ApiKeysA theme={theme} /></FrameWrap>
          </DCArtboard>
          <DCArtboard id="keys-b" label="B · split detail" width={FRAME_W} height={FRAME_H}>
            <FrameWrap title="Rivox — API Keys" theme={theme}><ApiKeysB theme={theme} /></FrameWrap>
          </DCArtboard>
        </DCSection>

        <DCSection id="sticky" title="Sticky Board — three layouts" subtitle="The same notes shown three ways. Toggle in-product between 'my board' and 'team board'.">
          <DCArtboard id="sticky-free" label="free canvas" width={FRAME_W} height={FRAME_H}>
            <FrameWrap title="Rivox — Sticky Board" theme={theme}><StickyFree theme={theme} scope="me" /></FrameWrap>
          </DCArtboard>
          <DCArtboard id="sticky-kanban" label="kanban columns" width={FRAME_W} height={FRAME_H}>
            <FrameWrap title="Rivox — Sticky Board" theme={theme}><StickyKanban theme={theme} scope="team" /></FrameWrap>
          </DCArtboard>
          <DCArtboard id="sticky-grid" label="tidy grid" width={FRAME_W} height={FRAME_H}>
            <FrameWrap title="Rivox — Sticky Board" theme={theme}><StickyGrid theme={theme} scope="me" /></FrameWrap>
          </DCArtboard>
        </DCSection>

        <DCSection id="admin" title="Admin — groups & permissions" subtitle="A. Group-first list with member detail panel. B. Permission matrix (group × capability).">
          <DCArtboard id="admin-a" label="A · groups + members" width={FRAME_W} height={FRAME_H}>
            <FrameWrap title="Rivox — Team" theme={theme}><AdminTeamA theme={theme} /></FrameWrap>
          </DCArtboard>
          <DCArtboard id="admin-b" label="B · permission matrix" width={FRAME_W} height={FRAME_H}>
            <FrameWrap title="Rivox — Team" theme={theme}><AdminTeamB theme={theme} /></FrameWrap>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakRadio
          label="Mode"
          value={theme}
          options={['light', 'dark']}
          onChange={(v) => setTweak('theme', v)}
        />
      </TweaksPanel>
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
