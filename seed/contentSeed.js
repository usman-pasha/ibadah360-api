// Default content. It is saved in MongoDB the first time the server starts (and by `npm run seed`).
// After that the app reads everything from the database.
const prayerDefs = [
  { kind: 'fard', key: 'fajr', order: 1, name: 'Fajr', ar: 'الفجر' },
  { kind: 'fard', key: 'dhuhr', order: 2, name: 'Dhuhr', ar: 'الظهر' },
  { kind: 'fard', key: 'asr', order: 3, name: 'Asr', ar: 'العصر' },
  { kind: 'fard', key: 'maghrib', order: 4, name: 'Maghrib', ar: 'المغرب' },
  { kind: 'fard', key: 'isha', order: 5, name: 'Isha', ar: 'العشاء' },
  { kind: 'nafl', key: 'ishraq', order: 1, name: 'Ishraq', ar: 'الإشراق', tip: '2 or 4 rakats, about 15 to 20 minutes after sunrise' },
  { kind: 'nafl', key: 'duha', order: 2, name: 'Duha (Chasht)', ar: 'الضحى', tip: '2 to 12 rakats, from mid-morning until before Dhuhr' },
  { kind: 'nafl', key: 'awwabin', order: 3, name: 'Awwabin', ar: 'الأوابين', tip: '2 to 6 rakats after the Maghrib prayer' },
  { kind: 'nafl', key: 'witr', order: 4, name: 'Witr', ar: 'الوتر', tip: 'An odd number of rakats (1, 3 or more) after Isha' },
  { kind: 'nafl', key: 'tahajjud', order: 5, name: 'Tahajjud', ar: 'التهجد', tip: '2 to 12 rakats after sleeping, best in the last third of the night' },
];

const hijriEvents = [
  { m: 1, d: 1, name: 'Islamic New Year', note: 'First day of Muharram and of the new Hijri year.' },
  { m: 1, d: 10, name: 'Day of Ashura', note: 'Fasting on this day is recommended.' },
  { m: 3, d: 12, name: 'Mawlid an-Nabi', note: 'Birth of the Prophet ﷺ, observed by many Muslims.' },
  { m: 7, d: 27, name: "Isra and Mi'raj", note: 'The Night Journey and Ascension, observed by many Muslims.' },
  { m: 8, d: 15, name: "Mid-Sha'ban (Shab-e-Barat)", note: 'Observed by many Muslims with prayer and dua.' },
  { m: 9, d: 1, name: 'First day of Ramadan', note: 'The month of fasting begins.' },
  { m: 9, d: 21, name: 'Last ten nights of Ramadan begin', note: 'Seek Laylat al-Qadr on the odd nights.' },
  { m: 9, d: 27, name: 'Laylat al-Qadr (27th night)', note: 'Commonly observed. It is sought on the odd nights of the last ten.' },
  { m: 10, d: 1, name: 'Eid al-Fitr', eid: true, note: 'Festival at the end of Ramadan. Eid prayer, Zakat al-Fitr and celebration.' },
  { m: 12, d: 1, name: 'First ten days of Dhul Hijjah', note: 'Days of great reward for good deeds.' },
  { m: 12, d: 9, name: 'Day of Arafah', note: 'Fasting is recommended for those who are not on Hajj.' },
  { m: 12, d: 10, name: 'Eid al-Adha', eid: true, note: 'Festival of sacrifice. Eid prayer and Qurbani.' },
  { m: 12, d: 11, name: 'Days of Tashreeq begin', note: 'The 11th to 13th. Days of eating, drinking and remembering Allah.' },
];

const dailyAyahs = ['2:255', '94:5', '13:28', '65:3', '2:286', '3:139', '39:53', '2:153', '2:186', '17:79', '51:18', '29:45', '2:152', '55:13']
  .map((r, i) => ({ order: i + 1, surah: Number(r.split(':')[0]), ayah: Number(r.split(':')[1]) }));

