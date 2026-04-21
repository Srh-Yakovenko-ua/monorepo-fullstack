export function gradientFromString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, oklch(0.75 0.15 ${hue}) 0%, oklch(0.55 0.22 ${(hue + 40) % 360}) 100%)`;
}
