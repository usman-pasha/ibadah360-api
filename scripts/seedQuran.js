// Downloads the whole Quran (all 114 surahs, both scripts, 6 translations) into MongoDB:  npm run seed:quran
// Needs internet on this computer. It can be stopped and run again: finished surahs are skipped.
require('dotenv').config();
const mongoose = require('mongoose');
const Surah = require('../models/Surah');
const { ensureSurahList, ensureSurah } = require('../services/quran');

(async () => {
  if (!process.env.MONGO_URI) { console.error('Set MONGO_URI in .env first'); process.exit(1); }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await ensureSurahList();
    let incomplete = 0;
    for (let n = 1; n <= 114; n++) {
      try {
        await Surah.updateOne({ number: n }, { $unset: { tried: 1 } }); // allow a fresh attempt
        const s = await ensureSurah(n);
        const ok = s.loaded.uthmani && s.loaded.tr && s.loaded.indopak;
        if (!ok) incomplete++;
        console.log(`Surah ${n}/114 ${s.englishName} ${ok ? 'done' : 'PARTLY done (run again later)'}`);
      } catch (e) { incomplete++; console.error(`Surah ${n} failed: ${e.message}`); }
      await new Promise((r) => setTimeout(r, 250));
    }
    console.log(incomplete ? `Finished. ${incomplete} surah(s) are incomplete, run this command again.` : 'The full Quran is saved in MongoDB.');
  } catch (e) { console.error('Failed:', e.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
