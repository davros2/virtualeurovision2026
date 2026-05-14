import React, { useState, useMemo } from 'react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyNLv_p8avygTVYrNOm6n0xXKzT0l_sNd2os-hxNeyJP-5gBhjd1B96l3ZlbY2pTglsg/exec';
const CYAN = '#00e5ff';
const MAGENTA = '#e000ff';
const EURO_POINTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

export default function Admin() {
    const [liveData, setLiveData] = useState([]);
    const [revealIndex, setRevealIndex] = useState(0);
    const [showTen, setShowTen] = useState(false);
    const [showTwelve, setShowTwelve] = useState(false);
    const [view, setView] = useState('reveal'); // 'reveal' or 'leaderboard'
    const [revealedCountries, setRevealedCountries] = useState(new Set()); // Track which countries have had televote revealed

    const fetchJuryResults = async () => {
        try {
            const res = await fetch(SCRIPT_URL);
            
            if (!res.ok) {
                throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
            }
            
            const raw = await res.json();
            
            if (!Array.isArray(raw)) {
                throw new Error("Invalid response: expected an array");
            }
            
            const grouped = raw.reduce((acc, row) => {
                const juror = row["Juror"];
                if (!juror) return acc;
                if (!acc[juror]) acc[juror] = { name: juror, location: row["Station Location"] || "Unknown", juryScores: [], teleScores: [] };
                const totalJury = parseInt(row["Total Jury"] || 0);
                const totalTele = parseInt(row["Total Tele"] || 0);
                const juryPts = parseInt(row["Jury Pts"] || 0);
                const telePts = parseInt(row["Tele Pts"] || 0);
                const country = row["Song"] || row["Country"]; // Try Song first, fallback to Country
                if (country) {
                    if (juryPts > 0) {
                        acc[juror].juryScores.push({ country: country, score: totalJury, pts: juryPts });
                    }
                    if (telePts > 0) {
                        acc[juror].teleScores.push({ country: country, score: totalTele, pts: telePts });
                    }
                }
                return acc;
            }, {});

            const processed = Object.values(grouped).map(juror => ({
                ...juror,
                juryTop10: [...juror.juryScores].sort((a, b) => b.pts - a.pts).slice(0, 10),
                teleTop10: [...juror.teleScores].sort((a, b) => b.pts - a.pts).slice(0, 10)
            }));

            setLiveData(processed);
        } catch (e) { 
            console.error("Data fetch error:", e);
            alert(`Data fetch failed: ${e.message}`); 
        }
    };

    // Calculate Grand Totals across ALL jurors - only include revealed televote
    const leaderboard = useMemo(() => {
        const totals = {};
        liveData.forEach(juror => {
            juror.juryTop10.forEach((score) => {
                if (!totals[score.country]) totals[score.country] = { jury: 0, tele: 0, revealed: false };
                totals[score.country].jury += score.pts;
            });
            juror.teleTop10.forEach((score) => {
                if (!totals[score.country]) totals[score.country] = { jury: 0, tele: 0, revealed: false };
                if (revealedCountries.has(score.country)) {
                    totals[score.country].tele += score.pts;
                    totals[score.country].revealed = true;
                }
            });
        });
        
        // Sort: first by jury+tele (where tele is revealed), then jury only
        return Object.entries(totals)
            .map(([country, scores]) => [
                country, 
                { ...scores, total: scores.jury + (scores.revealed ? scores.tele : 0) }
            ])
            .sort((a, b) => b[1].total - a[1].total);
    }, [liveData, revealedCountries]);

    const revealNextTelevote = () => {
        // Reveal the country currently in the LAST position (lowest score) that hasn't been revealed yet
        for (let i = leaderboard.length - 1; i >= 0; i--) {
            const [country] = leaderboard[i];
            if (!revealedCountries.has(country)) {
                setRevealedCountries(new Set([...revealedCountries, country]));
                break;
            }
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#050810', color: 'white', padding: '40px', fontFamily: 'sans-serif' }}>
            <style>{`
                @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes slideUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
                .reveal { animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .grid-item { transition: all 0.5s ease; }
                .admin-dock:hover { opacity: 1 !important; }
            `}</style>

            {!liveData.length ? (
                <div style={{ textAlign: 'center', marginTop: '100px' }}>
                    <h1 style={{ letterSpacing: '4px' }}>BROADCAST SYSTEM STANDBY</h1>
                    <button onClick={fetchJuryResults} style={adminStyles.mainBtn}>SYNC LIVE DATA</button>
                </div>
            ) : (
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    
                    {view === 'reveal' ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '200px', height: '120px', margin: '0 auto 30px', position: 'relative', borderRadius: '10px', overflow: 'hidden' }}>
                                <img src={`/flags/${liveData[revealIndex]?.juryTop10[0]?.country}.png`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={liveData[revealIndex]?.juryTop10[0]?.country} />
                            </div>
                            <h1 style={{ fontSize: '72px', color: CYAN, margin: 0 }}>{liveData[revealIndex]?.name}</h1>
                            <p style={{ letterSpacing: '8px', color: '#64748b', marginBottom: '40px' }}>{liveData[revealIndex]?.location.toUpperCase()}</p>
                            
                            <div style={adminStyles.pointGrid}>
                                {liveData[revealIndex]?.juryTop10.slice(2).reverse().map((s, i) => (
                                    <div key={s.country} style={adminStyles.pointRow}>
                                        <span style={{ color: CYAN, marginRight: '15px' }}>{s.pts}</span> {s.country.toUpperCase()}
                                    </div>
                                ))}
                            </div>

                            {showTen && (
                                <div className="reveal" style={adminStyles.tenBox}>
                                    <span style={{ fontSize: '14px', display: 'block', opacity: 0.8 }}>10 POINTS</span>
                                    {liveData[revealIndex]?.juryTop10[1].country.toUpperCase()}
                                </div>
                            )}
                            {showTwelve && (
                                <div className="reveal" style={adminStyles.twelveBox}>
                                    <span style={{ fontSize: '18px', display: 'block', opacity: 0.8 }}>12 POINTS</span>
                                    {liveData[revealIndex]?.juryTop10[0].country.toUpperCase()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h1 style={{ textAlign: 'center', flex: 1, color: MAGENTA, letterSpacing: '4px', margin: 0 }}>LEADERBOARD</h1>
                                <button onClick={revealNextTelevote} style={{ ...adminStyles.mainBtn, background: MAGENTA, padding: '15px 30px', fontSize: '14px' }}>
                                    REVEAL TELEVOTE
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '30px' }}>
                                {leaderboard.map(([country, scores], idx) => (
                                    <div key={country} style={{ ...adminStyles.leaderboardRow, transition: 'all 0.5s ease', opacity: scores.revealed ? 1 : 0.7 }}>
                                        <span>{idx + 1}. {country}</span>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            {scores.revealed && <span style={{ color: MAGENTA, fontSize: '12px' }}>+{scores.tele} TELE</span>}
                                            <span style={{ color: CYAN }}>{scores.total} PTS</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Hidden Control Panel (Doesn't show on TV if you keep mouse off it) */}
            <div className="admin-dock" style={adminStyles.dock}>
                <button onClick={() => { setView('reveal'); setRevealedCountries(new Set()); }}>Reveal View</button>
                <button onClick={() => setView('leaderboard')}>Leaderboard View</button>
                <div style={{ width: '2px', background: '#334155', margin: '0 10px' }} />
                <button onClick={() => setShowTen(true)}>Show 10</button>
                <button onClick={() => setShowTwelve(true)}>Show 12</button>
                <button onClick={() => { 
                    if(revealIndex < liveData.length - 1) {
                        setRevealIndex(prev => prev + 1); 
                        setShowTen(false); 
                        setShowTwelve(false); 
                    }
                }}>Next Juror</button>
                <button onClick={fetchJuryResults} style={{ background: CYAN, color: 'black' }}>Refresh</button>
            </div>
        </div>
    );
}

const adminStyles = {
    mainBtn: { padding: '20px 40px', background: CYAN, border: 'none', fontWeight: 900, cursor: 'pointer', borderRadius: '10px', marginTop: '20px' },
    pointGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' },
    pointRow: { background: '#111827', padding: '18px', textAlign: 'left', fontWeight: 800, borderLeft: `5px solid ${CYAN}`, fontSize: '18px' },
    tenBox: { background: '#1e293b', padding: '25px', borderRadius: '15px', border: `2px solid ${CYAN}`, fontSize: '32px', fontWeight: 900, marginBottom: '20px' },
    twelveBox: { background: `linear-gradient(45deg, #2d004d, #000)`, padding: '40px', borderRadius: '15px', border: `4px solid ${MAGENTA}`, fontSize: '56px', fontWeight: 900, textShadow: '0 0 20px rgba(224, 0, 255, 0.5)' },
    leaderboardRow: { background: '#0b101e', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderRadius: '8px', border: '1px solid #ffffff10' },
    dock: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '15px', background: 'rgba(0,0,0,0.9)', display: 'flex', gap: '10px', justifyContent: 'center', opacity: 0.1, transition: 'opacity 0.3s' },
};