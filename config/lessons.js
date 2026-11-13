// Daily lesson topics. One topic per day, the same for everybody, repeating after the list ends.
// The AI Teacher writes the lesson and 5 questions for the day, and the server saves it so it is written only once per language.
module.exports = {
  LANGUAGES: [
    { code: 'en', name: 'English' }, { code: 'ur', name: 'Urdu' }, { code: 'hi', name: 'Hindi' }, { code: 'kn', name: 'Kannada' },
  ],
  QUESTIONS: 5,
  TOPICS: [
    'The five pillars of Islam', 'The six articles of faith (Iman)', 'How to make wudu step by step', 'The fard acts of wudu and what breaks it',
    'How to pray two rakats of Fajr', 'The names and number of rakats of the five daily prayers', 'What to say in sujood and ruku', 'The meaning of Surah Al-Fatiha',
    'The meaning of Surah Al-Ikhlas', 'The meaning of Surah Al-Falaq and An-Nas', 'The meaning of Ayat al-Kursi (2:255)', 'Makharij: where Arabic letters come from',
    'Tajweed: Noon Saakin and Tanween rules in simple words', 'Tajweed: Madd (stretching) in simple words', 'Tajweed: Qalqalah letters', 'The manners of reciting the Quran',
    'Duas before eating and after eating', 'Duas for entering and leaving the home and the masjid', 'Morning and evening adhkar basics', 'The adhan and iqamah',
    'Friday (Jumuah) prayer and its etiquette', 'Zakat: who must give and the basic idea of nisab', 'Fasting in Ramadan: basics and what breaks the fast', 'The night of Qadr and last ten nights',
    'Hajj and Umrah in simple steps', 'The life of Prophet Muhammad (peace be upon him): early life', 'The Hijrah to Madinah', 'The Prophets Adam and Nuh (peace be upon them)',
    'Prophet Ibrahim and Prophet Ismail (peace be upon them)', 'Prophet Yusuf (peace be upon him)', 'Prophet Musa (peace be upon him) in brief', 'Prophet Isa (peace be upon him) in the Quran',
    'Good manners (akhlaq) towards parents', 'Honesty and keeping promises in Islam', 'Kindness to neighbours and the poor', 'Patience (sabr) and gratitude (shukr)',
    'Tawbah: repentance and seeking forgiveness', 'Islamic etiquette of greeting (salam)', 'The Islamic months and the Hijri calendar', 'Eid ul-Fitr and Eid ul-Adha: what we do',
    'The Angels in Islam', 'The Day of Judgement in brief', 'The meaning of Tawheed', 'Why we pray facing the Qiblah',
  ],
};
