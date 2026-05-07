import {
    IconHeartHandshake,
    IconCloudRain,
    IconX,
    IconSparkles,
    IconQrcode,
    IconCoffee,
    IconCookie,
    IconMeat,
    IconHelicopter,
  } from '@tabler/icons-react';
  import { useMemo, useState } from 'react';
  import type { Icon as TablerIcon } from '@tabler/icons-react';
  
  /* ─── DATA ───────────────────────────────────────── */
  
  type SupportTier = {
    name: string;
    desc: string;
    amount: number;
    icon: TablerIcon;
  };
  
  const SUPPORT_TIERS: SupportTier[] = [
    { icon: IconCoffee, name: 'Pazham', amount: 5, desc: 'Tiny banana for server survival' },
    { icon: IconCookie, name: 'Pazhampori', amount: 15, desc: 'Crispy fuel for debugging' },
    { icon: IconMeat, name: 'Porotta + Beef', amount: 40, desc: 'Proper developer meal' },
    { icon: IconSparkles, name: 'Sadya Plate', amount: 100, desc: 'Full Kerala energy boost ✨' },
    { icon: IconHelicopter, name: 'Chopper Mode', amount: 500, desc: 'Extreme weather funding 🚁' },
  ];
  
  /* ─── COMPONENT ───────────────────────────────────────── */
  
  export default function SupportModal({ onClose }: { onClose: () => void }) {
    const [selected, setSelected] = useState(1);
    const [customAmount, setCustomAmount] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [showQR, setShowQR] = useState(false);
  
    const tier = SUPPORT_TIERS[selected];
    const upi = import.meta.env.VITE_UPI_ID ?? '';
  
    const finalAmount = useMemo(() => {
      if (isCustom) {
        const amt = Number(customAmount);
        return Number.isFinite(amt) && amt > 0 ? amt : tier.amount;
      }
      return tier.amount;
    }, [customAmount, isCustom, tier.amount]);
  
    const upiLink = useMemo(() => {
      return `upi://pay?pa=${encodeURIComponent(
        upi
      )}&pn=MazhaLive&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(
        'Support Mazha.Live'
      )}`;
    }, [upi, finalAmount]);
  
    const qrUrl = useMemo(() => {
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        upiLink
      )}`;
    }, [upiLink]);
  
    const handlePay = () => {
      window.location.href = upiLink;
    };
  
    return (
      <div
        className="support-backdrop"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="support-modal">
  
          {/* HEADER */}
          <div className="support-header">
            <div className="support-title">
              <IconHeartHandshake size={20} />
              Support Mazha.Live
            </div>
            <button onClick={onClose}>
              <IconX size={18} />
            </button>
          </div>
  
          {/* HERO */}
          <div className="support-hero">
            <IconCloudRain size={22} />
            <div>
              <h3>One dev. Endless rain alerts.</h3>
              <p>Powered by caffeine, chaos & Kerala monsoons 🌧️</p>
            </div>
          </div>
  
          {/* TIERS */}
          <div className="support-tiers">
            {SUPPORT_TIERS.map((t, i) => {
              const Icon = t.icon;
  
              return (
                <button
                  key={t.name}
                  className={`tier ${selected === i && !isCustom ? 'active' : ''}`}
                  onClick={() => {
                    setSelected(i);
                    setIsCustom(false);
                  }}
                >
                  <div className="tier-icon">
                    <Icon size={18} />
                  </div>
  
                  <div className="tier-text">
                    <div className="tier-name">{t.name}</div>
                    <div className="tier-desc">{t.desc}</div>
                  </div>
  
                  <div className="tier-price">₹{t.amount}</div>
                </button>
              );
            })}
          </div>
  
          {/* CUSTOM */}
          <div className="custom-box">
            <span>₹</span>
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onFocus={() => setIsCustom(true)}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setIsCustom(true);
              }}
            />
          </div>
  
          {/* PAY */}
          <button className="pay-btn" onClick={handlePay}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/7/71/Google_Pay_Logo.svg"
              alt="gpay"
            />
            Pay ₹{finalAmount}
          </button>
  
          <div className="upi-note">Secure UPI payment via Google Pay</div>
  
          {/* QR TOGGLE */}
          <button className="qr-toggle" onClick={() => setShowQR(!showQR)}>
            <IconQrcode size={16} />
            {showQR ? 'Hide QR' : 'Show QR (lazy mode 😌)'}
          </button>
  
          {/* QR */}
          {showQR && (
            <div className="qr-box">
              <img src={qrUrl} alt="QR Code" />
              <p>Scan if buttons feel too much effort 💀</p>
            </div>
          )}
        </div>
      </div>
    );
  }