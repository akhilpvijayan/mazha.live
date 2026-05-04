import type { GeoPoint, PincodeInfo } from '../types';
import { DISTRICT_CENTERS } from '../utils/kerala';

const cache = new Map<string, PincodeInfo & GeoPoint>();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function getPincodeData(pin: string): Promise<(PincodeInfo & GeoPoint) | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  if (cache.has(pin)) return cache.get(pin)!;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    const result = data?.[0];
    if (result?.Status !== 'Success') return null;
    const po = result.PostOffice?.[0];
    if (!po) return null;
    if (!po.State.toLowerCase().includes('kerala')) return null;

    const info: PincodeInfo = {
      area: po.Name,
      district: po.District,
      state: po.State,
      pincode: po.Pincode,
    };

    await sleep(700);

    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        `${po.Name}, ${po.District}, Kerala, India`
      )}&format=json&limit=1`,
      { headers: { 'User-Agent': 'MazhaUndo/3.0' } }
    );
    const geoData = await geoRes.json();

    let point: GeoPoint;
    if (geoData?.[0]) {
      point = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
    } else {
      const c = DISTRICT_CENTERS[po.District];
      point = c ? { lat: c[0], lng: c[1] } : { lat: 10.2, lng: 76.3 };
    }

    const final = { ...info, ...point };
    cache.set(pin, final);
    return final;
  } catch {
    return null;
  }
}
