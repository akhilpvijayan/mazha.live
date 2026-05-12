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
  if (mm > 20) return 'rgb(255, 0, 234)';
  if (mm > 8)  return 'rgb(251, 255, 0)';
  return 'rgb(18, 216, 28)';
};

export const getIntensityGlow = (mm: number): string => {
  if (mm > 80) return 'rgba(255,59,59,0.5)';
  if (mm > 50) return 'rgba(255,122,0,0.5)';
  if (mm > 20) return 'rgb(255, 0, 234)';
  if (mm > 8)  return 'rgba(251,255,0,0.5)';
  return 'rgba(18,216,28,0.5)';
};

export const getHeatColor = (mm: number): [number, number, number, number] => {
  if (mm > 80) return [255, 59,  59, 255]; 
  if (mm > 50) return [255, 122, 0,  255];  
  if (mm > 20) return [255, 0,   234, 128];
  if (mm > 8)  return [251, 255, 0,  255];
  return               [18,  216, 28, 255]; 
};
