import { useState } from "react";
import { RainReport } from "../../../types";
import { IconAlertTriangle, IconShield, IconX } from "../../Icons";
import { IconHeart } from '@tabler/icons-react';
import SupportModal from "../../SupportModal";

export function InfoFooter({ reports, now }: { reports: RainReport[]; now: number }) {
  const [showSupport, setShowSupport] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const total = reports.reduce((s, r) => s + r.count, 0);
  return (
    <>
      <div className="info-footer">
        <div className="info-footer-left">
          <span className="info-tag">
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            Made by Akhil · Kerala
          </span>
          <span className="info-sep">·</span>
          <button className="info-link" onClick={() => setShowDisclaimer(true)}>
            <IconAlertTriangle size={9} color="currentColor" /> Disclaimer
          </button>
          <span className="info-sep">·</span>
          {/* <a className="info-link" href="https://mazha.live/terms" target="_blank" rel="noopener noreferrer">
            <IconShield size={9} color="currentColor" /> Terms
          </a> */}
        </div>
        <button className="info-support-btn" onClick={() => setShowSupport(true)}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconHeart size={18} color="#ef4444" fill="#ef4444" style={{ filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))', animation: 'pulse 2s infinite' }} />
          </span>
          <span>Support</span>
        </button>
      </div>
      <div className="info-disclaimer-chip">
        <IconShield size={9} color="var(--text3)" />
        Crowdsourced · {total} community reports · Not official meteorology
      </div>
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {showDisclaimer && (
        <div className="modal-backdrop" onClick={() => setShowDisclaimer(false)}>
          <div className="modal-sheet" style={{ maxHeight: '70vh' }}>
            <div className="modal-handle" />
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <IconAlertTriangle size={18} color="#ffaa00" />
                <div className="modal-title">Disclaimer</div>
              </div>
              <button className="modal-close" onClick={() => setShowDisclaimer(false)}><IconX size={14} /></button>
            </div>
            <div className="modal-body">
              {[
                { icon: '🌧️', title: 'Crowdsourced Data', body: 'All rain reports are submitted by the community. We do not verify accuracy. Do not use this for emergency decisions.' },
                { icon: '🚫', title: 'Not Official', body: 'Mazha.Live is NOT affiliated with IMD, Kerala State Disaster Management Authority, or any government body.' },
                { icon: '⏱️', title: 'Delayed & Decayed', body: 'Reports auto-expire after 2 hours. Historical data shown as "ghost" markers may be stale.' },
                { icon: '💡', title: 'Use Wisely', body: 'For emergencies, always consult official sources. This is a community tool built for awareness.' },
              ].map(d => (
                <div key={d.title} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{d.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{d.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{d.body}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '12px', background: 'rgba(0,212,255,0.06)', border: '1px solid var(--border3)', borderRadius: 10, fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, textAlign: 'center' }}>
                Made with ❤️ and too much chai in Kerala · <strong style={{ color: 'var(--cyan)' }}>mazha.live</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}