// Quran recitation audio. Files are streamed from the islamic.network CDN (one mp3 per ayah, numbered 1 to 6236).
// If a reciter does not play, change its bitrate here (common values: 64, 128, 192).
const BASE = 'https://cdn.islamic.network/quran/audio';
const RECITERS = [
  { code: 'ar.alafasy', name: 'Mishary Rashid Alafasy', bitrate: 128 },
  { code: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', bitrate: 128 },
  { code: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)', bitrate: 192 },
  { code: 'ar.abdurrahmaansudais', name: 'Abdurrahman As-Sudais', bitrate: 192 },
  { code: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly', bitrate: 128 },
  { code: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi', bitrate: 128 },
];
const DEFAULT_RECITER = RECITERS[0].code;
const audioUrl = (code, globalAyah) => {
  const r = RECITERS.find((x) => x.code === code) || RECITERS[0];
  return `${BASE}/${r.bitrate}/${r.code}/${globalAyah}.mp3`;
};
module.exports = { RECITERS, DEFAULT_RECITER, audioUrl };
