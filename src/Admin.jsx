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
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [view, setView] = useState('reveal'); // 'reveal' or 'leaderboard'
    const [revealedCountries, setRevealedCountries] = useState(new Set()); // Track which countries have had televote revealed
    const [revealingTelevote, setRevealingTelevote] = useState(null); // Country currently revealing televote (flag + number animation)
    const [televoteCounter, setTelevoteCounter] = useState(0); // Animated counter during reveal

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

    // Calculate cumulative jury totals
    const jurorLeaderboard = useMemo(() => {
        const totals = {};
        liveData.forEach((juror, idx) => {
            if (idx > revealIndex) return; // Include juries up to and including current
            juror.juryTop10.forEach((score) => {
                totals[score.country] = (totals[score.country] || 0) + score.pts;
            });
        });
        return Object.entries(totals)
            .map(([country, jury]) => [country, { jury, tele: 0 }])
            .sort((a, b) => b[1].jury - a[1].jury);
    }, [liveData, revealIndex]);

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
                totals[score.country].tele += score.pts;
            });
        });
        
        // Mark any country in revealedCountries as revealed
        Object.keys(totals).forEach(country => {
            if (revealedCountries.has(country)) {
                totals[country].revealed = true;
            }
        });
        
        // Sort: first by jury+tele (where tele is revealed), then jury only
        return Object.entries(totals)
            .map(([country, scores]) => [
                country, 
                { ...scores, total: scores.jury + (scores.revealed ? scores.tele : 0) }
            ])
            .sort((a, b) => b[1].total - a[1].total);
    }, [liveData, revealedCountries]);

    const dockButtonStyle = {
        padding: '12px 20px',
        background: `linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 150, 200, 0.1) 100%)`,
        border: `1px solid ${CYAN}50`,
        color: 'white',
        fontWeight: 800,
        cursor: 'pointer',
        borderRadius: '10px',
        fontSize: '12px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)'
    };

    const revealNextTelevote = () => {
        // Reveal the country currently in the LAST position (lowest score) that hasn't been revealed yet
        for (let i = leaderboard.length - 1; i >= 0; i--) {
            const [country, scores] = leaderboard[i];
            if (!revealedCountries.has(country)) {
                const finalTelevote = scores.tele;
                
                // Start animation sequence
                setRevealingTelevote(country);
                setTelevoteCounter(0);
                
                // Wait 1 second, then animate counter
                setTimeout(() => {
                    const startTime = Date.now();
                    const duration = 1000; // 1 second animation
                    
                    const animate = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        setTelevoteCounter(Math.floor(progress * finalTelevote));
                        
                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    };
                    
                    animate();
                }, 1000);
                
                // After 2.5 seconds, reveal the televote in leaderboard
                setTimeout(() => {
                    setRevealedCountries(new Set([...revealedCountries, country]));
                }, 2500);
                
                // After 3.5 seconds, fade away animation
                setTimeout(() => {
                    setRevealingTelevote(null);
                    setTelevoteCounter(0);
                }, 3500);
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
                    <h1 style={{ letterSpacing: '4px', fontSize: '48px', fontWeight: 900, background: `linear-gradient(135deg, ${CYAN} 0%, ${MAGENTA} 100%)`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '40px' }}>BROADCAST SYSTEM STANDBY</h1>
                    <button onClick={fetchJuryResults} style={{ ...adminStyles.mainBtn, background: `linear-gradient(135deg, ${CYAN} 0%, #00b8e6 100%)`, boxShadow: `0 8px 30px ${CYAN}30`, padding: '18px 50px', fontSize: '16px' }}>SYNC LIVE DATA</button>
                </div>
            ) : (
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    
                    {view === 'reveal' ? (
                        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                            {!showLeaderboard ? (
                                <div style={{ textAlign: 'center' }}>
                                    <h1 style={{ fontSize: '72px', color: CYAN, margin: '0 0 10px 0', fontWeight: 900, textShadow: `0 0 30px ${CYAN}40` }}>{liveData[revealIndex]?.name}</h1>
                                    <p style={{ letterSpacing: '8px', color: '#64748b', marginBottom: '40px', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase' }}>{liveData[revealIndex]?.location.toUpperCase()}</p>
                                    
                                    <div style={adminStyles.pointGrid}>
                                        {liveData[revealIndex]?.juryTop10.slice(2).reverse().map((s, i) => (
                                            <div key={s.country} style={adminStyles.pointRow}>
                                                <img src={`/flags/${s.country}.png`} style={{ width: '30px', height: '20px', marginRight: '15px', objectFit: 'cover' }} alt={s.country} />
                                                <span style={{ color: CYAN, marginRight: '15px' }}>{s.pts}</span> {s.country.toUpperCase()}
                                            </div>
                                        ))}
                                    </div>

                                    {showTen && (
                                        <div className="reveal" style={{...adminStyles.tenBox, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <img src={`/flags/${liveData[revealIndex]?.juryTop10[1].country}.png`} style={{ width: '40px', height: '27px', objectFit: 'cover', marginRight: '15px' }} alt={liveData[revealIndex]?.juryTop10[1].country} />
                                            <div>
                                                <span style={{ fontSize: '14px', display: 'block', opacity: 0.8 }}>10 POINTS</span>
                                                {liveData[revealIndex]?.juryTop10[1].country.toUpperCase()}
                                            </div>
                                        </div>
                                    )}
                                    {showTwelve && (
                                        <div className="reveal" style={{...adminStyles.twelveBox, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <img src={`/flags/${liveData[revealIndex]?.juryTop10[0].country}.png`} style={{ width: '50px', height: '33px', objectFit: 'cover', marginRight: '20px' }} alt={liveData[revealIndex]?.juryTop10[0].country} />
                                            <div>
                                                <span style={{ fontSize: '18px', display: 'block', opacity: 0.8 }}>12 POINTS</span>
                                                {liveData[revealIndex]?.juryTop10[0].country.toUpperCase()}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {(showTen || showTwelve) && (
                                        <button onClick={() => setShowLeaderboard(true)} style={{ ...adminStyles.mainBtn, background: `linear-gradient(135deg, ${MAGENTA} 0%, #c500cc 100%)`, boxShadow: `0 4px 20px ${MAGENTA}40, 0 0 40px ${MAGENTA}20` }}>
                                            ADD TO LEADERBOARD
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <h1 style={{ textAlign: 'center', color: MAGENTA, letterSpacing: '4px', marginBottom: '30px', fontSize: '48px', fontWeight: 900, textShadow: `0 0 30px ${MAGENTA}40` }}>JURY LEADERBOARD</h1>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                        <div>
                                            {jurorLeaderboard.slice(0, 13).map(([country, scores], idx) => (
                                                <div key={country} style={adminStyles.leaderboardRow}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontWeight: 900, minWidth: '30px' }}>{idx + 1}.</span>
                                                        <img src={`/flags/${country}.png`} style={{ width: '25px', height: '17px', objectFit: 'cover' }} alt={country} />
                                                        <span>{country}</span>
                                                    </div>
                                                    <span style={{ color: CYAN }}>{scores.jury} PTS</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            {jurorLeaderboard.slice(13).map(([country, scores], idx) => (
                                                <div key={country} style={adminStyles.leaderboardRow}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontWeight: 900, minWidth: '30px' }}>{idx + 14}.</span>
                                                        <img src={`/flags/${country}.png`} style={{ width: '25px', height: '17px', objectFit: 'cover' }} alt={country} />
                                                        <span>{country}</span>
                                                    </div>
                                                    <span style={{ color: CYAN }}>{scores.jury} PTS</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h1 style={{ textAlign: 'center', flex: 1, color: MAGENTA, letterSpacing: '4px', margin: 0, fontSize: '48px', fontWeight: 900, textShadow: `0 0 30px ${MAGENTA}40` }}>LEADERBOARD</h1>
                                <button onClick={revealNextTelevote} style={{ ...adminStyles.mainBtn, background: `linear-gradient(135deg, ${MAGENTA} 0%, #c500cc 100%)`, boxShadow: `0 4px 20px ${MAGENTA}40, 0 0 40px ${MAGENTA}20`, padding: '16px 28px', fontSize: '13px' }} disabled={revealingTelevote !== null}>
                                    REVEAL TELEVOTE
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
                                <div>
                                    {leaderboard.slice(0, 13).map(([country, scores], idx) => (
                                        <div key={country} style={{ ...adminStyles.leaderboardRow, transition: 'all 0.5s ease', opacity: scores.revealed ? 1 : 0.7 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontWeight: 900, minWidth: '30px' }}>{idx + 1}.</span>
                                                <img src={`/flags/${country}.png`} style={{ width: '25px', height: '17px', objectFit: 'cover' }} alt={country} />
                                                <span>{country}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                {scores.revealed && <span style={{ color: MAGENTA, fontSize: '12px' }}>+{scores.tele} TELE</span>}
                                                <span style={{ color: CYAN }}>{scores.total} PTS</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    {leaderboard.slice(13).map(([country, scores], idx) => (
                                        <div key={country} style={{ ...adminStyles.leaderboardRow, transition: 'all 0.5s ease', opacity: scores.revealed ? 1 : 0.7 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontWeight: 900, minWidth: '30px' }}>{idx + 14}.</span>
                                                <img src={`/flags/${country}.png`} style={{ width: '25px', height: '17px', objectFit: 'cover' }} alt={country} />
                                                <span>{country}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                {scores.revealed && <span style={{ color: MAGENTA, fontSize: '12px' }}>+{scores.tele} TELE</span>}
                                                <span style={{ color: CYAN }}>{scores.total} PTS</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Televote Reveal Animation */}
                    {revealingTelevote && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.95) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(20px)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
                                <div style={{ animation: 'slideUp 0.5s ease', fontSize: '120px' }}>
                                    <img src={`/flags/${revealingTelevote}.png`} style={{ width: '320px', height: '220px', objectFit: 'cover', borderRadius: '16px', boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 60px ${MAGENTA}30` }} alt={revealingTelevote} />
                                </div>
                                <div style={{ animation: 'slideUp 1s ease 1s both', textAlign: 'center' }}>
                                    <div style={{ fontSize: '52px', fontWeight: 900, background: `linear-gradient(135deg, ${MAGENTA} 0%, #ff00ff 100%)`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '15px', textShadow: `0 0 40px ${MAGENTA}60`, letterSpacing: '2px' }}>
                                        +{televoteCounter} TELEVOTE
                                    </div>
                                    <div style={{ fontSize: '76px', fontWeight: 900, background: `linear-gradient(135deg, ${CYAN} 0%, #00e5ff 100%)`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: `0 0 40px ${CYAN}60`, letterSpacing: '2px' }}>
                                        = {(leaderboard.find(([c]) => c === revealingTelevote)?.[1]?.jury || 0) + televoteCounter} TOTAL
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Hidden Control Panel (Doesn't show on TV if you keep mouse off it) */}
            <div className="admin-dock" style={adminStyles.dock}>
                <button onClick={() => { setView('reveal'); setRevealedCountries(new Set()); setShowLeaderboard(false); }} style={{ ...dockButtonStyle }}>Reveal View</button>
                <button onClick={() => setView('leaderboard')} style={{ ...dockButtonStyle }}>Full Leaderboard</button>
                <div style={{ width: '2px', background: 'rgba(100,116,139,0.3)', margin: '0 10px' }} />
                <button onClick={() => setShowTen(true)} style={{ ...dockButtonStyle }}>Show 10</button>
                <button onClick={() => setShowTwelve(true)} style={{ ...dockButtonStyle }}>Show 12</button>
                <button onClick={() => setShowLeaderboard(!showLeaderboard)} style={{ ...dockButtonStyle, background: showLeaderboard ? `linear-gradient(135deg, ${MAGENTA} 0%, #c500cc 100%)` : 'inherit' }}>
                    {showLeaderboard ? 'Back to Juror' : 'Show Leaderboard'}
                </button>
                <button onClick={() => { 
                    if(revealIndex < liveData.length - 1) {
                        setRevealIndex(prev => prev + 1); 
                        setShowTen(false); 
                        setShowTwelve(false);
                        setShowLeaderboard(false);
                    }
                }} style={{ ...dockButtonStyle }}>Next Juror</button>
                <button onClick={fetchJuryResults} style={{ ...dockButtonStyle, background: `linear-gradient(135deg, ${CYAN} 0%, #00b8e6 100%)` }}>Refresh</button>
            </div>
        </div>
    );
}

const adminStyles = {
    mainBtn: { 
        padding: '14px 32px', 
        background: `linear-gradient(135deg, ${CYAN} 0%, #00b8e6 100%)`,
        border: 'none', 
        fontWeight: 900, 
        cursor: 'pointer', 
        borderRadius: '12px', 
        marginTop: '20px',
        fontSize: '14px',
        letterSpacing: '1px',
        boxShadow: `0 4px 20px ${CYAN}40, 0 0 40px ${CYAN}20`,
        transition: 'all 0.3s ease',
        textTransform: 'uppercase'
    },
    pointGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' },
    pointRow: { 
        background: 'linear-gradient(135deg, rgba(1, 184, 230, 0.1) 0%, rgba(15, 23, 42, 0.5) 100%)',
        padding: '18px', 
        textAlign: 'left', 
        fontWeight: 800, 
        borderLeft: `3px solid ${CYAN}`, 
        fontSize: '18px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        borderRadius: '8px',
        border: `1px solid ${CYAN}30`,
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)'
    },
    tenBox: { 
        background: `linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%)`,
        padding: '25px', 
        borderRadius: '16px', 
        border: `2px solid ${CYAN}`, 
        fontSize: '18px', 
        fontWeight: 900, 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 8px 30px ${CYAN}20, inset 0 1px 0 rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(20px)'
    },
    twelveBox: { 
        background: `linear-gradient(135deg, rgba(45, 0, 77, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%)`, 
        padding: '40px', 
        borderRadius: '16px', 
        border: `3px solid ${MAGENTA}`, 
        fontSize: '24px', 
        fontWeight: 900, 
        textShadow: `0 0 20px rgba(224, 0, 255, 0.5)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 8px 30px ${MAGENTA}30, inset 0 1px 0 rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(20px)'
    },
    leaderboardRow: { 
        background: 'linear-gradient(135deg, rgba(11, 16, 30, 0.8) 0%, rgba(15, 23, 42, 0.5) 100%)',
        padding: '16px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontWeight: 700, 
        borderRadius: '12px', 
        border: `1px solid rgba(0, 229, 255, 0.2)`,
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    },
    dock: { 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: '15px', 
        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0))',
        display: 'flex', 
        gap: '10px', 
        justifyContent: 'center', 
        opacity: 0.1, 
        transition: 'opacity 0.3s',
        flexWrap: 'wrap',
        backdropFilter: 'blur(20px)'
    },
};