import React, { useState, useEffect } from 'react';

// --- SESSION ID LOGIC ---
const getSessionId = () => {
  let id = localStorage.getItem('eurovision_session_2026');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('eurovision_session_2026', id);
  }
  return id;
};

// --- SLIDER COMPONENT ---
const ScoreSlider = ({ label, value, onChange, accentColor }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: '20px', fontWeight: 900, color: accentColor, textShadow: `0 0 10px ${accentColor}80` }}>{value}</span>
    </div>
    <input 
      type="range" min="0" max="10" 
      value={value} 
      onChange={(e) => onChange(parseInt(e.target.value))} 
      style={{
        width: '100%',
        height: '6px',
        borderRadius: '10px',
        appearance: 'none',
        cursor: 'pointer',
        background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${value * 10}%, #1e293b ${value * 10}%, #1e293b 100%)`,
        boxShadow: `inset 0 1px 3px rgba(0,0,0,0.5), 0 0 8px ${accentColor}40`
      }}
    />
  </div>
);

// --- LEADERBOARD COMPONENT ---
const Leaderboard = ({ title, history, type, accentColor }) => {
  const sortedHistory = [...history].sort((a, b) => b[type].total - a[type].total).slice(0, 10);
  const eurovisionPoints = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <div className="leaderboard-container" style={{ flex: 1, minWidth: '300px', backgroundColor: '#0b101e', borderRadius: '24px', padding: '24px', border: `1px solid ${accentColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
      <h3 style={{ fontSize: '14px', fontWeight: 900, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: `1px solid ${accentColor}40`, paddingBottom: '12px', marginBottom: '20px', textAlign: 'center' }}>
        {title}
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedHistory.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '12px', textAlign: 'center', fontStyle: 'italic' }}>No data transmitted...</p>
        ) : sortedHistory.map((entry, idx) => (
          <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>{entry.name}</div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{entry[type].s1} | {entry[type].s2}</div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: accentColor }}>
              {eurovisionPoints[idx]} <span style={{ fontSize: '9px', opacity: 0.6 }}>PTS</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN VOTING CARD ---
const VotingCard = ({ country, friendName, jurorCountry, sessionId, onSave }) => {
  const [scores, setScores] = useState({ s1: 5, s2: 5, s3: 5, s4: 5 });
  const [note, setNote] = useState("");

  const juryTotal = scores.s1 + scores.s2;
  const teleTotal = scores.s3 + scores.s4;
  const overallTotal = juryTotal + teleTotal;

  const cyan = '#00e5ff';
  const magenta = '#e000ff';

  const handleSubmit = () => {
    const formBase = "https://docs.google.com/forms/d/e/1FAIpQLScArCBGMU42j0wET_LLQYzZRSwri2pY6VhP2_fRsibNvokpCg/formResponse";
    const params = new URLSearchParams({
      "entry.1962597792": friendName,
      "entry.1172474348": jurorCountry,
      "entry.102789836": country.name,
      "entry.1480044230": scores.s1,
      "entry.1141341574": scores.s2,
      "entry.1530425698": scores.s3,
      "entry.1093132900": scores.s4,
      "entry.756605874": note,
      "entry.2095554769": sessionId,
      "submit": "Submit"
    });

    fetch(`${formBase}?${params.toString()}`, { mode: 'no-cors' });
    onSave({ 
      name: country.name, 
      overall: overallTotal, 
      jury: { total: juryTotal, s1: scores.s1, s2: scores.s2 }, 
      tele: { total: teleTotal, s1: scores.s3, s2: scores.s4 } 
    });
    setScores({ s1: 5, s2: 5, s3: 5, s4: 5 });
    setNote("");
  };

  return (
    <div className="main-card" style={{ flex: '0 0 380px', backgroundColor: '#0b101e', color: 'white', borderRadius: '32px', boxShadow: '0 30px 60px rgba(0,0,0,0.8)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: '100%', height: '240px', position: 'relative', backgroundColor: '#000' }}>
        <img src={`/flags/${country.name}.png`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={country.name} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(to top, #0b101e, transparent)' }}></div>
      </div>

      <div style={{ padding: '0 28px 28px 28px', marginTop: '-30px', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{country.artist}</p>
            <p style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic', margin: '4px 0 0 0' }}>"{country.song}"</p>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '28px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '11px', fontWeight: 900, color: cyan, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px', textAlign: 'center' }}>Jury</h3>
            <ScoreSlider label="Vocals" value={scores.s1} onChange={(v) => setScores({...scores, s1: v})} accentColor={cyan} />
            <ScoreSlider label="Video" value={scores.s2} onChange={(v) => setScores({...scores, s2: v})} accentColor={cyan} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '11px', fontWeight: 900, color: magenta, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px', textAlign: 'center' }}>Televote</h3>
            <ScoreSlider label="Vibe" value={scores.s3} onChange={(v) => setScores({...scores, s3: v})} accentColor={magenta} />
            <ScoreSlider label="Virality" value={scores.s4} onChange={(v) => setScores({...scores, s4: v})} accentColor={magenta} />
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '20px', borderRadius: '20px', marginBottom: '24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.2em', margin: '0 0 4px 0' }}>TOTAL SCORE</p>
          <p style={{ fontSize: '56px', fontWeight: 900, color: 'white', lineHeight: 1, margin: 0 }}>{overallTotal}</p>
        </div>

        <textarea 
          rows="2"
          style={{ width: '100%', padding: '14px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '12px', color: 'white', border: '1px solid #1e293b', fontSize: '13px', marginBottom: '20px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          placeholder="Observation notes..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button onClick={handleSubmit} style={{ width: '100%', background: `linear-gradient(90deg, ${cyan}, ${magenta})`, color: 'white', fontWeight: 900, padding: '20px', borderRadius: '16px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Submit Entry
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [friendName, setFriendName] = useState("");
  const [jurorCountry, setJurorCountry] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votingHistory, setVotingHistory] = useState([]);
  const [currentSessionId] = useState(() => getSessionId());

  useEffect(() => {
    const saved = localStorage.getItem('eurovision_history_2026');
    if (saved) setVotingHistory(JSON.parse(saved));
  }, []);

  const excludedCountries = ['Portugal', 'Georgia', 'Montenegro', 'Estonia', 'San Marino'];

  const allCountries = [
    { name: 'Albania', artist: 'Alis', song: 'Nân', runningOrder: 1 },
    { name: 'Armenia', artist: 'Simón', song: 'Paloma Rumba', runningOrder: 2 },
    { name: 'Australia', artist: 'Delta Goodrem', song: 'Eclipse', runningOrder: 3 },
    { name: 'Austria', artist: 'Cosmó', song: 'Tanzschein', runningOrder: 4 },
    { name: 'Azerbaijan', artist: 'Jiva', song: 'Just Go', runningOrder: 5 },
    { name: 'Belgium', artist: 'Essyla', song: 'Dancing on the Ice', runningOrder: 6 },
    { name: 'Bulgaria', artist: 'Dara', song: 'Bangaranga', runningOrder: null },
    { name: 'Croatia', artist: 'Lelek', song: 'Andromeda', runningOrder: 7 },
    { name: 'Cyprus', artist: 'Antigoni', song: 'Jalla', runningOrder: 8 },
    { name: 'Czechia', artist: 'Daniel Zizka', song: 'Crossroads', runningOrder: 9 },
    { name: 'Denmark', artist: 'Søren Torpegaard Lund', song: 'Før vi går hjem', runningOrder: 10 },
    { name: 'Estonia', artist: 'Vanilla Ninja', song: 'Too Epic to Be True', runningOrder: null },
    { name: 'Finland', artist: 'Linda Lampenius and Pete Parkkonen', song: 'Liekinheitin', runningOrder: 11 },
    { name: 'France', artist: 'Monroe', song: 'Regarde !', runningOrder: 12 },
    { name: 'Georgia', artist: 'Bzikebi', song: 'On Replay', runningOrder: null },
    { name: 'Germany', artist: 'Sarah Engels', song: 'Fire', runningOrder: 13 },
    { name: 'Greece', artist: 'Akylas', song: 'Ferto (Φέρτο)', runningOrder: 14 },
    { name: 'Israel', artist: 'Noam Bettan', song: 'Michelle', runningOrder: 15 },
    { name: 'Italy', artist: 'Sal Da Vinci', song: 'Per sempre sì', runningOrder: 16 },
    { name: 'Latvia', artist: 'Atvara', song: 'Ēnā', runningOrder: 17 },
    { name: 'Lithuania', artist: 'Lion Ceccah', song: 'Sólo quiero más', runningOrder: 18 },
    { name: 'Luxembourg', artist: 'Eva Marija', song: 'Mother Nature', runningOrder: 19 },
    { name: 'Malta', artist: 'Aidan', song: 'Bella', runningOrder: 20 },
    { name: 'Moldova', artist: 'Satoshi', song: 'Viva, Moldova!', runningOrder: 21 },
    { name: 'Montenegro', artist: 'Tamara Živković', song: 'Nova zora (Нова зора)', runningOrder: null },
    { name: 'Norway', artist: 'Jonas Lovv', song: 'Ya Ya Ya', runningOrder: 22 },
    { name: 'Poland', artist: 'Alicja', song: 'Pray', runningOrder: 23 },
    { name: 'Portugal', artist: 'Bandidos do Cante', song: 'Rosa', runningOrder: null },
    { name: 'Romania', artist: 'Alexandra Căpitănescu', song: 'Choke Me', runningOrder: 24 },
    { name: 'San Marino', artist: 'Senhit', song: 'Superstar', runningOrder: null },
    { name: 'Serbia', artist: 'Lavina', song: 'Kraj mene (Крај mene)', runningOrder: 25 },
    { name: 'Sweden', artist: 'Felicia', song: 'My System', runningOrder: null },
    { name: 'Switzerland', artist: 'Veronica Fusaro', song: 'Alice', runningOrder: null },
    { name: 'Ukraine', artist: 'Lelėka', song: 'Ridnym (Рідним)', runningOrder: null },
    { name: 'United Kingdom', artist: 'Look Mum No Computer', song: 'Eins, Zwei, Drei', runningOrder: null }
  ];

  // Restored Filter Logic
  const countries = allCountries
    .filter(c => !excludedCountries.includes(c.name) && c.runningOrder !== null)
    .sort((a, b) => a.runningOrder - b.runningOrder);

  if (!isStarted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#050810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '40px', color: '#fff', fontStyle: 'italic' }}>EV_2026</h1>
        <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#111827', border: '1px solid #1e293b', color: 'white' }} placeholder="Juror Name" value={friendName} onChange={(e) => setFriendName(e.target.value)} />
          <input style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#111827', border: '1px solid #1e293b', color: 'white' }} placeholder="Station Location" value={jurorCountry} onChange={(e) => setJurorCountry(e.target.value)} />
          <button onClick={() => (friendName && jurorCountry) && setIsStarted(true)} style={{ background: '#fff', color: '#000', padding: '16px', borderRadius: '12px', fontWeight: 900, border: 'none', cursor: 'pointer' }}>INITIALIZE</button>
        </div>
      </div>
    );
  }

  if (currentIndex >= countries.length) {
    return <div style={{ color: 'white', textAlign: 'center', paddingTop: '100px' }}><h1>Transmission Complete</h1></div>;
  }

  return (
    <div style={{ backgroundColor: '#050810', minHeight: '100vh', padding: '20px', color: 'white', fontFamily: '"Inter", sans-serif' }}>
      <style>{`
        .dashboard { display: flex; justify-content: center; gap: 40px; max-width: 1200px; margin: 0 auto; }
        @media (max-width: 1100px) { .dashboard { flex-direction: column; align-items: center; } }
      `}</style>

      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.2em' }}>{jurorCountry.toUpperCase()} // {friendName.toUpperCase()}</div>
        <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '5px', color: '#00e5ff' }}>ACT {currentIndex + 1} OF {countries.length}</div>
      </header>

      <div className="dashboard">
        <Leaderboard title="My Jury Points" history={votingHistory} type="jury" accentColor="#00e5ff" />
        <VotingCard country={countries[currentIndex]} friendName={friendName} jurorCountry={jurorCountry} sessionId={currentSessionId}
          onSave={(data) => {
            const nextHistory = [...votingHistory, data];
            setVotingHistory(nextHistory);
            localStorage.setItem('eurovision_history_2026', JSON.stringify(nextHistory));
            setCurrentIndex(prev => prev + 1);
            window.scrollTo(0,0);
          }} 
        />
        <Leaderboard title="My Televote Points" history={votingHistory} type="tele" accentColor="#e000ff" />
      </div>
    </div>
  );
}