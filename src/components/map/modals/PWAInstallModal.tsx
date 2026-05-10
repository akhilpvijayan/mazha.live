import { useState, useEffect } from 'react';
import { IconX, IconCloudRain, IconDownload, IconDeviceMobile, IconBell } from '../../Icons';

interface PWAInstallModalProps {
  onClose: () => void;
  onInstall: () => Promise<boolean | void>;
}

export function PWAInstallModal({ onClose, onInstall }: PWAInstallModalProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [manualInstall, setManualInstall] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
  }, []);

  const handleInstall = async () => {
    const success = await onInstall();
    if (success === false) {
      setManualInstall(true);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ animation: 'sheetUp 0.4s var(--spring)', maxWidth: 400, borderRadius: 24, padding: '24px', textAlign: 'center', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: 'var(--card)', border: 'none', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <IconX size={16} />
        </button>

        <div style={{ width: 80, height: 80, margin: '0 auto 20px', background: 'linear-gradient(135deg, rgba(41,182,246,0.1), rgba(21,101,192,0.1))', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(41,182,246,0.2)' }}>
          <span style={{ fontSize: 40, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))' }}>🌧️</span>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: -0.5 }}>Mazha.Live App</h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.5 }}>
          Install the official Mazha.Live web app for a native experience on your device.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--card)', padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ color: '#29b6f6' }}><IconDeviceMobile size={22} /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Home Screen Access</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Launch instantly like a native app</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--card)', padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ color: '#a855f7' }}><IconBell size={22} /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Push Notifications</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Get real-time heavy rain alerts</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--card)', padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ color: '#4ade80' }}><IconDownload size={22} /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Faster Loading</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Optimized performance & caching</div>
            </div>
          </div>
        </div>

        {isIOS ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '16px', textAlign: 'left', border: '1px dashed rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>How to install on iOS:</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              1. Tap the <strong>Share</strong> button at the bottom of Safari.<br/>
              2. Scroll down and select <strong>Add to Home Screen</strong>.
            </div>
          </div>
        ) : manualInstall ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '16px', textAlign: 'left', border: '1px dashed rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Manual Installation Required</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              Chrome is blocking the automatic prompt. This usually means the app is <strong>already installed</strong> on your device, or you are in a development environment.<br/><br/>
              To install manually, click the <strong>Install icon</strong> (🖥️⬇️) located on the far right of your address bar.
            </div>
          </div>
        ) : (
          <button 
            onClick={handleInstall}
            style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #29b6f6, #1976d2)', color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 8px 24px rgba(41,182,246,0.3)' }}
          >
            <IconDownload size={20} />
            Install App Now
          </button>
        )}
      </div>
    </div>
  );
}
