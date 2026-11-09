// The "Print" layout: scanned pages of a printed 15-line Indo-Pak Quran (Nastaleeq style), 610 pages.
// The page pictures are in public/mushaf/001.webp ... 610.webp. The server needs to know which ayahs
// are on each picture; it downloads that list from quran.com (its "Indopak 15 lines" mushaf) and saves it.
module.exports = {
  PAGES: 610,
  QURAN_COM_MUSHAF: 6, // quran.com mushaf id for the Indopak 15 lines book. Change it here if quran.com renumbers.
  // Facts read from the scanned book itself. A downloaded page list is only saved when it agrees with these.
  ANCHORS: { 1: '1:1', 297: '18:30', 610: '113:1' }, // page number: first ayah on that page
  IMAGE: (n) => `mushaf/${String(n).padStart(3, '0')}.webp`,
};
