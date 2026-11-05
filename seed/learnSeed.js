// The learning path: Noorani Qaida (level 1), Tajweed rules (level 2), Al-Fatiha and Juz Amma (level 3), complete Quran by para (level 4).
// Practice drills are built from Unicode letters and signs, so every example is exactly right.
const { M, LETTERS, SYL_LETTERS, VOWELS, syllable } = require('../config/arabic');
const { paras } = require('./contentSeed');

const row = (fn, letters = SYL_LETTERS) => letters.map((l) => fn(l));
const cell = (ar, tr, note) => ({ ar, tr, note });
const three = (l, build) => {
  const parts = VOWELS.map((x, i) => build(l, x, i));
  return cell(parts.map((p) => p.ar).join('  '), parts.map((p) => p.tr).join('  '));
};

const quiz = (q, answer, ...others) => ({ q, answer, options: [answer, ...others] });

const level1 = [
  { title: 'The letters (Huroof Mufradat)', summary: 'Learn the 29 Arabic letters, their names and where each one is said from.',
    body: [
      { title: 'Reading direction', text: 'Arabic is read from right to left. The Noorani Qaida teaches 29 letters.' },
      { title: 'Name and place', text: 'Learn the name of each letter and where it is said from: the throat, the tongue, the lips or the nose. Say each one slowly, three times, after your teacher or after the recitation.' },
      { title: 'How to practise', text: 'Look at the letter, say its name, then check the small English spelling below it. Then take the quiz.' },
    ],
    drills: LETTERS.map((l) => cell(l.ar, l.name, l.place)), quizKind: 'letters' },
  { title: 'Joined letters (Huroof Murakkabat)', summary: 'Letters join together to make words. Six letters never join to the letter after them.',
    body: [
      { title: 'Four shapes', text: 'A letter that joins can look different alone, at the start, in the middle and at the end of a word.' },
      { title: 'The six that do not join forward', text: 'ا  د  ذ  ر  ز  و  join to the letter before them, but never to the letter after them. A gap is left after them.' },
      { title: 'Practise', text: 'Read the letters one by one, then say the whole group. Look at how the shapes change.' },
    ],
    drills: [cell('بتث', 'ba ta tha'), cell('جحخ', 'jeem haa khaa'), cell('سشص', 'seen sheen suad'), cell('ضطظ', 'duad toa zoa'), cell('عغف', 'ain ghain fa'), cell('قكل', 'qaaf kaaf laam'), cell('من', 'meem noon'), cell('هي', 'ha ya'), cell('ادذرزو', 'alif daal zaal ra zay waw', 'These six do not join to the next letter'), cell('كتب', 'kaaf ta ba'), cell('بيت', 'ba ya ta'), cell('نور', 'noon waw ra')],
    quiz: [
      quiz('Which letters do NOT join to the letter after them?', 'ا د ذ ر ز و', 'ب ت ث ن ي', 'ج ح خ', 'م ن ه'),
      quiz('How many shapes can a joining letter take?', 'Four: alone, start, middle, end', 'Two', 'Three', 'Five'),
      quiz('In which direction is Arabic read?', 'Right to left', 'Left to right', 'Top to bottom', 'Either way'),
      quiz('How many letters does the Noorani Qaida teach?', '29', '26', '28', '30'),
      quiz('Which of these letters joins on both sides?', 'ب', 'ا', 'د', 'و'),
      quiz('Does Alif (ا) join to the letter after it?', 'No', 'Yes', 'Only at the start of a word', 'Only at the end of a word'),
    ] },
  { title: 'Vowel signs (Harakat)', summary: 'Fatha, kasra and damma give each letter its sound.',
    body: [
      { title: 'Fatha', text: 'A small line above the letter. It gives the sound "a", as in ba.' },
      { title: 'Kasra', text: 'A small line below the letter. It gives the sound "i", as in bi.' },
      { title: 'Damma', text: 'A small curl above the letter. It gives the sound "u", as in bu.' },
      { title: 'Practise', text: 'Read each row from right to left: fatha, kasra, damma. Keep each sound short, about one count.' },
    ],
    drills: row((l) => three(l, (x, v, i) => syllable(x, i))), quizKind: 'syllables' },
  { title: 'Double vowels (Tanween)', summary: 'Two fathas, two kasras or two dammas add an "n" sound at the end of a word.',
    body: [
      { title: 'Three kinds', text: 'Fathatan sounds like "an", kasratan like "in" and dammatan like "un".' },
      { title: 'Only at the end', text: 'Tanween comes only at the end of a word. The "n" sound is added, but the letter noon is not written.' },
    ],
    drills: row((l) => cell([M.FATHATAN, M.KASRATAN, M.DAMMATAN].map((m) => l.ar + m).join('  '), [l.sound + 'an', l.sound + 'in', l.sound + 'un'].join('  '))),
    quiz: [
      quiz('What sound does tanween add at the end of a word?', 'An "n" sound', 'An "m" sound', 'A long "aa" sound', 'No sound'),
      quiz('Fathatan sounds like:', 'an', 'in', 'un', 'a'),
      quiz('Kasratan sounds like:', 'in', 'an', 'un', 'i'),
      quiz('Dammatan sounds like:', 'un', 'an', 'in', 'u'),
      quiz('Where does tanween come?', 'Only at the end of a word', 'At the start of a word', 'In the middle of a word', 'Anywhere'),
      quiz('Tanween is made of:', 'Two fathas, two kasras or two dammas', 'One fatha only', 'A sukoon', 'A shaddah'),
    ] },
  { title: 'Standing vowels (Khari Harakat)', summary: 'Standing fatha, standing kasra and inverted damma give a long sound.',
    body: [
      { title: 'Standing fatha', text: 'A small upright line above the letter. It is read as a long "aa".' },
      { title: 'Standing kasra', text: 'A small upright line below the letter. It is read as a long "ee".' },
      { title: 'Inverted damma', text: 'A small turned damma above the letter. It is read as a long "oo".' },
      { title: 'Length', text: 'These sounds are held for two counts.' },
    ],
    drills: row((l) => cell([M.DAGGER, M.SUBALIF, M.INVDAMMA].map((m) => l.ar + m).join('  '), [l.sound + 'aa', l.sound + 'ee', l.sound + 'oo'].join('  '))),
    quiz: [
      quiz('A standing fatha is read as:', 'A long "aa"', 'A short "a"', 'A long "ee"', 'A long "oo"'),
      quiz('A standing kasra is read as:', 'A long "ee"', 'A long "aa"', 'A short "i"', 'A long "oo"'),
      quiz('An inverted damma is read as:', 'A long "oo"', 'A long "ee"', 'A short "u"', 'A long "aa"'),
      quiz('How long are these vowels held?', 'Two counts', 'One count', 'Four counts', 'Six counts'),
      quiz('A standing fatha looks like:', 'A small upright line above the letter', 'A small line below the letter', 'A small circle', 'Two small lines'),
    ] },
  { title: 'Long sounds (Huroof Madd)', summary: 'Alif, Waw and Ya stretch the vowel before them for two counts.',
    body: [
      { title: 'The three madd letters', text: 'Alif after a fatha, Waw (with sukoon) after a damma, and Ya (with sukoon) after a kasra.' },
      { title: 'Natural length', text: 'This is the natural madd. Hold the sound for two counts, no more and no less.' },
    ],
    drills: row((l) => cell([l.ar + M.FATHA + 'ا', l.ar + M.KASRA + 'ي', l.ar + M.DAMMA + 'و'].join('  '), [l.sound + 'aa', l.sound + 'ee', l.sound + 'oo'].join('  '))),
    quiz: [
      quiz('Which letters are the madd letters?', 'Alif, Waw and Ya', 'Ba, Ta and Tha', 'Meem and Noon', 'Ha and Hamza'),
      quiz('Alif madd comes after a letter with:', 'Fatha', 'Kasra', 'Damma', 'Sukoon'),
      quiz('Waw madd comes after a letter with:', 'Damma', 'Fatha', 'Kasra', 'Shaddah'),
      quiz('Ya madd comes after a letter with:', 'Kasra', 'Fatha', 'Damma', 'Sukoon'),
      quiz('The natural madd is held for:', 'Two counts', 'One count', 'Four counts', 'Six counts'),
      quiz('How is بَا read?', 'baa', 'ba', 'bi', 'bu'),
    ] },
  { title: 'Soft sounds (Leen)', summary: 'A silent Waw or Ya after a fatha is read softly.',
    body: [
      { title: 'What is leen?', text: 'Leen means soft. When a Waw or a Ya has a sukoon and the letter before it has a fatha, read it softly, like "aw" in "how" or "ay" in "day".' },
      { title: 'Not stretched', text: 'Leen is not a long sound like madd. Say it lightly and move on.' },
    ],
    drills: row((l) => cell([l.ar + M.FATHA + 'و' + M.SUKOON, l.ar + M.FATHA + 'ي' + M.SUKOON].join('  '), [l.sound + 'aw', l.sound + 'ay'].join('  '))),
    quiz: [
      quiz('Leen letters are:', 'Waw or Ya with sukoon after a fatha', 'Alif after a fatha', 'Noon with sukoon', 'Meem with shaddah'),
      quiz('How is بَوْ read?', 'baw', 'baa', 'boo', 'bu'),
      quiz('How is بَيْ read?', 'bay', 'bee', 'baa', 'bi'),
      quiz('Is leen stretched like madd?', 'No, it is read softly', 'Yes, for two counts', 'Yes, for four counts', 'Yes, for six counts'),
      quiz('Before a leen letter there must be a:', 'Fatha', 'Kasra', 'Damma', 'Shaddah'),
    ] },
  { title: 'Silent letters (Sukoon)', summary: 'Sukoon means the letter has no vowel. It joins to the sound before it.',
    body: [
      { title: 'The sign', text: 'Sukoon is a small circle above the letter. The letter is read without a vowel.' },
      { title: 'Joining sounds', text: 'A letter with sukoon is joined to the vowel before it. أَبْ is read "ab" in one breath, not "a" and "ba".' },
      { title: 'Never at the start', text: 'A word never begins with a letter that has sukoon.' },
    ],
    drills: row((l) => cell([M.FATHA, M.KASRA, M.DAMMA].map((m, i) => ['أ', 'إ', 'أ'][i] + m + l.ar + M.SUKOON).join('  '), ['a', 'i', 'u'].map((v) => v + l.sound).join('  '))),
    quiz: [
      quiz('Sukoon means the letter is:', 'Silent, with no vowel', 'Doubled', 'Stretched', 'Nasal'),
      quiz('Sukoon looks like:', 'A small circle above the letter', 'A small line above the letter', 'A small curl above the letter', 'Two lines'),
      quiz('How is أَبْ read?', 'ab', 'aba', 'bab', 'ba'),
      quiz('A letter with sukoon is read:', 'Joined with the vowel before it', 'On its own, slowly', 'With a fatha', 'With a damma'),
      quiz('Can a word begin with a letter that has sukoon?', 'No', 'Yes', 'Only Ba', 'Only Noon'),
    ] },
  { title: 'Doubled letters (Shaddah)', summary: 'A shaddah doubles the letter: the first part is silent, the second has the vowel.',
    body: [
      { title: 'The sign', text: 'Shaddah looks like a small "w" above the letter.' },
      { title: 'How to read it', text: 'A letter with shaddah is two letters in one. The first is silent and joins the sound before it, the second carries the vowel. بَّ is read "bba".' },
      { title: 'Press the sound', text: 'Press the letter firmly when you say it. Do not rush through it.' },
    ],
    drills: row((l) => cell(VOWELS.map((x) => l.ar + M.SHADDAH + x.mark).join('  '), VOWELS.map((x) => l.sound + l.sound + x.v).join('  '))),
    quiz: [
      quiz('Shaddah means the letter is:', 'Doubled', 'Silent', 'Stretched', 'Soft'),
      quiz('Shaddah looks like:', 'A small "w" above the letter', 'A small circle', 'A small line', 'A small dot'),
      quiz('How is بَّ read?', 'bba', 'ba', 'baa', 'bab'),
      quiz('A letter with shaddah is:', 'Two letters: the first silent, the second with the vowel', 'Two letters, both with vowels', 'One short letter', 'A long vowel'),
      quiz('How should a shaddah letter be said?', 'Pressed firmly, not rushed', 'Very softly', 'Stretched for four counts', 'Skipped'),
    ] },
];

