// Indian mobile numbers (10 digits, starting 6 to 9) are saved as "+91 98765 43210".
// Numbers with another country code (+44 ...) are allowed too.
// Returns the cleaned phone, '' if empty, or null if invalid.
function cleanPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^\+?[\d\s\-()]{7,20}$/.test(raw)) return null;
  let d = raw.replace(/\D/g, '');
  if (raw.startsWith('+') && !d.startsWith('91')) return d.length >= 7 && d.length <= 15 ? '+' + d : null;
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}
module.exports = { cleanPhone };
