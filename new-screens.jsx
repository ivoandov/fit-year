// new-screens.jsx — Onboarding, Fit Bot Builder, extended History (PR tab)
// Depends on tokens + helpers exported to window from main script.

const { BG, CARD, CARD2, BORDER, BORDER2, PRI, PRI_FG, TEXT, MUTED, MUTED2, GREEN, RED, Ic, DumbbellSvg } = window;

// ─── FIT BOT ICON ────────────────────────────────────────────────────────────
function FitBotIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect x="16" y="10" width="32" height="24" rx="6" fill={PRI} />
      <rect x="22" y="18" width="7" height="7" rx="2" fill={PRI_FG} />
      <rect x="35" y="18" width="7" height="7" rx="2" fill={PRI_FG} />
      <path d="M25 30h14" stroke={PRI_FG} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="10" x2="32" y2="4" stroke={PRI} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="3" r="2.5" fill={PRI} />
      <rect x="20" y="36" width="24" height="16" rx="5" fill={CARD2} stroke={PRI} strokeWidth="1.5" />
      <path d="M20 42 Q10 38 8 44 Q8 50 14 50 Q18 50 20 46" fill={CARD2} stroke={PRI} strokeWidth="1.5" />
      <path d="M44 42 Q54 38 56 44 Q56 50 50 50 Q46 50 44 46" fill={CARD2} stroke={PRI} strokeWidth="1.5" />
      <circle cx="32" cy="44" r="3" fill={PRI} />
    </svg>
  );
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
function OnboardingScreen({ onComplete, onSkip, onOpenAIBuilder }) {
  const [step, setStep] = React.useState(0);
  const [daysPerWeek, setDaysPerWeek] = React.useState(null);
  const [programLength, setProgramLength] = React.useState(null);

  const dayOptions = [2, 3, 4, 5, 6];
  const lengthOptions = [
    { val: 30, label: '30', sub: 'days' },
    { val: 60, label: '60', sub: 'days' },
    { val: 90, label: '90', sub: 'days' },
    { val: 120, label: '120', sub: 'days' },
  ];

  const finishGoals = () => onComplete({ daysPerWeek, programLength });
  const handleSelectDays = (d) => { setDaysPerWeek(d); setTimeout(() => setStep(1), 200); };
  const handleSelectLength = (v) => { setProgramLength(v); setTimeout(() => setStep(2), 200); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: BG }}>
      <div style={{ padding: '72px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 4, borderRadius: 2, width: i === step ? 24 : 8, background: i <= step ? PRI : BORDER2, transition: 'all 0.3s' }} />
          ))}
        </div>
        <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Skip for now</span>
          <Ic name="chevR" size={13} color={MUTED} />
        </button>
      </div>

      {step === 0 && (
        <div style={{ flex: 1, padding: '28px 20px 0' }}>
          <p style={{ fontSize: 11, color: PRI, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Step 1 of 3</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: -0.6, marginBottom: 8, lineHeight: 1.15 }}>How often do you want to train?</h1>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 28, lineHeight: 1.5 }}>We'll track this as your weekly consistency goal.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {dayOptions.map(d => {
              const isSel = daysPerWeek === d;
              return (
                <button key={d} onClick={() => handleSelectDays(d)} style={{ background: isSel ? PRI + '25' : CARD, border: '2px solid ' + (isSel ? PRI : BORDER), borderRadius: 16, padding: '18px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                  <p style={{ fontSize: 30, fontWeight: 900, color: isSel ? PRI : TEXT }}>{d}</p>
                  <p style={{ fontSize: 10, color: isSel ? PRI : MUTED, fontWeight: 600, marginTop: 2 }}>days/week</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ flex: 1, padding: '28px 20px 0' }}>
          <p style={{ fontSize: 11, color: PRI, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Step 2 of 3</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: -0.6, marginBottom: 8, lineHeight: 1.15 }}>How long is your next program?</h1>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 28, lineHeight: 1.5 }}>Sets your goal window — adjustable anytime in Settings.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {lengthOptions.map(l => {
              const isSel = programLength === l.val;
              return (
                <button key={l.val} onClick={() => handleSelectLength(l.val)} style={{ background: isSel ? PRI + '25' : CARD, border: '2px solid ' + (isSel ? PRI : BORDER), borderRadius: 16, padding: '26px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                  <p style={{ fontSize: 36, fontWeight: 900, color: isSel ? PRI : TEXT, letterSpacing: -1 }}>{l.label}</p>
                  <p style={{ fontSize: 12, color: isSel ? PRI : MUTED, fontWeight: 600, marginTop: 4 }}>{l.sub}</p>
                </button>
              );
            })}
          </div>
          <button onClick={() => setStep(0)} style={{ width: '100%', background: 'none', border: 'none', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 20, padding: '10px' }}>← Back</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ flex: 1, padding: '28px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: 11, color: PRI, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Step 3 of 3</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: -0.6, marginBottom: 8, lineHeight: 1.15 }}>Want to build a personalized program with AI?</h1>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 24, lineHeight: 1.5 }}>Tell Fit Bot your goals and it'll generate a personalized {programLength}-day routine — automatically scheduled in your calendar.</p>
          <div style={{ background: 'linear-gradient(135deg, #1a2200 0%, #0d1500 100%)', border: '1px solid ' + PRI + '30', borderRadius: 20, padding: '22px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, background: PRI + '15', filter: 'blur(28px)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: PRI + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FitBotIcon size={36} /></div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 900, color: PRI }}>Fit Bot</p>
                  <p style={{ fontSize: 11, color: MUTED }}>Your AI training coach</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: TEXT + 'CC', lineHeight: 1.6 }}>Pick a training focus, answer a few quick questions, and Fit Bot builds your complete {programLength}-day program with progressive overload built in.</p>
            </div>
          </div>
          <button onClick={() => { finishGoals(); onOpenAIBuilder(); }} style={{ width: '100%', background: PRI, color: PRI_FG, border: 'none', borderRadius: 14, padding: '15px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 20px ' + PRI + '40' }}>
            Build My Program with Fit Bot
          </button>
          <button onClick={finishGoals} style={{ width: '100%', background: 'none', border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 0', fontSize: 14, fontWeight: 600, color: MUTED, cursor: 'pointer' }}>I'll set up my routine manually</button>
          <button onClick={() => setStep(1)} style={{ width: '100%', background: 'none', border: 'none', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10, padding: '8px' }}>← Back</button>
        </div>
      )}
    </div>
  );
}