const level2 = [
  { title: 'Noon Sakin and Tanween', summary: 'Four rules: Izhar, Idgham, Iqlab and Ikhfa.',
    body: [
      { title: 'Izhar (clear)', text: 'Say the noon clearly when it is followed by a throat letter: ء ه ع ح غ خ.' },
      { title: 'Idgham (merging)', text: 'The noon merges into the next letter when it is followed by one of ي ر م ل و ن (the word "Yarmaloon"). With ghunna for ي ن م و ("Yanmu"). Without ghunna for ل and ر.' },
      { title: 'Iqlab (changing)', text: 'Before the letter ب the noon changes into a meem, said with ghunna.' },
      { title: 'Ikhfa (hiding)', text: 'The noon is hidden, with ghunna, before the other 15 letters: ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك.' },
      { title: 'Ghunna', text: 'Ghunna is a nasal sound held for two counts.' },
    ],
    drills: [cell('مِنْ هَادٍ', 'min haadin', 'Izhar: noon before a throat letter'), cell('سَمِيعٌ عَلِيمٌ', 'samee‘un ‘aleem', 'Izhar with tanween'), cell('مَنْ يَقُولُ', 'may-yaqoolu', 'Idgham with ghunna'), cell('مِنْ رَبِّهِمْ', 'mir-rabbihim', 'Idgham without ghunna'), cell('غَفُورٌ رَحِيمٌ', 'ghafoor-rraheem', 'Idgham without ghunna with tanween'), cell('مِنْ بَعْدِ', 'mim-ba‘di', 'Iqlab: noon becomes meem'), cell('مِنْ قَبْلُ', 'min qablu', 'Ikhfa: noon is hidden')],
    quiz: [
      quiz('How many rules do Noon Sakin and Tanween have?', 'Four', 'Two', 'Three', 'Five'),
      quiz('Which are the Izhar letters?', 'ء ه ع ح غ خ', 'ي ر م ل و ن', 'ب', 'ت ث ج د ذ'),
      quiz('Iqlab happens before which letter?', 'ب', 'م', 'ن', 'ر'),
      quiz('How many Ikhfa letters are there?', '15', '6', '4', '10'),
      quiz('The Idgham letters are gathered in the word:', 'يرملون (Yarmaloon)', 'قطب جد', 'خص ضغط قظ', 'ءهعحغخ'),
      quiz('Idgham with ghunna letters are:', 'ي ن م و', 'ل ر', 'ب', 'ء ه'),
      quiz('Idgham without ghunna letters are:', 'ل ر', 'ي ن م و', 'ب', 'ع غ'),
      quiz('In Iqlab the noon sound changes into:', 'Meem', 'Laam', 'Raa', 'Yaa'),
      quiz('Ghunna is held for:', 'Two counts', 'One count', 'Four counts', 'Six counts'),
    ] },
  { title: 'Meem Sakin', summary: 'Three rules for a meem with sukoon: Ikhfa Shafawi, Idgham Shafawi and Izhar Shafawi.',
    body: [
      { title: 'Ikhfa Shafawi', text: 'Meem sakin followed by ب: the meem is hidden lightly, with ghunna, on the lips.' },
      { title: 'Idgham Shafawi', text: 'Meem sakin followed by another م: the two meems merge into one, with ghunna.' },
      { title: 'Izhar Shafawi', text: 'Meem sakin followed by any other letter: say the meem clearly. Take extra care before و and ف so the meem is not hidden.' },
      { title: 'Shafawi', text: 'Shafawi means "of the lips", because all three rules are made on the lips.' },
    ],
    drills: [cell('تَرْمِيهِمْ بِحِجَارَةٍ', 'tarmeehim bihijaaratin', 'Ikhfa Shafawi'), cell('لَهُمْ مَا', 'lahum-maa', 'Idgham Shafawi'), cell('هُمْ فِيهَا', 'hum feehaa', 'Izhar Shafawi')],
    quiz: [
      quiz('How many rules does Meem Sakin have?', 'Three', 'Two', 'Four', 'Five'),
      quiz('Ikhfa Shafawi happens when meem sakin is followed by:', 'ب', 'م', 'ف', 'ن'),
      quiz('Idgham Shafawi happens when meem sakin is followed by:', 'م', 'ب', 'ل', 'و'),
      quiz('Izhar Shafawi happens before:', 'All other letters', 'Only ب', 'Only م', 'Only throat letters'),
      quiz('Special care is needed in Izhar Shafawi before:', 'و and ف', 'ب and م', 'ر and ل', 'ع and غ'),
      quiz('Shafawi means:', 'Of the lips', 'Of the nose', 'Of the throat', 'Of the tongue'),
    ] },
  { title: 'Ghunna (the nasal sound)', summary: 'Noon and Meem with a shaddah always carry a two count nasal sound.',
    body: [
      { title: 'What is ghunna?', text: 'Ghunna is a soft sound that comes through the nose. It is part of noon and meem.' },
      { title: 'Strongest cases', text: 'It is fullest when noon or meem has a shaddah, as in إِنَّ and ثُمَّ. Hold the ghunna for two counts.' },
    ],
    drills: [cell('إِنَّ', 'inna', 'Noon with shaddah'), cell('ثُمَّ', 'thumma', 'Meem with shaddah'), cell('أَنَّ', 'anna'), cell('لَمَّا', 'lammaa')],
    quiz: [
      quiz('Ghunna is a sound that comes from:', 'The nose', 'The throat', 'The lips only', 'The tip of the tongue'),
      quiz('Which letters carry ghunna?', 'Noon and Meem', 'Ba and Ta', 'Ra and Laam', 'Ha and Hamza'),
      quiz('Noon or Meem with shaddah has ghunna for:', 'Two counts', 'One count', 'Four counts', 'None'),
      quiz('How is إِنَّ read?', 'inna with ghunna', 'ina without ghunna', 'in', 'inaa'),
      quiz('The letters of Idgham with ghunna are gathered in:', 'ينمو (Yanmu)', 'يرملون (Yarmaloon)', 'قطب جد', 'خص ضغط قظ'),
      quiz('Are Ikhfa and Iqlab said with ghunna?', 'Yes, both', 'No, neither', 'Only Ikhfa', 'Only Iqlab'),
    ] },
  { title: 'The Laam: Al and Allah', summary: 'The laam of "Al" can be silent or clear. The laam of Allah can be heavy or light.',
    body: [
      { title: 'Sun letters (Shamsi)', text: 'Before these 14 letters the laam of "Al" is not said, and the next letter is doubled: ت ث د ذ ر ز س ش ص ض ط ظ ل ن. Example: الشَّمْسُ (ash-shams).' },
      { title: 'Moon letters (Qamari)', text: 'Before these 14 letters the laam is said clearly: ا ب ج ح خ ع غ ف ق ك م ه و ي. Example: الْقَمَرُ (al-qamar).' },
      { title: 'The laam of Allah', text: 'After a fatha or damma the laam of Allah is heavy: قَالَ اللَّهُ. After a kasra it is light: بِسْمِ اللَّهِ.' },
    ],
    drills: [cell('الشَّمْسُ', 'ash-shams', 'Sun letter: laam is silent'), cell('الْقَمَرُ', 'al-qamar', 'Moon letter: laam is clear'), cell('قَالَ اللَّهُ', 'qaala llaahu', 'Heavy laam after fatha'), cell('بِسْمِ اللَّهِ', 'bismi llaahi', 'Light laam after kasra')],
    quiz: [
      quiz('Before a sun letter the laam of "Al" is:', 'Not said', 'Said clearly', 'Stretched', 'Doubled with a noon'),
      quiz('How many sun letters are there?', '14', '10', '29', '7'),
      quiz('Before a moon letter the laam is:', 'Said clearly', 'Not said', 'Heavy', 'Nasal'),
      quiz('Which of these is a sun letter?', 'ش', 'ب', 'ك', 'م'),
      quiz('Which of these is a moon letter?', 'ب', 'ت', 'ث', 'س'),
      quiz('The laam of Allah is heavy after:', 'Fatha or damma', 'Kasra', 'Sukoon', 'Tanween'),
      quiz('The laam of Allah is light after:', 'Kasra', 'Fatha', 'Damma', 'Shaddah'),
    ] },
  { title: 'Heavy and light letters', summary: 'Seven letters are always heavy. The letter Ra is sometimes heavy and sometimes light.',
    body: [
      { title: 'The seven heavy letters', text: 'خ ص ض غ ط ق ظ are gathered in the words "Khusa daghtin qiz". They are said with a full, thick sound and the tongue raised.' },
      { title: 'Light letters', text: 'All other letters are light. Say them with a thin sound.' },
      { title: 'The letter Ra', text: 'Ra is heavy with a fatha or damma, as in رَبِّ and رُسُلٌ. Ra is light with a kasra, as in رِزْقٌ.' },
    ],
    drills: [cell('خ', 'khaa', 'Heavy'), cell('ص', 'suad', 'Heavy'), cell('ض', 'duad', 'Heavy'), cell('غ', 'ghain', 'Heavy'), cell('ط', 'toa', 'Heavy'), cell('ق', 'qaaf', 'Heavy'), cell('ظ', 'zoa', 'Heavy'), cell('رَبِّ', 'rabbi', 'Heavy Ra'), cell('رُسُلٌ', 'rusulun', 'Heavy Ra'), cell('رِزْقٌ', 'rizqun', 'Light Ra')],
    quiz: [
      quiz('How many letters are always heavy?', 'Seven', 'Five', 'Ten', 'Fourteen'),
      quiz('The heavy letters are gathered in:', 'خص ضغط قظ', 'يرملون', 'قطب جد', 'ءهعحغخ'),
      quiz('Which of these is a heavy letter?', 'ص', 'ب', 'ت', 'س'),
      quiz('Ra is heavy when it has:', 'Fatha or damma', 'Kasra', 'A light sound always', 'Tanween only'),
      quiz('Ra is light when it has:', 'Kasra', 'Fatha', 'Damma', 'Shaddah'),
      quiz('Heavy letters are said with:', 'A full, thick sound', 'A thin sound', 'A nasal sound', 'A whisper'),
    ] },
  { title: 'Types of Madd', summary: 'Madd means stretching. Natural madd is two counts. Other kinds are longer.',
    body: [
      { title: 'Madd Asli (natural)', text: 'A madd letter with nothing after it that makes it longer. Hold it for two counts.' },
      { title: 'Madd Muttasil', text: 'A madd letter followed by a hamza in the same word, as in جَاءَ. Hold it for four to five counts.' },
      { title: 'Madd Munfasil', text: 'A madd letter at the end of one word and a hamza at the start of the next, as in بِمَا أُنْزِلَ. Hold it longer than natural.' },
      { title: 'Madd Lazim', text: 'A madd letter followed by a letter with sukoon or shaddah in the same word, as in الضَّالِّينَ. Hold it for six counts.' },
      { title: 'Madd Arid lis-Sukoon', text: 'A madd letter before the last letter of a word when you stop on that word, as in نَسْتَعِينُ. Hold it two, four or six counts.' },
    ],
    drills: [cell('قَالَ', 'qaala', 'Natural madd: 2 counts'), cell('جَاءَ', 'jaa-a', 'Madd Muttasil'), cell('بِمَا أُنْزِلَ', 'bimaa unzila', 'Madd Munfasil'), cell('الضَّالِّينَ', 'ad-daaalleen', 'Madd Lazim: 6 counts'), cell('نَسْتَعِينُ', 'nasta‘een', 'Madd Arid when stopping')],
    quiz: [
      quiz('Natural madd is held for:', 'Two counts', 'One count', 'Four counts', 'Six counts'),
      quiz('In Madd Muttasil the madd letter and hamza are:', 'In the same word', 'In different words', 'Far apart', 'Never together'),
      quiz('In Madd Munfasil the madd letter and hamza are:', 'In different words', 'In the same word', 'In the same letter', 'Never together'),
      quiz('Madd Lazim is held for:', 'Six counts', 'Two counts', 'One count', 'Three counts'),
      quiz('Madd Muttasil is held for:', 'Four to five counts', 'One count', 'Six counts only', 'Zero counts'),
      quiz('Madd Arid lis-Sukoon happens:', 'When you stop at the end of a word', 'At the start of a word', 'Only in the middle', 'Only with tanween'),
    ] },
  { title: 'Qalqalah (the echo)', summary: 'Five letters make an echo sound when they have a sukoon.',
    body: [
      { title: 'The letters', text: 'ق ط ب ج د, gathered in "Qutb Jad".' },
      { title: 'How to read', text: 'When one of these letters has a sukoon, release it with a small echo or bounce. Do not add a vowel.' },
      { title: 'Stronger at the end', text: 'The echo is stronger when you stop on the letter at the end of a word.' },
    ],
    drills: [cell('أَحَدْ', 'ahad', 'Strong qalqalah when stopping'), cell('يَجْعَلُ', 'yaj‘alu', 'Qalqalah in the middle of a word'), cell('الْفَلَقْ', 'al-falaq', 'Strong qalqalah when stopping'), cell('قَدْ', 'qad')],
    quiz: [
      quiz('The qalqalah letters are:', 'ق ط ب ج د', 'ي ر م ل و ن', 'خ ص ض غ ط ق ظ', 'ء ه ع ح غ خ'),
      quiz('Qalqalah means:', 'An echo or bounce sound', 'A nasal sound', 'A long stretch', 'A silent letter'),
      quiz('Qalqalah happens when the letter has:', 'Sukoon', 'Fatha', 'Kasra', 'Tanween'),
      quiz('The echo is stronger:', 'When stopping at the end of a word', 'At the start of a word', 'Never', 'Only with shaddah'),
      quiz('The letters of qalqalah are gathered in:', 'قطب جد (Qutb Jad)', 'يرملون (Yarmaloon)', 'خص ضغط قظ', 'ينمو (Yanmu)'),
    ] },
  { title: 'Stopping marks (Waqf)', summary: 'Small signs tell you where to stop, where you may stop and where not to.',
    body: [
      { title: 'م  (Lazim)', text: 'You must stop here.' },
      { title: 'ط  (Mutlaq)', text: 'It is good to stop here.' },
      { title: 'ج  (Jaiz)', text: 'You may stop or continue.' },
      { title: 'ز  (Mujawwaz)', text: 'You may stop, but continuing is better.' },
      { title: 'ص  (Murakhkhas)', text: 'Continue. Stop only if you are out of breath.' },
      { title: 'لا  (La)', text: 'Do not stop here.' },
      { title: 'When you stop', text: 'When you stop on a word, read its last letter as if it has a sukoon. Take a breath, then start again from a place where the meaning is clear.' },
    ],
    drills: [cell('م', 'Lazim', 'Must stop'), cell('ط', 'Mutlaq', 'Good to stop'), cell('ج', 'Jaiz', 'May stop or continue'), cell('ز', 'Mujawwaz', 'Continuing is better'), cell('ص', 'Murakhkhas', 'Continue, stop only if needed'), cell('لا', 'La', 'Do not stop')],
    quiz: [
      quiz('The sign م means:', 'You must stop', 'Do not stop', 'You may stop or continue', 'Stretch the sound'),
      quiz('The sign لا means:', 'Do not stop', 'You must stop', 'Stop and breathe', 'Repeat'),
      quiz('The sign ج means:', 'You may stop or continue', 'You must stop', 'Do not stop', 'Read loudly'),
      quiz('The sign ط means:', 'It is good to stop', 'Do not stop', 'Stretch the sound', 'Skip the word'),
      quiz('The sign ز means:', 'Continuing is better', 'You must stop', 'Never stop', 'Stop twice'),
      quiz('Why do we learn the stopping marks?', 'To stop where the meaning stays correct', 'To read faster', 'To read louder', 'To skip words'),
    ] },
];