const duas = [
  { cat: 'Daily', title: 'When you wake up', src: 'Sahih al-Bukhari', ar: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ ٱلنُّشُورُ', tr: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur.", en: 'All praise is for Allah who gave us life after causing us to die, and to Him is the return.' },
  { cat: 'Daily', title: 'Before sleeping', src: 'Sahih al-Bukhari', ar: 'بِٱسْمِكَ ٱللَّهُمَّ أَمُوتُ وَأَحْيَا', tr: 'Bismika Allahumma amutu wa ahya.', en: 'In Your name, O Allah, I die and I live.' },
  { cat: 'Daily', title: 'Before eating', src: 'Abu Dawud, Tirmidhi', ar: 'بِسْمِ ٱللَّهِ', tr: 'Bismillah.', en: 'In the name of Allah.' },
  { cat: 'Daily', title: 'After eating', src: 'Abu Dawud, Tirmidhi', ar: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', tr: "Alhamdu lillahil-ladhi at'amana wa saqana wa ja'alana muslimin.", en: 'Praise be to Allah who fed us, gave us drink and made us Muslims.' },
  { cat: 'Daily', title: 'Leaving home', src: 'Abu Dawud, Tirmidhi', ar: 'بِسْمِ ٱللَّهِ تَوَكَّلْتُ عَلَى ٱللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ', tr: "Bismillahi tawakkaltu 'alallahi wa la hawla wa la quwwata illa billah.", en: "In Allah's name. I rely on Allah. There is no power or strength except with Allah." },
  { cat: 'Daily', title: 'Entering the mosque', src: 'Sahih Muslim', ar: 'ٱللَّهُمَّ ٱفْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', tr: 'Allahummaf-tah li abwaba rahmatik.', en: 'O Allah, open for me the doors of Your mercy.' },
  { cat: 'Daily', title: 'Leaving the mosque', src: 'Sahih Muslim', ar: 'ٱللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', tr: "Allahumma inni as'aluka min fadlik.", en: 'O Allah, I ask You of Your bounty.' },
  { cat: 'Tahajjud and forgiveness', title: 'Asking forgiveness at night', src: 'Abu Dawud, Tirmidhi', ar: 'رَبِّ ٱغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنتَ ٱلتَّوَّابُ ٱلرَّحِيمُ', tr: "Rabbighfir li wa tub 'alayya innaka antat-tawwabur-rahim.", en: 'My Lord, forgive me and accept my repentance. You are the One who accepts repentance, the Merciful.' },
  { cat: 'Tahajjud and forgiveness', title: 'Dua of Prophet Yunus', src: 'Quran 21:87', ar: 'لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ ٱلظَّالِمِينَ', tr: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin.', en: 'There is no god but You. Glory to You. I have been among the wrongdoers.' },
  { cat: 'From the Quran', title: 'Good in this world and the next', src: 'Quran 2:201', ar: 'رَبَّنَا آتِنَا فِي ٱلدُّنْيَا حَسَنَةً وَفِي ٱلْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ ٱلنَّارِ', tr: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar.", en: 'Our Lord, give us good in this world and good in the next, and protect us from the punishment of the Fire.' },
  { cat: 'From the Quran', title: 'For parents', src: 'Quran 17:24', ar: 'رَبِّ ٱرْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', tr: 'Rabbir-hamhuma kama rabbayani saghira.', en: 'My Lord, have mercy on them as they raised me when I was small.' },
  { cat: 'From the Quran', title: 'For knowledge', src: 'Quran 20:114', ar: 'رَبِّ زِدْنِي عِلْمًا', tr: "Rabbi zidni 'ilma.", en: 'My Lord, increase me in knowledge.' },
  { cat: 'From the Quran', title: 'In difficulty', src: 'Quran 3:173', ar: 'حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ', tr: "Hasbunallahu wa ni'mal-wakil.", en: 'Allah is enough for us, and He is the best protector.' },
  { cat: 'From the Quran', title: 'A steady heart', src: 'Quran 3:8', ar: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ ٱلْوَهَّابُ', tr: "Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah, innaka antal-wahhab.", en: 'Our Lord, do not let our hearts go astray after You have guided us, and grant us mercy from Yourself. You are the Giver.' },
  { cat: 'From the Quran', title: 'To keep up prayer', src: 'Quran 14:40', ar: 'رَبِّ ٱجْعَلْنِي مُقِيمَ ٱلصَّلَاةِ وَمِن ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ', tr: "Rabbij-'alni muqimas-salati wa min dhurriyyati, Rabbana wa taqabbal du'a.", en: 'My Lord, make me one who keeps up prayer, and my children too. Our Lord, accept my prayer.' },
].map((d, i) => ({ order: i + 1, ...d }));

// The 30 paras (juz). Standard Madani / Tanzil division. A few Indian printed Qurans start a para one ayah
// earlier (for example para 4 at 3:92). Change startSurah / startAyah here and run `npm run seed` if you prefer that.
const paras = [
  [1, 'Alif Lam Meem', 1, 1], [2, 'Sayaqool', 2, 142], [3, 'Tilkal Rusul', 2, 253], [4, 'Lan Tanaloo', 3, 93],
  [5, 'Wal Muhsanat', 4, 24], [6, 'La Yuhibbullah', 4, 148], [7, 'Wa Iza Samiu', 5, 82], [8, 'Wa Lau Annana', 6, 111],
  [9, 'Qalal Malao', 7, 88], [10, "Wa A'lamu", 8, 41], [11, 'Yatazeroon', 9, 93], [12, 'Wa Ma Min Dabbah', 11, 6],
  [13, "Wa Ma Ubarri'u", 12, 53], [14, 'Rubama', 15, 1], [15, 'Subhanalladhi', 17, 1], [16, 'Qal Alam', 18, 75],
  [17, 'Iqtaraba', 21, 1], [18, 'Qad Aflaha', 23, 1], [19, 'Wa Qalalladhina', 25, 21], [20, "A'man Khalaq", 27, 56],
  [21, 'Utlu Ma Oohiya', 29, 46], [22, 'Wa Man Yaqnut', 33, 31], [23, 'Wa Mali', 36, 28], [24, 'Faman Azlam', 39, 32],
  [25, 'Ilayhi Yuraddu', 41, 47], [26, 'Ha Meem', 46, 1], [27, 'Qala Fama Khatbukum', 51, 31], [28, 'Qad Sami Allah', 58, 1],
  [29, 'Tabarakalladhi', 67, 1], [30, 'Amma', 78, 1],
].map(([number, name, startSurah, startAyah]) => ({ number, name, startSurah, startAyah }));

const dhikrs = [
  ['subhanallah', 'سُبْحَانَ ٱللَّهِ', 'SubhanAllah', 'Glory be to Allah', 33],
  ['alhamdulillah', 'ٱلْحَمْدُ لِلَّهِ', 'Alhamdulillah', 'All praise is for Allah', 33],
  ['allahuakbar', 'ٱللَّهُ أَكْبَرُ', 'Allahu Akbar', 'Allah is the Greatest', 34],
  ['lailaha', 'لَا إِلَٰهَ إِلَّا ٱللَّهُ', 'La ilaha illallah', 'There is no god but Allah', 100],
  ['istighfar', 'أَسْتَغْفِرُ ٱللَّهَ', 'Astaghfirullah', 'I seek forgiveness from Allah', 100],
  ['durood', 'ٱللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', 'Allahumma salli ala Muhammad', 'O Allah, send blessings upon Muhammad', 100],
  ['hawqala', 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ', 'La hawla wa la quwwata illa billah', 'There is no power or strength except with Allah', 100],
].map(([key, ar, tr, en, target], i) => ({ order: i + 1, key, ar, tr, en, target }));

// Badges and milestones. A badge is earned when the person's number for "metric" reaches "threshold".
const badges = [
  ['streak', 'streak7', '7 days all on time', 'All five prayers on time, 7 days in a row', 'bestStreak', 7],
  ['streak', 'streak30', '30 days all on time', 'All five prayers on time, 30 days in a row', 'bestStreak', 30],
  ['streak', 'streak100', '100 days all on time', 'All five prayers on time, 100 days in a row', 'bestStreak', 100],
  ['streak', 'streak365', 'A full year on time', 'All five prayers on time, 365 days in a row', 'bestStreak', 365],
  ['prayer', 'ontime100', '100 prayers on time', 'One hundred prayers prayed on time', 'ontimeTotal', 100],
  ['prayer', 'ontime500', '500 prayers on time', 'Five hundred prayers prayed on time', 'ontimeTotal', 500],
  ['prayer', 'ontime1000', '1000 prayers on time', 'One thousand prayers prayed on time', 'ontimeTotal', 1000],
  ['prayer', 'ontime5000', '5000 prayers on time', 'Five thousand prayers prayed on time', 'ontimeTotal', 5000],
  ['qaza', 'qaza10', '10 qaza made up', 'Ten missed prayers made up', 'qazaMade', 10],
  ['qaza', 'qaza100', '100 qaza made up', 'One hundred missed prayers made up', 'qazaMade', 100],
  ['qaza', 'qaza500', '500 qaza made up', 'Five hundred missed prayers made up', 'qazaMade', 500],
  ['qaza', 'qaza1000', '1000 qaza made up', 'One thousand missed prayers made up', 'qazaMade', 1000],
  ['night', 'tahajjud7', '7 nights of Tahajjud', 'Tahajjud prayed on 7 nights', 'tahajjudNights', 7],
  ['night', 'tahajjud30', '30 nights of Tahajjud', 'Tahajjud prayed on 30 nights', 'tahajjudNights', 30],
  ['night', 'tahajjud100', '100 nights of Tahajjud', 'Tahajjud prayed on 100 nights', 'tahajjudNights', 100],
  ['quran', 'read100', '100 ayahs read', 'One hundred ayahs of the Quran read', 'ayahsRead', 100],
  ['quran', 'read1000', '1000 ayahs read', 'One thousand ayahs of the Quran read', 'ayahsRead', 1000],
  ['quran', 'para1', 'First para finished', 'One para of the Quran finished', 'parasDone', 1],
  ['quran', 'para10', '10 paras finished', 'Ten paras of the Quran finished', 'parasDone', 10],
  ['quran', 'khatm', 'The whole Quran', 'Every ayah of the Quran read', 'ayahsRead', 6236],
  ['learn', 'lesson1', 'First lesson', 'Your first lesson finished', 'lessonsDone', 1],
  ['learn', 'qaida', 'Qaida and Tajweed', 'All Noorani Qaida and Tajweed lessons finished', 'lessonsDone', 17],
  ['learn', 'juzamma', 'Juz Amma', 'Al-Fatiha and Juz Amma finished', 'lessonsDone', 55],
  ['dhikr', 'tasbih1000', '1000 dhikr', 'One thousand dhikr counted', 'tasbihTotal', 1000],
  ['dhikr', 'tasbih10000', '10000 dhikr', 'Ten thousand dhikr counted', 'tasbihTotal', 10000],
  ['ramadan', 'fast1', 'First fast', 'Your first Ramadan fast recorded', 'fastsDone', 1],
  ['ramadan', 'fast30', '30 fasts', 'Thirty fasts recorded', 'fastsDone', 30],
  ['ramadan', 'taraweeh10', '10 nights of Taraweeh', 'Taraweeh prayed on 10 nights', 'taraweehNights', 10],
].map(([group, key, title, description, metric, threshold], i) => ({ order: i + 1, group, key, title, description, metric, threshold }));

module.exports = { prayerDefs, hijriEvents, dailyAyahs, duas, paras, dhikrs, badges };
