// Klinika atrofidagi binolar ro'yxati (models/atrof/joylashuv.json) -> sahna uchun joylashuvlar.
export function atrofList(json, urlFor) {
  const list = Array.isArray(json?.binolar) ? json.binolar : [];
  return list
    .filter((b) => b && typeof b.fayl === 'string' && /\.glb$/i.test(b.fayl) && !b.fayl.includes('..'))
    .map((b) => ({
      url: urlFor(b.fayl),
      name: String(b.nomi || b.fayl),
      x: Number(b.x) || 0,
      z: Number(b.z) || 0,
      rot: ((Number(b.burilish) || 0) * Math.PI) / 180,
    }));
}
