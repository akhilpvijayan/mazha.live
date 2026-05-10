import { useState } from 'react';
import type { RainReport, LiveEvent } from '../../../types';
import { useLang } from '../../../context/LangContext';
import { IconCloudRain, IconActivity, IconBarChart, IconSearch, IconDroplet, IconShare } from '../../Icons';
import { AdBanner } from '../../ads/AdBanner';
import { LiveTab } from '../tabs/LiveTab';
import { ActivityTab } from '../tabs/ActivityTab';
import { InsightsTab } from '../tabs/InsightsTab';

type SbTab = 'live' | 'activity' | 'insights';

export function FloatingSidebar({ reports, now, selectedPin, onSelect, onViewAll, onDistrictShare, onPinStatus, liveEvents }: {
  reports: RainReport[]; now: number; selectedPin: string | null; liveEvents: LiveEvent[];
  onSelect: (p: string) => void; onViewAll: () => void;
  onDistrictShare: () => void; onPinStatus: () => void;
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<SbTab>('live');
  const TABS = [
    { id: 'live' as SbTab, Icon: IconCloudRain, label: 'Live' },
    { id: 'activity' as SbTab, Icon: IconActivity, label: t.activity },
    { id: 'insights' as SbTab, Icon: IconBarChart, label: t.insights },
  ];
  return (
    <div className="float-sidebar">
      <div className="fsb-header">
        <div className="fsb-title-row">
          <div className="fsb-title">Live Rain</div>
          <div className="fsb-live-badge"><div className="fsb-live-dot" />LIVE</div>
        </div>
        <div className="fsb-search-row">
          <button
            className="fsb-search-btn"
            onClick={onPinStatus}
          >
            <IconSearch size={13} />
            Search PIN Area
          </button>
        </div>

        <hr className="fsb-divider" />

        <div className="fsb-tabs">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              className={`fsb-tab${tab === tb.id ? ' active' : ''}`}
              onClick={() => setTab(tb.id)}
            >
              <tb.Icon size={12} />
              {tb.label}
            </button>
          ))}
        </div>
      </div>
      <div className="fsb-body">
        {tab === 'live' && <LiveTab liveEvents={liveEvents} selectedPin={selectedPin} onSelect={onSelect} />}
        {tab === 'activity' && <ActivityTab liveEvents={liveEvents} />}
        {tab === 'insights' && <InsightsTab reports={reports} now={now} />}
      </div>
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'right', marginBottom: 3, letterSpacing: '.4px' }}>AD</div>
        <AdBanner slot="1234567890" style={{ maxHeight: 0 }} />
      </div>
      <div className="fsb-footer">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <button className="fsb-action-btn" onClick={onViewAll}><IconDroplet size={13} />All</button>
          <button className="fsb-action-btn" onClick={onDistrictShare}><IconShare size={13} />Districts</button>
          <button className="fsb-action-btn" onClick={onPinStatus}><IconSearch size={13} />Search</button>
        </div>
      </div>
    </div>
  );
}