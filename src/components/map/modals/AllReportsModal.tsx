import { useState } from 'react';
import type { RainReport } from '../../../types';
import { useLang } from '../../../context/LangContext';
import { currentAvgIntensity, isGhost } from '../../../services/supabase';
import { getIntensityLabel } from '../../../utils/kerala';
import { IconCloudRain, IconMapPin, IconShare, IconX } from '../../Icons';
import { ShareSheet, buildShareText } from '../modals/ShareSheet';
import { BADGE_COLORS, getLevel } from '../modals/MarkerTooltip';
import { INTENSITY_OPTIONS } from './ReportModal';

export function AllReportsModal({ reports, now, onClose }: {
    reports: RainReport[]; now: number; onClose: () => void;
}) {
    const { t } = useLang();
    const [filter, setFilter] = useState<'all' | 'ghost' | 'extreme' | 'heavy' | 'moderate' | 'light' | 'drizzle'>('all');
    const [shareData, setShareData] = useState<{ title: string; text: string } | null>(null);

    const sorted = [...reports].sort((a, b) => b.lastUpdated - a.lastUpdated);
    const filtered = filter === 'all' ? sorted
        : filter === 'ghost' ? sorted.filter(r => isGhost(r, now))
            : sorted.filter(r => getLevel(currentAvgIntensity(r, now)) === filter && !isGhost(r, now));

    const CHIPS = [
        { id: 'all', label: 'All' }, { id: 'ghost', label: 'Ghost' },
        { id: 'extreme', label: 'Extreme' }, { id: 'heavy', label: 'Heavy' },
        { id: 'moderate', label: 'Moderate' }, { id: 'light', label: 'Light' },
        { id: 'drizzle', label: 'Drizzle' },
    ];

    type Level = 'drizzle' | 'light' | 'moderate' | 'heavy' | 'extreme';
    const BADGE_COLORS: Record<Level, string> = {
        drizzle: '#4d9fff',
        light: '#60b4ff',
        moderate: '#a855f7',
        heavy: '#f59e0b',
        extreme: '#ef4444',
    };

    return (
        <>
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="modal-sheet" style={{ maxHeight: '88vh' }}>
                    <div className="modal-handle" />
                    <div className="modal-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="modal-title">{t.viewAll}</div>
                            <span style={{ padding: '2px 9px', background: 'var(--card2)', borderRadius: 99, fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{reports.length}</span>
                        </div>
                        <button className="modal-close" onClick={onClose}><IconX size={14} /></button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        {CHIPS.map(c => {
                            const col =
                                c.id === 'ghost'
                                    ? '#7a8899'
                                    : c.id !== 'all'
                                        ? BADGE_COLORS[c.id as Level]
                                        : 'var(--text2)';
                            const active = filter === c.id;
                            return (
                                <button key={c.id} onClick={() => setFilter(c.id as any)}
                                    style={{ padding: '5px 12px', borderRadius: 99, whiteSpace: 'nowrap', border: `1px solid ${active ? col : 'var(--border2)'}`, background: active ? `${col}18` : 'transparent', color: active ? col : 'var(--text3)', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}>
                                    {c.label}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, padding: 14 }}>
                        {filtered.length === 0
                            ? <div className="no-reports"><div className="no-reports-icon"><IconCloudRain size={32} color="var(--text3)" /></div><div className="no-reports-title">{t.noReports}</div></div>
                            : filtered.map((r, idx) => {
                                const ghost = isGhost(r, now);
                                const effAvg = currentAvgIntensity(r, now);
                                const rawAvg = r.total / r.count;
                                const level = ghost ? 'drizzle' : getLevel(effAvg);
                                const col = ghost ? '#7a8899' : BADGE_COLORS[level];
                                const LvlIcon = INTENSITY_OPTIONS.find(o => o.level === level)?.Icon || IconCloudRain;
                                return (
                                    <div key={r.pin} className="report-card" style={{ '--card-accent': col, animationDelay: `${idx * 25}ms`, opacity: ghost ? .7 : 1 } as any}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${col}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <LvlIcon size={18} color={col} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>
                                                    {r.place}
                                                    {ghost && <span style={{ fontSize: 9, background: 'rgba(120,130,150,0.15)', color: '#7a8899', padding: '1px 6px', borderRadius: 99, marginLeft: 6, fontWeight: 700 }}>FADED</span>}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <IconMapPin size={9} color="currentColor" />{r.district} · {r.pin}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 800, color: col }}>{ghost ? rawAvg.toFixed(1) : effAvg.toFixed(1)}</div>
                                                <div style={{ fontSize: 9, color: 'var(--text3)' }}>{ghost ? 'peak' : 'now'} mm/hr</div>
                                            </div>
                                            <button onClick={() => setShareData({ title: r.pin, text: buildShareText(r.pin, r.place, r.district, rawAvg, r.count) })}
                                                style={{ width: 32, height: 32, background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text2)' }}>
                                                <IconShare size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            </div>
            {shareData && <ShareSheet title={shareData.title} text={shareData.text} onClose={() => setShareData(null)} />}
        </>
    );
}