// ─── FIT BOT BUILDER ─────────────────────────────────────────────────────────
// Steps: 0=focus(multi), 1=equipment(multi), 2=experience(auto), 3=extras(multi),
//        4=imbalance-detail(cond), 5=injury-detail(cond), 6=summary, 7=generating, 8=preview
function AIBuilderScreen({ onBack, onDone }) {
  const [step, setStep] = React.useState(0);
  const [focus, setFocus] = React.useState([]);
  const [equipment, setEquipment] = React.useState([]);
  const [experience, setExperience] = React.useState(null);
  const [extras, setExtras] = React.useState([]);
  const [imbalanceMuscles, setImbalanceMuscles] = React.useState([]);
  const [imbalanceNotes, setImbalanceNotes] = React.useState('');
  const [injuryDetails, setInjuryDetails] = React.useState([]);
  const [injuryNotes, setInjuryNotes] = React.useState('');
  const [genProgress, setGenProgress] = React.useState(0);
  const [editingStep, setEditingStep] = React.useState(null); // for edit-from-summary

  const needsImbalance = extras.includes('Fix muscle imbalances');
  const needsInjury = extras.includes('Train around injury');

  // Compute step sequence dynamically
  const getNextStep = (from) => {
    if (from === 3) return needsImbalance ? 4 : needsInjury ? 5 : 6;
    if (from === 4) return needsInjury ? 5 : 6;
    return from + 1;
  };
  const getPrevStep = (from) => {
    if (from === 5 && !needsImbalance) return 3;
    if (from === 6 && !needsInjury && !needsImbalance) return 3;
    if (from === 6 && needsInjury) return 5;
    if (from === 6 && needsImbalance && !needsInjury) return 4;
    return from - 1;
  };

  const advance = () => editingStep !== null ? (setStep(6), setEditingStep(null)) : setStep(getNextStep(step));
  const goBack  = () => step === 0 ? onBack() : setStep(getPrevStep(step));

  const toggleArr = (arr, setArr, val) => setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const startGenerate = () => {
    setStep(7);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 13 + 5;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setStep(8), 500); }
      setGenProgress(Math.min(100, p));
    }, 300);
  };

  const genLabel = genProgress < 20 ? 'Understanding your goals…' : genProgress < 40 ? 'Selecting the best split…' : genProgress < 60 ? 'Choosing exercises…' : genProgress < 80 ? 'Adding progressive overload…' : 'Finalizing your program…';

  const focusOptions = [
    { val: 'strength',     label: 'Strength',    icon: '🏋️' },
    { val: 'hypertrophy',  label: 'Hypertrophy', icon: '💪' },
    { val: 'calisthenics', label: 'Calisthenics',icon: '🤸' },
    { val: 'flexibility',  label: 'Flexibility', icon: '🧘' },
    { val: 'mixed',        label: 'Mixed',        icon: '⚡' },
    { val: 'athletic',     label: 'Athletic',     icon: '🏃' },
  ];

  const equipmentOptions = [
    { val: 'full_gym',     label: 'Full Gym',         icon: '🏢', desc: 'Barbells, machines, cables' },
    { val: 'home_weights', label: 'Home + Weights',    icon: '🏠', desc: 'Dumbbells, kettlebells' },
    { val: 'bodyweight',   label: 'Bodyweight',        icon: '🤸', desc: 'No equipment needed' },
    { val: 'bands',        label: 'Resistance Bands',  icon: '🪢', desc: 'Bands + bodyweight' },
  ];

  const experienceOptions = [
    { val: 'beginner',     label: 'Beginner',     sub: 'Less than 1 year training' },
    { val: 'intermediate', label: 'Intermediate', sub: '1–3 years consistent training' },
    { val: 'advanced',     label: 'Advanced',     sub: '3+ years, solid technique' },
    { val: 'athletic',     label: 'Competitive',  sub: 'Sport athlete or competitor' },
  ];

  const extraOptions = [
    'Build bigger arms', 'Improve posture', 'Lose body fat', 'Increase endurance',
    'Fix muscle imbalances', 'Train around injury', 'Add explosive power', 'Improve core strength',
  ];

  const muscleOptions = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes', 'Core', 'Calves'];
  const injuryOptions = ['Lower back', 'Knee', 'Shoulder', 'Elbow', 'Wrist', 'Hip', 'Ankle', 'Neck'];

  const preview = [
    { day: 'Mon', name: 'Upper Strength A', exs: ['Bench Press', 'Overhead Press', 'Weighted Pull-ups'], rest: false },
    { day: 'Tue', name: 'Lower Strength A', exs: ['Back Squat', 'Romanian Deadlift', 'Leg Press'], rest: false },
    { day: 'Wed', name: 'Rest / Recovery',  exs: [], rest: true },
    { day: 'Thu', name: 'Upper Strength B', exs: ['Incline Press', 'Cable Row', 'Dips'], rest: false },
    { day: 'Fri', name: 'Lower Strength B', exs: ['Deadlift', 'Bulgarian Split Squat', 'Leg Curl'], rest: false },
    { day: 'Sat', name: 'Accessory + Core', exs: ['Face Pulls', 'Lateral Raises', 'Ab Circuit'], rest: false },
    { day: 'Sun', name: 'Rest',             exs: [], rest: true },
  ];

  /* DEV: Fit Bot AI generation
     POST /api/ai/generate-program {
       focus[], equipment[], experience,
       extras[], imbalanceMuscles[], injuryDetails[]
     }
     Use window.claude.complete() (claude-haiku-4-5) or server-side Claude.
     Prompt includes all user inputs. Returns JSON program.
     On "Add to My Routines" → POST /api/routine-instances. */

  const totalMainSteps = 4 + (needsImbalance ? 1 : 0) + (needsInjury ? 1 : 0);
  const currentStepNum = step < 7 ? step + 1 : totalMainSteps;

  const MultiChip = ({ label, selected, onClick }) => (
    <button onClick={onClick} style={{
      background: selected ? PRI + '18' : CARD, border: '2px solid ' + (selected ? PRI : BORDER),
      borderRadius: 20, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
      color: selected ? PRI : MUTED, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {selected && <Ic name="check" size={12} color={PRI} sw={2.5} />}
      {label}
    </button>
  );

  const SectionHeader = ({ title, sub, step: s }) => (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT, letterSpacing: -0.4 }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: MUTED, marginTop: 5, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );

  const ContinueBtn = ({ disabled, label = 'Continue', onClick }) => (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 40px', background: 'linear-gradient(transparent, ' + BG + ' 40%)' }}>
      <button onClick={onClick || advance} disabled={disabled} style={{
        width: '100%', background: disabled ? CARD : PRI, color: disabled ? MUTED : PRI_FG,
        border: 'none', borderRadius: 14, padding: '15px 0', fontSize: 15, fontWeight: 800,
        cursor: disabled ? 'default' : 'pointer', transition: 'all 0.2s',
        boxShadow: disabled ? 'none' : '0 4px 20px ' + PRI + '40',
      }}>{label}</button>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: BG, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '72px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={goBack} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Ic name="chevL" size={16} color={MUTED} />
        </button>
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FitBotIcon size={22} />
          <p style={{ fontSize: 14, fontWeight: 900, color: PRI }}>Fit Bot</p>
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Progress */}
      {step < 7 && (
        <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
          <div style={{ height: 3, background: BORDER2, borderRadius: 2 }}>
            <div style={{ height: '100%', width: (Math.min(step, totalMainSteps) / totalMainSteps * 100) + '%', background: PRI, borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <p style={{ fontSize: 10, color: MUTED, marginTop: 5 }}>Step {currentStepNum} of {totalMainSteps}</p>
        </div>
      )}

      {/* Step 0 — Focus (multi-select) */}
      {step === 0 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px', position: 'relative' }}>
          <SectionHeader title="What's your training focus?" sub="Select all that apply — Fit Bot will blend them into your program." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {focusOptions.map(f => {
              const isSel = focus.includes(f.val);
              return (
                <button key={f.val} onClick={() => toggleArr(focus, setFocus, f.val)} style={{
                  background: isSel ? PRI + '15' : CARD, border: '2px solid ' + (isSel ? PRI : BORDER),
                  borderRadius: 16, padding: '16px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', position: 'relative',
                }}>
                  {isSel && <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, background: PRI, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="check" size={10} color={PRI_FG} sw={2.5} /></div>}
                  <p style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: isSel ? PRI : TEXT }}>{f.label}</p>
                </button>
              );
            })}
          </div>
          <ContinueBtn disabled={focus.length === 0} />
        </div>
      )}

      {/* Step 1 — Equipment (multi-select) */}
      {step === 1 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px', position: 'relative' }}>
          <SectionHeader title="What equipment do you have?" sub="Select all that apply — Fit Bot will only program what's available to you." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {equipmentOptions.map(e => {
              const isSel = equipment.includes(e.val);
              return (
                <button key={e.val} onClick={() => toggleArr(equipment, setEquipment, e.val)} style={{
                  background: isSel ? PRI + '15' : CARD, border: '2px solid ' + (isSel ? PRI : BORDER),
                  borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 22 }}>{e.icon}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isSel ? PRI : TEXT }}>{e.label}</p>
                    <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{e.desc}</p>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: isSel ? PRI : 'transparent', border: '2px solid ' + (isSel ? PRI : MUTED2), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSel && <Ic name="check" size={11} color={PRI_FG} sw={2.5} />}
                  </div>
                </button>
              );
            })}
          </div>
          <ContinueBtn disabled={equipment.length === 0} />
        </div>
      )}

      {/* Step 2 — Experience (single, auto-advance) */}
      {step === 2 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
          <SectionHeader title="What's your experience level?" sub="Affects exercise selection, volume, and intensity." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {experienceOptions.map(e => {
              const isSel = experience === e.val;
              return (
                <button key={e.val} onClick={() => { setExperience(e.val); setTimeout(() => setStep(3), 200); }} style={{
                  background: isSel ? PRI + '15' : CARD, border: '2px solid ' + (isSel ? PRI : BORDER),
                  borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s',
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isSel ? PRI : TEXT }}>{e.label}</p>
                    <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{e.sub}</p>
                  </div>
                  {isSel && <Ic name="check" size={16} color={PRI} sw={2.5} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 — Extras (multi-select + manual entry) */}
      {step === 3 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px', position: 'relative' }}>
          <SectionHeader title="Anything else to focus on?" sub="Select all that apply, or type your own. Fit Bot will weave these into your program." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {extraOptions.map(e => <MultiChip key={e} label={e} selected={extras.includes(e)} onClick={() => toggleArr(extras, setExtras, e)} />)}
          </div>
          {/* Custom entry */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              id="extra-custom-input"
              type="text"
              placeholder="Add your own goal…"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const val = e.target.value.trim();
                  if (!extras.includes(val)) setExtras(prev => [...prev, val]);
                  e.target.value = '';
                }
              }}
              style={{ flex: 1, background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: '10px 14px', color: TEXT, fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
            />
            <button onClick={() => {
              const input = document.getElementById('extra-custom-input');
              const val = input.value.trim();
              if (val && !extras.includes(val)) { setExtras(prev => [...prev, val]); input.value = ''; }
            }} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: '10px 14px', color: PRI, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Add
            </button>
          </div>
          {/* Show custom-added extras not in the preset list */}
          {extras.filter(e => !extraOptions.includes(e)).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {extras.filter(e => !extraOptions.includes(e)).map(e => (
                <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 6, background: PRI + '15', border: '2px solid ' + PRI, borderRadius: 20, padding: '6px 10px 6px 14px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: PRI }}>{e}</span>
                  <button onClick={() => setExtras(prev => prev.filter(x => x !== e))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                    <Ic name="x" size={12} color={PRI} sw={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <ContinueBtn label={extras.length > 0 ? 'Continue' : 'Skip'} disabled={false} />
        </div>
      )}

      {/* Step 4 — Muscle imbalance detail (conditional) */}
      {step === 4 && needsImbalance && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px', position: 'relative' }}>
          <SectionHeader title="Which muscles need more attention?" sub="Fit Bot will add targeted corrective work for these areas." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {muscleOptions.map(m => <MultiChip key={m} label={m} selected={imbalanceMuscles.includes(m)} onClick={() => toggleArr(imbalanceMuscles, setImbalanceMuscles, m)} />)}
          </div>
          <p style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Any additional context? <span style={{ fontWeight: 400 }}>(optional)</span></p>
          <textarea
            value={imbalanceNotes}
            onChange={e => setImbalanceNotes(e.target.value)}
            placeholder="e.g. My left shoulder is noticeably weaker than my right, especially on overhead movements…"
            rows={3}
            style={{ width: '100%', background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
          <ContinueBtn disabled={imbalanceMuscles.length === 0} />
        </div>
      )}

      {/* Step 5 — Injury detail (conditional) */}
      {step === 5 && needsInjury && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px', position: 'relative' }}>
          <SectionHeader title="Which areas are you working around?" sub="Fit Bot will modify or replace high-risk exercises for these areas." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {injuryOptions.map(i => <MultiChip key={i} label={i} selected={injuryDetails.includes(i)} onClick={() => toggleArr(injuryDetails, setInjuryDetails, i)} />)}
          </div>
          <p style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Describe your injury or limitations <span style={{ fontWeight: 400 }}>(optional)</span></p>
          <textarea
            value={injuryNotes}
            onChange={e => setInjuryNotes(e.target.value)}
            placeholder="e.g. Recovering from a partial ACL tear — no deep squats or pivoting movements. Can do leg press and seated exercises fine…"
            rows={3}
            style={{ width: '100%', background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
          <ContinueBtn disabled={injuryDetails.length === 0} />
        </div>
      )}

      {/* Step 6 — Summary */}
      {step === 6 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px' }}>
          <SectionHeader title="Your program summary" sub="Review your inputs before Fit Bot generates your program." />

          {[
            { label: 'Training focus', val: focus.join(', '), editStep: 0 },
            { label: 'Equipment', val: equipment.map(e => equipmentOptions.find(o => o.val === e)?.label).join(', '), editStep: 1 },
            { label: 'Experience', val: experienceOptions.find(o => o.val === experience)?.label, editStep: 2 },
            { label: 'Additional goals', val: extras.length > 0 ? extras.join(', ') : 'None', editStep: 3 },
            needsImbalance && { label: 'Imbalance muscles', val: imbalanceMuscles.join(', ') + (imbalanceNotes ? ' — ' + imbalanceNotes : ''), editStep: 4 },
            needsInjury && { label: 'Training around', val: injuryDetails.join(', ') + (injuryNotes ? ' — ' + injuryNotes : ''), editStep: 5 },
          ].filter(Boolean).map((row, i) => (
            <div key={i} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 14, padding: '13px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.4 }}>{row.val || '—'}</p>
              </div>
              <button onClick={() => { setEditingStep(row.editStep); setStep(row.editStep); }} style={{ background: 'none', border: 'none', color: PRI, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, padding: '2px 0' }}>Edit</button>
            </div>
          ))}

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 40px', background: 'linear-gradient(transparent, ' + BG + ' 40%)' }}>
            <button onClick={startGenerate} style={{ width: '100%', background: PRI, color: PRI_FG, border: 'none', borderRadius: 14, padding: '15px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px ' + PRI + '40' }}>
              Generate My Program
            </button>
          </div>
        </div>
      )}

      {/* Step 7 — Generating */}
      {step === 7 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', gap: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: PRI + '15', border: '1px solid ' + PRI + '40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FitBotIcon size={56} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT, marginBottom: 8 }}>Fit Bot is building your program…</h2>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              Designing your {focus.join(' + ')} plan for a {experience} with {equipment.length} equipment type{equipment.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <div style={{ width: '100%' }}>
            <div style={{ height: 6, background: BORDER2, borderRadius: 3 }}>
              <div style={{ height: '100%', width: Math.round(genProgress) + '%', background: PRI, borderRadius: 3, transition: 'width 0.3s ease', boxShadow: '0 0 12px ' + PRI + '60' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <p style={{ fontSize: 11, color: MUTED }}>{genLabel}</p>
              <p style={{ fontSize: 11, color: PRI, fontWeight: 700 }}>{Math.round(genProgress)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 8 — Preview */}
      {step === 8 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <FitBotIcon size={36} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: TEXT, letterSpacing: -0.3 }}>
                Your {focus.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(' + ')} Program
              </h2>
              <p style={{ fontSize: 11, color: MUTED }}>{experience} level · AI-generated by Fit Bot</p>
            </div>
          </div>

          {extras.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {extras.map(e => (
                <span key={e} style={{ fontSize: 10, fontWeight: 600, color: PRI, background: PRI + '12', border: '1px solid ' + PRI + '30', borderRadius: 20, padding: '3px 9px' }}>{e}</span>
              ))}
            </div>
          )}

          <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid ' + BORDER, display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>Week 1 Preview</p>
              <p style={{ fontSize: 11, color: MUTED }}>Progressive overload each week</p>
            </div>
            {preview.map((d, i) => (
              <div key={i} style={{ padding: '12px 14px', borderBottom: i < preview.length - 1 ? '1px solid ' + BORDER : 'none', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: d.rest ? 0.45 : 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: d.rest ? BORDER2 : PRI + '15', border: '1px solid ' + (d.rest ? BORDER : PRI + '30'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: d.rest ? MUTED : PRI }}>{d.day}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: d.rest ? MUTED : TEXT, marginBottom: d.exs.length ? 3 : 0 }}>{d.name}</p>
                  {d.exs.length > 0 && <p style={{ fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.exs.join(' · ')}</p>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: PRI + '08', border: '1px solid ' + PRI + '25', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <FitBotIcon size={18} />
              <p style={{ fontSize: 12, color: PRI, fontWeight: 700 }}>Fit Bot note</p>
            </div>
            <p style={{ fontSize: 12, color: TEXT + 'CC', lineHeight: 1.5 }}>
              This program applies progressive overload across all weeks. Volume and intensity increase every 1–2 weeks based on your {experience} level.
              {needsImbalance && ' Extra corrective work has been added for ' + imbalanceMuscles.join(', ') + '.'}
              {needsInjury && ' Exercises around your ' + injuryDetails.join(', ') + ' have been modified or replaced.'}
            </p>
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 40px', background: 'linear-gradient(transparent, ' + BG + ' 40%)' }}>
            <button onClick={onDone} style={{ width: '100%', background: PRI, color: PRI_FG, border: 'none', borderRadius: 14, padding: '15px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px ' + PRI + '40' }}>Add to My Routines</button>
            <button onClick={() => setStep(0)} style={{ width: '100%', background: 'none', border: 'none', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 6, padding: '8px' }}>Regenerate with different options</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HISTORY WITH PR TAB ─────────────────────────────────────────────────────
function HistoryScreenFull() {
  const [tab, setTab] = React.useState('history');
  const [expandedWorkout, setExpandedWorkout] = React.useState(null);

  const recentPRs = [
    { exercise: 'Bench Press',       date: 'Today',  weight: '70 kg',   reps: 8,  type: 'weight', prev: '67.5 kg' },
    { exercise: 'Cable Fly',         date: 'Today',  weight: '30 kg',   reps: 20, type: 'volume', prev: '28 kg × 15' },
    { exercise: 'Back Squat',        date: 'Apr 23', weight: '110 kg',  reps: 5,  type: 'weight', prev: '107.5 kg' },
    { exercise: 'Overhead Press',    date: 'Apr 20', weight: '62.5 kg', reps: 6,  type: 'weight', prev: '60 kg' },
    { exercise: 'Weighted Pull-ups', date: 'Apr 18', weight: '+25 kg',  reps: 8,  type: 'volume', prev: '+22.5 kg × 6' },
  ];

  const stats = [
    { label: 'Total Workouts', val: '39', icon: 'clipboard' },
    { label: 'This Week',      val: '1',  icon: 'flame' },
    { label: 'This Month',     val: '7',  icon: 'trend' },
    { label: 'Total Sets',     val: '777',icon: 'barchart' },
  ];

  const goals = [
    { name: 'Pull-ups', done: 0, target: 40,  since: 'Apr 10, 2026', cumul: 87  },
    { name: 'Pushups',  done: 0, target: 200, since: 'Apr 14, 2026', cumul: 220 },
  ];

  const muscles = [
    { name: 'Chest',     sets: 11, target: 20 },
    { name: 'Triceps',   sets: 9,  target: 20 },
    { name: 'Back',      sets: 0,  target: 20 },
    { name: 'Biceps',    sets: 3,  target: 20 },
    { name: 'Shoulders', sets: 10, target: 20 },
    { name: 'Legs',      sets: 0,  target: 20 },
    { name: 'Abs/Core',  sets: 0,  target: 20 },
    { name: 'Cardio',    sets: 0,  target: 20 },
    { name: 'Forearms',  sets: 0,  target: 20 },
  ];

  const recent = [
    { name: 'Chest & Triceps', date: 'Apr 24, 2026', sets: 28, vol: '12,529.1', dur: '44 min' },
    { name: 'Back Shoulders',  date: 'Apr 22, 2026', sets: 22, vol: '9,840.0',  dur: '38 min' },
    { name: 'Push Day A',      date: 'Apr 20, 2026', sets: 19, vol: '11,100.0', dur: '41 min' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: BG }}>
      <div style={{ padding: '78px 14px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <p style={{ fontSize: 11, color: MUTED, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>History</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: -0.5, marginTop: 2 }}>Workout History</h1>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Ic name="more" size={20} color={MUTED} sw={2.5} /></button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 14, background: CARD, borderRadius: 12, padding: 4 }}>
          {[{ id: 'history', label: 'History' }, { id: 'prs', label: '🏆 PRs' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: tab === t.id ? BG : 'transparent', border: tab === t.id ? '1px solid ' + BORDER : '1px solid transparent', borderRadius: 9, padding: '8px 0', fontSize: 13, fontWeight: 700, color: tab === t.id ? TEXT : MUTED, cursor: 'pointer', transition: 'all 0.2s' }}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 100px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 14, padding: '13px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <p style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{s.label}</p>
                  <Ic name={s.icon} size={14} color={MUTED} sw={1.6} />
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: TEXT, letterSpacing: -0.5, lineHeight: 1.1 }}>{s.val}</p>
              </div>
            ))}
          </div>

          <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, padding: '14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>Weekly Goals <span style={{ fontSize: 11, fontWeight: 500, color: MUTED }}>(last 7 days)</span></p>
                  <p style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Track rep targets across multiple sessions</p>
                </div>
              </div>
              <button style={{ background: CARD2, border: '1px solid ' + BORDER, borderRadius: 9, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: PRI, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Ic name="plus" size={11} color={PRI} sw={2.5} /> Add Goal
              </button>
            </div>
            {goals.map((g, i) => {
              const pct = Math.min(100, (g.done / g.target) * 100);
              return (
                <div key={g.name} style={{ marginTop: 14, paddingTop: i > 0 ? 14 : 0, borderTop: i > 0 ? '1px solid ' + BORDER : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{g.name}</p>
                    <p style={{ fontSize: 11, color: MUTED }}>{g.done} / {g.target} this week</p>
                  </div>
                  <div style={{ height: 5, background: BORDER2, borderRadius: 3, marginBottom: 5 }}>
                    <div style={{ height: '100%', width: pct + '%', background: pct > 0 ? PRI : BORDER2, borderRadius: 3 }} />
                  </div>
                  <p style={{ fontSize: 10, color: MUTED }}>{g.cumul} total since {g.since}</p>
                </div>
              );
            })}
          </div>

          <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, padding: '14px', marginBottom: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 2 }}>Weekly Sets by Muscle Group <span style={{ fontSize: 11, fontWeight: 500, color: MUTED }}>(last 7 days)</span></p>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>Track your training volume across different muscle groups</p>
            {muscles.map((m, i) => {
              const pct = Math.min(100, (m.sets / m.target) * 100);
              return (
                <div key={m.name} style={{ marginBottom: i < muscles.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <p style={{ fontSize: 12, fontWeight: m.sets > 0 ? 700 : 500, color: m.sets > 0 ? TEXT : MUTED }}>{m.name}</p>
                    <p style={{ fontSize: 11, color: m.sets > 0 ? MUTED : MUTED2 }}>{m.sets}/{m.target}</p>
                  </div>
                  <div style={{ height: 5, background: BORDER2, borderRadius: 3 }}>
                    <div style={{ height: '100%', width: pct + '%', background: pct >= 100 ? GREEN : pct > 0 ? PRI : 'transparent', borderRadius: 3, boxShadow: pct > 0 ? '0 0 8px ' + PRI + '50' : 'none' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: 13, fontWeight: 800, color: TEXT, marginBottom: 12 }}>Recent Workouts</p>
          {recent.map((w, i) => {
            const isOpen = expandedWorkout === i;
            return (
              <div key={i} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
                <button onClick={() => setExpandedWorkout(isOpen ? null : i)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{w.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: MUTED }}>{w.date}</span>
                      <span style={{ fontSize: 11, color: MUTED }}>{w.sets} sets</span>
                      <span style={{ fontSize: 11, color: MUTED }}>{w.dur}</span>
                      <span style={{ fontSize: 11, color: MUTED }}>↑ {w.vol} lbs</span>
                    </div>
                  </div>
                  <Ic name={isOpen ? 'chevL' : 'chevR'} size={16} color={MUTED} />
                </button>
                {isOpen && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid ' + BORDER }}>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button style={{ flex: 1, background: PRI + '15', border: '1px solid ' + PRI + '30', borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 700, color: PRI, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <Ic name="play" size={11} color={PRI} fill={PRI} sw={0} /> Repeat
                      </button>
                      <button style={{ flex: 1, background: CARD2, border: '1px solid ' + BORDER, borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 600, color: MUTED, cursor: 'pointer' }}>View Details</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'prs' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 100px' }}>
          <p style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>Your 5 most recent personal records — weight PRs beat your heaviest set ever; volume PRs beat your highest weight × reps.</p>
          {recentPRs.map((pr, i) => (
            <div key={i} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: (pr.type === 'weight' ? PRI : GREEN) + '15', border: '1px solid ' + (pr.type === 'weight' ? PRI : GREEN) + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                {pr.type === 'weight' ? '🏆' : '⭐'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{pr.exercise}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, color: pr.type === 'weight' ? PRI : GREEN, background: (pr.type === 'weight' ? PRI : GREEN) + '15', borderRadius: 6, padding: '2px 7px', flexShrink: 0, marginLeft: 8 }}>
                    {pr.type === 'weight' ? 'WEIGHT' : 'VOLUME'}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: pr.type === 'weight' ? PRI : GREEN, marginTop: 3 }}>{pr.weight} × {pr.reps} reps</p>
                <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{pr.date} · prev: {pr.prev}</p>
              </div>
            </div>
          ))}
          <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px', textAlign: 'center', marginTop: 8 }}>
            <p style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Showing 5 most recent PRs</p>
            <p style={{ fontSize: 11, color: MUTED2, marginTop: 4 }}>PRs are detected automatically when you beat your best set during a workout</p>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { OnboardingScreen, AIBuilderScreen, HistoryScreenFull, FitBotIcon });
