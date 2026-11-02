// Ayah references (surah:ayah). The text is fetched from alquran.cloud, so it is always exact.
const AYAH_REFS = ['2:255', '94:5', '13:28', '65:3', '2:286', '3:139', '39:53', '2:153', '2:186', '17:79', '51:18', '29:45', '2:152', '55:13'];

// Shown only if the internet fetch fails. English is a short plain meaning, not a formal translation.
const FALLBACK_AYAH = [
  { ref: 'Surah Ash-Sharh 94:5-6', ar: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', en: 'Indeed, with hardship comes ease. Indeed, with hardship comes ease.' },
  { ref: 'Surah Al-Ikhlas 112', ar: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ ۝ ٱللَّهُ ٱلصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', en: 'Say: He is Allah, the One. Allah, the Self-Sufficient. He has no child and was not born, and there is none equal to Him.' },
];

const DUAS = [
  { cat: 'Daily', title: 'When you wake up', src: 'Sahih al-Bukhari', ar: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ ٱلنُّشُورُ', tr: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur.", en: 'All praise is for Allah who gave us life after causing us to die, and to Him is the return.' },
  { cat: 'Daily', title: 'Before sleeping', src: 'Sahih al-Bukhari', ar: 'بِٱسْمِكَ ٱللَّهُمَّ أَمُوتُ وَأَحْيَا', tr: 'Bismika Allahumma amutu wa ahya.', en: 'In Your name, O Allah, I die and I live.' },
  { cat: 'Daily', title: 'Before eating', src: 'Abu Dawud, Tirmidhi', ar: 'بِسْمِ ٱللَّهِ', tr: 'Bismillah.', en: 'In the name of Allah.' },
  { cat: 'Daily', title: 'After eating', src: 'Abu Dawud, Tirmidhi', ar: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', tr: "Alhamdu lillahil-ladhi at'amana wa saqana wa ja'alana muslimin.", en: 'Praise be to Allah who fed us, gave us drink and made us Muslims.' },
  { cat: 'Daily', title: 'Leaving home', src: 'Abu Dawud, Tirmidhi', ar: 'بِسْمِ ٱللَّهِ تَوَكَّلْتُ عَلَى ٱللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ', tr: "Bismillahi tawakkaltu 'alallahi wa la hawla wa la quwwata illa billah.", en: 'In Allah\'s name. I rely on Allah. There is no power or strength except with Allah.' },
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
];