const juzAmma = [
  [1, 'Al-Fatiha'], [114, 'An-Nas'], [113, 'Al-Falaq'], [112, 'Al-Ikhlas'], [111, 'Al-Masad'], [110, 'An-Nasr'], [109, 'Al-Kafirun'], [108, 'Al-Kawthar'], [107, "Al-Ma'un"], [106, 'Quraysh'],
  [105, 'Al-Fil'], [104, 'Al-Humazah'], [103, 'Al-Asr'], [102, 'At-Takathur'], [101, "Al-Qari'ah"], [100, "Al-'Adiyat"], [99, 'Az-Zalzalah'], [98, 'Al-Bayyinah'], [97, 'Al-Qadr'], [96, "Al-'Alaq"],
  [95, 'At-Tin'], [94, 'Ash-Sharh'], [93, 'Ad-Duha'], [92, 'Al-Layl'], [91, 'Ash-Shams'], [90, 'Al-Balad'], [89, 'Al-Fajr'], [88, 'Al-Ghashiyah'], [87, "Al-A'la"], [86, 'At-Tariq'],
  [85, 'Al-Buruj'], [84, 'Al-Inshiqaq'], [83, 'Al-Mutaffifin'], [82, 'Al-Infitar'], [81, 'At-Takwir'], [80, "'Abasa"], [79, "An-Nazi'at"], [78, 'An-Naba'],
];

const lessons = [];
level1.forEach((l, i) => lessons.push({ key: `qaida-${i + 1}`, level: 1, order: i + 1, ...l }));
level2.forEach((l, i) => lessons.push({ key: `tajweed-${i + 1}`, level: 2, order: i + 1, ...l }));
juzAmma.forEach(([n, name], i) => lessons.push({
  key: `surah-${n}`, level: 3, order: i + 1, surah: n, title: `Surah ${name} (${n})`,
  summary: 'Listen to the recitation, then read the surah yourself. It is finished when you have read it.',
  body: [{ title: 'How to learn it', text: 'Open the surah in the Quran reader. Press Play to hear a reciter, one ayah at a time. Then read it again yourself, slowly, using what you learned in the Qaida and Tajweed lessons.' }],
}));
paras.forEach((p, i) => lessons.push({
  key: `para-${p.number}`, level: 4, order: i + 1, para: p.number, title: `Para ${p.number} · ${p.name}`,
  summary: 'Read this para from the first ayah to the last. Your reading is counted automatically.',
  body: [{ title: 'How to read it', text: 'Open the para in the Quran reader and read page by page. You can listen with a reciter first. The reader remembers where you stopped.' }],
}));

module.exports = { lessons };
