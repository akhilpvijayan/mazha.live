import { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { DISTRICT_CENTERS } from '../utils/kerala';
import { IconX, IconCheck, IconAlertTriangle, IconCloudRain, IconShield } from './Icons';

const ALL_DISTRICTS = Object.keys(DISTRICT_CENTERS).sort();

interface Props {
  onClose: () => void;
}

export function NotificationSettingsModal({ onClose }: Props) {
  const {
    permission, subscribed, loading, districts,
    isSupported, subscribe, unsubscribe, updateDistricts,
  } = usePushNotifications();

  const [selected, setSelected] = useState<string[]>(districts.length ? districts : ALL_DISTRICTS.slice(0, 3));
  const [success, setSuccess]   = useState(false);

  const toggleDistrict = (d: string) => {
    setSelected(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const handleSubscribe = async () => {
    if (selected.length === 0) return;
    const ok = await subscribe(selected);
    if (ok) { setSuccess(true); setTimeout(onClose, 2000); }
  };

  const handleUpdate = async () => {
    await updateDistricts(selected);
    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  const handleUnsubscribe = async () => {
    await unsubscribe();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight: '88vh' }}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">Rain Alerts</div>
          <button className="modal-close" onClick={onClose}><IconX size={14} /></button>
        </div>
        <div className="modal-body">
          {success ? (
            <div className="success-card">
              <div className="success-icon-wrap"><IconCheck size={28} color="var(--cyan)" /></div>
              <div className="success-title">Alerts {subscribed ? 'Updated' : 'Enabled'}!</div>
              <div className="success-msg">You'll get notified when heavy rain is reported in your selected districts.</div>
            </div>
          ) : !isSupported ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: .4 }}><IconAlertTriangle size={40} color="var(--text3)" /></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Not Supported</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>Push notifications are not supported in this browser. Try Chrome or Safari on your device.</div>
            </div>
          ) : permission === 'denied' ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', opacity: .4 }}><IconAlertTriangle size={40} color="var(--text3)" /></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Notifications Blocked</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>You've blocked notifications for this site. To enable:<br />Open browser settings → Site permissions → Notifications → Allow mazha.live</div>
            </div>
          ) : (
            <>
              {/* Status card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: subscribed ? 'rgba(0,204,102,0.08)' : 'rgba(0,212,255,0.07)', border: `1px solid ${subscribed ? 'rgba(0,204,102,0.2)' : 'rgba(0,212,255,0.2)'}`, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: subscribed ? 'rgba(0,204,102,0.15)' : 'rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {subscribed ? <IconShield size={20} color="#00cc66" /> : <IconCloudRain size={20} color="var(--cyan)" />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {subscribed ? 'Alerts Active' : 'Enable Rain Alerts'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {subscribed
                      ? `Watching ${districts.length} district${districts.length !== 1 ? 's' : ''}`
                      : 'Get notified when heavy rain hits your district'}
                  </div>
                </div>
              </div>

              {/* District selector */}
              <div className="step-label">Select Districts to Watch</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 8 }}>
                <button onClick={() => setSelected(ALL_DISTRICTS)} style={chipBtnStyle}>All</button>
                <button onClick={() => setSelected([])} style={chipBtnStyle}>None</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7, marginBottom: 20 }}>
                {ALL_DISTRICTS.map(d => {
                  const on = selected.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDistrict(d)}
                      style={{
                        padding: '9px 12px', borderRadius: 10, textAlign: 'left',
                        border: `1px solid ${on ? 'rgba(0,212,255,0.4)' : 'var(--border2)'}`,
                        background: on ? 'rgba(0,212,255,0.09)' : 'var(--card)',
                        color: on ? 'var(--cyan)' : 'var(--text2)',
                        fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'all .18s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      {d}
                      {on && <IconCheck size={13} color="var(--cyan)" />}
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              {subscribed ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    onClick={handleUnsubscribe}
                    disabled={loading}
                    style={{ padding: '13px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: 12, color: '#ff6666', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}
                  >
                    Turn Off
                  </button>
                  <button className="modal-submit" style={{ padding: '13px' }} onClick={handleUpdate} disabled={loading || selected.length === 0}>
                    {loading ? <span className="submit-spinner" /> : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <button className="modal-submit" onClick={handleSubscribe} disabled={loading || selected.length === 0}>
                  {loading
                    ? <><span className="submit-spinner" />Enabling…</>
                    : <><IconCloudRain size={17} color="var(--cyan-dark)" />Enable Alerts for {selected.length} District{selected.length !== 1 ? 's' : ''}</>}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const chipBtnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 99, border: '1px solid var(--border2)',
  background: 'transparent', color: 'var(--text3)', fontFamily: 'var(--ff)',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
};
