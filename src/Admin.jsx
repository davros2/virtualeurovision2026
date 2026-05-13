import React, { useState } from 'react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyNLv_p8avygTVYrNOm6n0xXKzT0l_sNd2os-hxNeyJP-5gBhjd1B96l3ZlbY2pTglsg/exec';
const CYAN = '#00e5ff';
const MAGENTA = '#e000ff';
const EURO_POINTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

export default function Admin() {
    const [liveData, setLiveData] = useState([]);
    const [revealIndex, setRevealIndex] = useState(0);
    const [showTen, setShowTen] = useState(false);
    const [showTwelve, setShowTwelve] = useState(false);

    const fetchJuryResults = async () => {
        try {
            const res = await fetch(SCRIPT_URL);
            const raw = await res.json();
            
            // Group by Juror
            const grouped = raw.reduce((acc, row) => {
                const juror = row["Juror Name"] || row["Juror"];
                if (!acc[juror]) acc[juror] = { name: juror, location: row["Station Location"] || "Unknown", scores: [] };
                const juryTotal = parseInt(row["Jury Vocals"] || 0) + parseInt(row["Jury Video"] || 0);
                acc[juror].scores.push({ country: row["Country"], total: juryTotal });
                return acc;
            }, {});

            const processed = Object.values(grouped).map(juror => ({
                ...juror,
                top10: [...juror.scores].sort((a, b) => b.total - a.total).slice(0, 10)
            }));

            setLiveData(processed);
        } catch (e) { alert("Data fetch failed"); }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#050810', color: 'white', padding: '40px' }}>
            <style>{`
                @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .reveal { animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            `}</style>

            {!liveData.length ? (
                <div style={{ textAlign: 'center', marginTop: '100px' }}>
                    <h1>PREPARATION MODE</h1>
                    <button onClick={fetchJuryResults} style={adminStyles.mainBtn}>SYNC GOOGLE SHEET</button>
                </div>
            ) : (
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {/* The Reveal UI */}
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '72px', color: CYAN, margin: 0 }}>{liveData[revealIndex].name}</h1>
                        <p style={{ letterSpacing: '8px', color: '#64748b' }}>{liveData[revealIndex].location.toUpperCase()}</p>
                        
                        <div style={adminStyles.pointGrid}>
                            {liveData[revealIndex].top10.slice(2).reverse().map((s, i) => (
                                <div key={s.country} style={adminStyles.pointRow}>
                                    <span style={{ color: CYAN }}>{EURO_POINTS[i+2]}</span> {s.country}
                                </div>
                            ))}
                        </div>

                        {showTen && (
                            <div className="reveal" style={adminStyles.tenBox}>
                                10 POINTS: {liveData[revealIndex].top10[1].country}
                            </div>
                        )}
                        {showTwelve && (
                            <div className="reveal" style={adminStyles.twelveBox}>
                                12 POINTS: {liveData[revealIndex].top10[0].country}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden Control Panel */}
            <div style={adminStyles.dock}>
                <button onClick={() => { setShowTen(true); }}>Reveal 10</button>
                <button onClick={() => { setShowTwelve(true); }}>Reveal 12</button>
                <button onClick={() => { 
                    setRevealIndex(prev => prev + 1); 
                    setShowTen(false); 
                    setShowTwelve(false); 
                }}>Next Juror</button>
                <button onClick={fetchJuryResults} style={{ background: CYAN, color: 'black' }}>Refresh Data</button>
            </div>
        </div>
    );
}

const adminStyles = {
    mainBtn: { padding: '20px 40px', background: CYAN, border: 'none', fontWeight: 900, cursor: 'pointer', borderRadius: '10px' },
    pointGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '40px 0' },
    pointRow: { background: '#111827', padding: '15px', textAlign: 'left', fontWeight: 700, borderLeft: `5px solid ${CYAN}` },
    tenBox: { background: '#1e293b', padding: '25px', borderRadius: '15px', border: `2px solid ${CYAN}`, fontSize: '24px', fontWeight: 900, marginBottom: '20px' },
    twelveBox: { background: `linear-gradient(45deg, #2d004d, #000)`, padding: '40px', borderRadius: '15px', border: `4px solid ${MAGENTA}`, fontSize: '48px', fontWeight: 900 },
    dock: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', background: '#000', display: 'flex', gap: '10px', justifyContent: 'center' }
};