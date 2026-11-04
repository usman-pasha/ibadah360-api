// Quran translations and scripts. Codes are short so they can be MongoDB field names.
module.exports = {
  LANGUAGES: [
    { code: 'en', name: 'English', edition: 'en.sahih', dir: 'ltr' },
    { code: 'ur', name: 'Urdu', edition: 'ur.jalandhry', dir: 'rtl' },
    { code: 'hi', name: 'Hindi', edition: 'hi.hindi', dir: 'ltr' },
    { code: 'bn', name: 'Bengali', edition: 'bn.bengali', dir: 'ltr' },
    { code: 'ta', name: 'Tamil', edition: 'ta.tamil', dir: 'ltr' },
    { code: 'ml', name: 'Malayalam', edition: 'ml.abdulhameed', dir: 'ltr' },
  ],
  SCRIPTS: [
    { code: 'indopak', name: 'Indian style (Indo-Pak script)' },
    { code: 'uthmani', name: 'Madani style (Uthmani script)' },
  ],
  PER_PAGE: 10,
};
