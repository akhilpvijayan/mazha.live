import L from 'leaflet';

export function getDamColor(pct: number): string {
    if (pct >= 90) return '#ff4444';
    if (pct >= 70) return '#ff9500';
    if (pct >= 50) return '#00d4ff';
    return '#6b7a8d';
  }

export const DAM_DATA_URL = import.meta.env.VITE_DAM_URL;

export const DAM_IMAGES: Record<string, string> = {
  'Idukki': '/dams/idukki.jpg',
  'Cheruthoni': '/dams/cheruthoni.jpg',
  'Kulamavu': '/dams/kulamavu.jpg',
  'Banasura Sagar': '/dams/banasura_sagar.jpg',
  'Malampuzha': '/dams/malampuzha.jpg',
  'Mullaperiyar': '/dams/mullaperiyar.jpg',
  'Mattupetty': '/dams/mattupetty.jpg',
  'Neyyar': '/dams/neyyar.jpg',
  'Peechi': '/dams/peechi.jpg',
  'Kakki': '/dams/kakki.jpg',
  'Karapuzha': '/dams/karapuzha.jpg',
  'Kundala': '/dams/kundala.jpg',
  'Idamalayar': '/dams/idamalayar.jpg',
  'Pothundi': '/dams/pothundi.jpg',
  'Mangalam': '/dams/mangalam.jpg',
  'Meenkara': '/dams/meenkara.jpg',
  'Parambikulam': '/dams/parambikulam.jpg',
  'Kakkayam': '/dams/kakkayam.jpg',
  'Poringalkuthu': '/dams/peringalkuthu.jpg',
  'Kanjirapuzha': '/dams/kanjirapuzha.jpg',
  'Pazhassi': '/dams/pazhassi.jpg',
  'Ponmudi': '/dams/ponmudi.jpg',
  'Thenmala': '/dams/thenmala.jpg',
  'Vazhani': '/dams/vazhani.jpg',
  'Siruvani': '/dams/siruvani.jpg',
  'Walayar': '/dams/walayar.jpg',
  'Malankara': '/dams/malankara.jpg',
  'Peruvannamuzhi': '/dams/peruvannamuzhi.jpg',
  'Lower Periyar': '/dams/lower_periyar.jpg',
  'Bhoothathankettu': '/dams/bhoothathankettu.jpg',
  'Sholayar': '/dams/sholayar.jpg',
  'Peppara': '/dams/peppara.jpg',
  'Chulliyar': '/dams/chulliyar.jpg',
  'Pamba': '/dams/pamba.jpg',
  'Erattayar': '/dams/erattayar.jpg',
  'Anathode': '/dams/anathode.jpg',
  'Kallarkutty': '/dams/Kallarkutty.jpg',
  'Kallar': '/dams/Kallar.jpg',
  'Anayirankal': '/dams/aanayirankal.jpg',
  'Moozhiyar': '/dams/moozhiyar.jpg',
  'Pambla': '/dams/pambla.jpg',
  'Chenkulam': '/dams/chenkulam.jpg',
};

export function createDamIcon(pct: number, spillway: boolean, selected: boolean): L.DivIcon {
    const color = getDamColor(pct);
    const size = selected ? 22 : 12;
    const fillHeight = Math.round(24 * (pct / 100));
    const fillY = 2 + 24 - fillHeight;
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="dam-clip-${size}">
            <rect x="2" y="2" width="24" height="24" rx="6"/>
          </clipPath>
        </defs>
        <rect x="2" y="2" width="24" height="24" rx="6"
          fill="${color}" fill-opacity="0.15"
          stroke="${color}" stroke-width="${selected ? 2 : 1.5}"
          ${spillway ? 'stroke-dasharray="4 2"' : ''}/>
        <rect x="2" y="${fillY}" width="24" height="${fillHeight}"
          fill="${color}" fill-opacity="0.45"
          clip-path="url(#dam-clip-${size})"/>
        <rect x="11" y="8" width="2.5" height="12" rx="1" fill="${color}" opacity="0.95"/>
        <rect x="15" y="8" width="2.5" height="12" rx="1" fill="${color}" opacity="0.95"/>
        <rect x="8"  y="7" width="12" height="2.5" rx="1" fill="${color}"/>
        ${spillway ? `<circle cx="22" cy="6" r="3.5" fill="#ff4444" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>` : ''}
      </svg>`;
    return L.divIcon({
      html: svg,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      tooltipAnchor: [0, -(size / 2)],
    });
  }