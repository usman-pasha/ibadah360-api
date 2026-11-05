const PrayerDef = require('../models/PrayerDef');
const HijriEvent = require('../models/HijriEvent');
const DailyAyah = require('../models/DailyAyah');
const Dua = require('../models/Dua');
const Para = require('../models/Para');
const Lesson = require('../models/Lesson');
const learn = require('./learnSeed');
const About = require('../models/About');
const content = require('./contentSeed');
const aboutSeed = require('./aboutSeed');

// force = false: fill only empty collections (used when the server starts).
// force = true:  reset every content collection to the defaults (npm run seed).
async function seedAll({ force = false } = {}) {
  const done = [];
  const tables = [['prayerdefs', PrayerDef, content.prayerDefs], ['hijrievents', HijriEvent, content.hijriEvents], ['dailyayahs', DailyAyah, content.dailyAyahs], ['duas', Dua, content.duas], ['paras', Para, content.paras], ['lessons', Lesson, learn.lessons]];
  for (const [name, Model, docs] of tables) {
    if (force) await Model.deleteMany({});
    else if ((await Model.estimatedDocumentCount()) > 0) continue;
    await Model.insertMany(docs);
    done.push(name);
  }
  if (force) { await About.findOneAndUpdate({ key: aboutSeed.key }, aboutSeed, { upsert: true, setDefaultsOnInsert: true }); done.push('abouts'); }
  else if (!(await About.exists({ key: aboutSeed.key }))) { await About.create(aboutSeed); done.push('abouts'); }
  return done;
}

module.exports = { seedAll };
