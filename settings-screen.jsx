// settings-screen.jsx — FitYear Settings screen prototype
const { BG, CARD, CARD2, BORDER, BORDER2, PRI, PRI_FG, TEXT, MUTED, MUTED2, GREEN, Ic } = window;

function SettingsScreen({ onBack }) {
  const [weekStart, setWeekStart] = React.useState('monday');
  const [weightUnit, setWeightUnit] = React.useState('kg');
  const [restTimerAuto, setRestTimerAuto] = React.useState(true);
  const [showConversion, setShowConversion] = React.useState(true);
  const [selectedCal, setSelectedCal] = React.useState('gym');
  const [monthlyGoal, setMonthlyGoal] = React.useState(16);
  const [fitBotDefault, setFitBotDefault] = React.useState('strength');

  const calendars = [
    { id: 'personal', label: 'Ivo Personal',      color: '#8b8fa8', sub: 'Primary calendar' },
    { id: 'gmail',    label: 'ivo.andov@gmail.com',color: '#6b77cc', sub: '' },
    { id: 'bt',       label: 'Ivo BT Schedule',    color: '#d4776b', sub: '' },
    { id: 'todoist',  label: 'Todoist',             color: '#8b6bcc', sub: '' },
    { id: 'bbycito',  label: 'Bbycito',             color: '#4db8a0', sub: '' },
    { id: 'roommates',label: 'Roommates',            color: '#8b6bcc', sub: '' },
    { id: 'discord',  label: 'Events Happening Discord Group', color: '#ccb84d', sub: '' },
    { id: 'gym',      label: 'Gym',                 color: '#8b6bcc', sub: '' },
    { id: 'marketeq', label: 'Ivo @ Marketeq',      color: '#d4776b', sub: '' },
    { id: 'fondski',  label: 'Fondski',              color: '#6bcc7a', sub: '' },
  ];

  const muscles = ['Chest', 'Triceps', 'Back', 'Biceps', 'Shoulders', 'Legs', 'Abs/Core', 'Cardio', 'Forearms'];

  const Toggle = ({ value, onChange }) => (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 26, borderRadius: 13,
      background: value ? PRI : CARD2,
      border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 10, background: value ? PRI_FG : MUTED,
        position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left 0.2s',
      }} />
    </button>
  );

  const SectionTitle = ({ label, sub }) => (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{sub}</p>}
    </div>
  );

  const Card = ({ children, style = {} }) => (
    <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', marginBottom: 20, ...style }}>
      {children}
    </div>
  );

  const Row = ({ children, border = true }) => (
    <div style={{ padding: '14px 16px', borderBottom: border ? '1px solid ' + BORDER : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      {children}
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: BG, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '72px 16px 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginBottom: 6 }}>
        <button onClick={onBack} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Ic name="chevL" size={16} color={MUTED} />
        </button>
        <div>
          <p style={{ fontSize: 11, color: MUTED, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Settings</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT, letterSpacing: -0.4 }}>Settings</h1>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 100px' }}>

        {/* ── Week Start ── */}
        <SectionTitle label="Week Start" sub="Choose when your week begins for weekly statistics" />
        <Card>
          {[{ val: 'sunday', label: 'Sunday', sub: 'Week starts on Sunday' }, { val: 'monday', label: 'Monday', sub: 'Week starts on Monday' }].map((opt, i, arr) => (
            <Row key={opt.val} border={i < arr.length - 1}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, border: '2px solid ' + (weekStart === opt.val ? PRI : MUTED2), background: weekStart === opt.val ? PRI : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} onClick={() => setWeekStart(opt.val)}>
                  {weekStart === opt.val && <div style={{ width: 8, height: 8, borderRadius: 4, background: PRI_FG }} />}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{opt.label}</p>
                  <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{opt.sub}</p>
                </div>
              </div>
            </Row>
          ))}
        </Card>

        {/* ── Workout Goals ── */}
        <SectionTitle label="Workout Goals" sub="Used for progress tracking on Home and in History" />
        <Card>
          <Row>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Monthly workout target</p>
              <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Sessions per month goal</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setMonthlyGoal(Math.max(1, monthlyGoal - 1))} style={{ background: CARD2, border: '1px solid ' + BORDER, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 16, color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: 16, fontWeight: 800, color: TEXT, minWidth: 28, textAlign: 'center' }}>{monthlyGoal}</span>
              <button onClick={() => setMonthlyGoal(monthlyGoal + 1)} style={{ background: CARD2, border: '1px solid ' + BORDER, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 16, color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </Row>
        </Card>

        {/* ── Google Calendar Sync ── */}
        <SectionTitle label="Google Calendar Sync" sub="Choose which calendar receives your completed workout events" />
        <Card>
          <div style={{ padding: '6px 0' }}>
            {calendars.map((cal, i) => (
              <Row key={cal.id} border={i < calendars.length - 1}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }} onClick={() => setSelectedCal(cal.id)}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: cal.color, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: selectedCal === cal.id ? 700 : 500, color: selectedCal === cal.id ? TEXT : MUTED }}>{cal.label}</p>
                    {cal.sub && <p style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{cal.sub}</p>}
                  </div>
                </div>
                {selectedCal === cal.id && <Ic name="check" size={16} color={PRI} sw={2.5} />}
              </Row>
            ))}
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderTop: '1px solid ' + BORDER }}>
            <button style={{ flex: 1, background: CARD2, border: '1px solid ' + BORDER, borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 600, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Ic name="timer" size={13} color={MUTED} /> Sync Past Workouts
            </button>
            <button style={{ flex: 1, background: CARD2, border: '1px solid ' + BORDER + '80', borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 600, color: RED + 'CC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Ic name="x" size={13} color={RED + 'CC'} sw={2} /> Disconnect
            </button>
          </div>
        </Card>

        {/* ── Workout Tracking ── */}
        <SectionTitle label="Workout Tracking" sub="Customize how workout tracking behaves" />
        <Card>
          <Row>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Rest timer on manual completion</p>
              <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Start rest timer when manually checking off a set</p>
            </div>
            <Toggle value={restTimerAuto} onChange={setRestTimerAuto} />
          </Row>
          <Row>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Weight unit</p>
              <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Used when entering set weights during tracking</p>
            </div>
            <div style={{ display: 'flex', background: CARD2, border: '1px solid ' + BORDER, borderRadius: 10, overflow: 'hidden' }}>
              {['lbs', 'kg'].map(u => (
                <button key={u} onClick={() => setWeightUnit(u)} style={{ padding: '6px 14px', background: weightUnit === u ? PRI : 'transparent', color: weightUnit === u ? PRI_FG : MUTED, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>{u}</button>
              ))}
            </div>
          </Row>
          <Row border={false}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Show unit conversion</p>
              <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Show the equivalent weight in the other unit below each input (lbs ↔ kg)</p>
            </div>
            <Toggle value={showConversion} onChange={setShowConversion} />
          </Row>
        </Card>

        {/* ── Fit Bot ── */}
        <SectionTitle label="Fit Bot" sub="Default preferences for AI program generation" />
        <Card>
          <Row border={false}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Default training focus</p>
              <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Pre-selects this when opening Fit Bot</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: PRI, fontWeight: 700, textTransform: 'capitalize' }}>{fitBotDefault}</span>
              <Ic name="chevR" size={14} color={MUTED} />
            </div>
          </Row>
        </Card>

        {/* ── Muscle Groups ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Muscle Groups</p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Customize which muscle groups appear in your exercise library</p>
          </div>
          <button style={{ background: 'none', border: 'none', color: MUTED, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Ic name="timer" size={13} color={MUTED} /> Reset
          </button>
        </div>
        <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + BORDER, display: 'flex', gap: 8 }}>
            <input type="text" placeholder="Add new muscle group…" style={{ flex: 1, background: BG, border: '1px solid ' + BORDER, borderRadius: 9, padding: '8px 12px', color: TEXT, fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif' }} />
            <button style={{ background: PRI, border: 'none', borderRadius: 9, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Ic name="plus" size={15} color={PRI_FG} sw={2.2} />
            </button>
          </div>
          {muscles.map((m, i) => (
            <div key={m} style={{ padding: '13px 16px', borderBottom: i < muscles.length - 1 ? '1px solid ' + BORDER : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, flex: 1 }}>{m} <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>(default)</span></p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: MUTED, fontSize: 15 }}>∧</button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: MUTED, fontSize: 15 }}>∨</button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><Ic name="x" size={14} color={MUTED2} sw={1.8} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Workout Template History ── */}
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ic name="link2" size={16} color={PRI} sw={2} />
              <p style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Workout Template History</p>
            </div>
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 14 }}>Link your existing scheduled and completed workouts to their source templates to track completion history.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Sync Template Connections</p>
                <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Match workouts to templates by name to enable completion tracking</p>
              </div>
              <button style={{ background: PRI, border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: PRI_FG, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                <Ic name="timer" size={13} color={PRI_FG} /> Sync Now
              </button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
