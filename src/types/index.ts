export interface RainReport {
  pin:           string;
  lat:           number;
  lng:           number;
  place:         string;
  district:      string;
  total:         number;   // sum of all intensities
  count:         number;   // number of reports
  lastUpdated:   number;   // ms timestamp of most recent report
  firstReport:   number;   // ms timestamp of earliest report in window
  lastIntensity: number;   // intensity value of the most recent single report
}

/** A single raw event for Live Feed / Activity tabs */
export interface LiveEvent {
  id:        string;
  pin:       string;
  place:     string;
  district:  string;
  intensity: number;
  ts:        number;   // ms timestamp
  faded?:    boolean;  // true if > 2h old (ghost period)
}

/** A single raw report row from Supabase */
export interface RawReport {
  id:          string;
  pin:         string;
  place:       string;
  district:    string;
  lat:         number;
  lng:         number;
  intensity:   number;
  reported_at: string;   // ISO string
}

export interface PincodeInfo {
  area:     string;
  district: string;
  state:    string;
  pincode:  string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type Theme = 'dark' | 'light';
