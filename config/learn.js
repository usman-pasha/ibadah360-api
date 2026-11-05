module.exports = {
  LEVELS: [
    { level: 1, title: 'Noorani Qaida', description: 'The letters, vowel signs and how to join sounds. Start here if you are new.' },
    { level: 2, title: 'Tajweed rules', description: 'Noon and meem rules, madd, qalqalah and where to stop.' },
    { level: 3, title: 'Al-Fatiha and Juz Amma', description: 'Short surahs you use in prayer. Listen, then read them yourself.' },
    { level: 4, title: 'The complete Quran', description: 'Read the whole Quran, para by para.' },
  ],
  QUIZ_SIZE: 5,
  PASS_MARK: 0.8,      // 4 out of 5 right to finish a lesson
  COMPLETE_AT: 0.95,   // a surah or para counts as read when 95% of its ayahs were read
};
