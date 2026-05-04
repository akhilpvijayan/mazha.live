export const DISTRICT_CENTERS: Record<string, [number, number]> = {
  "Thiruvananthapuram": [8.5241, 76.9366],
  "Kollam":             [8.8932, 76.6141],
  "Pathanamthitta":     [9.2648, 76.7870],
  "Alappuzha":          [9.4981, 76.3388],
  "Kottayam":           [9.5916, 76.5222],
  "Idukki":             [9.8497, 76.9729],
  "Ernakulam":          [9.9816, 76.2999],
  "Thrissur":           [10.5276, 76.2144],
  "Palakkad":           [10.7867, 76.6548],
  "Malappuram":         [11.0732, 76.0740],
  "Kozhikode":          [11.2588, 75.7804],
  "Wayanad":            [11.6854, 76.1320],
  "Kannur":             [11.8745, 75.3704],
  "Kasaragod":          [12.4996, 74.9869],
};

export const getIntensityLabel = (mm: number): string => {
  if (mm > 80) return 'Very Heavy';
  if (mm > 50) return 'Heavy';
  if (mm > 20) return 'Moderate';
  if (mm > 8)  return 'Light';
  return 'Drizzle';
};

export const getIntensityColor = (mm: number): string => {
  if (mm > 80) return '#ff3b3b';
  if (mm > 50) return '#ff7a00';
  if (mm > 20) return '#a855f7';
  if (mm > 8)  return '#4db8ff';
  return '#00d4ff';
};

export const getIntensityGlow = (mm: number): string => {
  if (mm > 80) return 'rgba(255,59,59,0.5)';
  if (mm > 50) return 'rgba(255,122,0,0.5)';
  if (mm > 20) return 'rgba(168,85,247,0.5)';
  return 'rgba(0,212,255,0.4)';
};

export const getHeatColor = (mm: number): [number, number, number, number] => {
  if (mm > 80) return [255, 59,  59,  210];
  if (mm > 50) return [255, 120, 0,   190];
  if (mm > 20) return [168, 85,  247, 170];
  return               [0,  212, 255, 130];
};
