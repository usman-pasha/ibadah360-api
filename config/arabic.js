// Arabic letters and signs, written as Unicode so they always display correctly.
const M = { FATHA: '\u064E', KASRA: '\u0650', DAMMA: '\u064F', FATHATAN: '\u064B', KASRATAN: '\u064D', DAMMATAN: '\u064C', SUKOON: '\u0652', SHADDAH: '\u0651', DAGGER: '\u0670', SUBALIF: '\u0656', INVDAMMA: '\u0657' };

// name = how teachers call the letter, sound = how it is written in English letters, place = where it is said from
const LETTERS = [
  { ar: 'ا', name: 'Alif', sound: 'ʾ', place: 'The open space of the mouth and throat' },
  { ar: 'ب', name: 'Ba', sound: 'b', place: 'Both lips' },
  { ar: 'ت', name: 'Ta', sound: 't', place: 'Tip of the tongue and the upper front teeth' },
  { ar: 'ث', name: 'Tha', sound: 'th', place: 'Tip of the tongue and the edge of the upper front teeth' },
  { ar: 'ج', name: 'Jeem', sound: 'j', place: 'Middle of the tongue' },
  { ar: 'ح', name: 'Haa', sound: 'ḥ', place: 'Middle of the throat' },
  { ar: 'خ', name: 'Khaa', sound: 'kh', place: 'Top of the throat' },
  { ar: 'د', name: 'Daal', sound: 'd', place: 'Tip of the tongue and the upper front teeth' },
  { ar: 'ذ', name: 'Zaal', sound: 'dh', place: 'Tip of the tongue and the edge of the upper front teeth' },
  { ar: 'ر', name: 'Ra', sound: 'r', place: 'Tip of the tongue' },
  { ar: 'ز', name: 'Zay', sound: 'z', place: 'Tip of the tongue (whistling sound)' },
  { ar: 'س', name: 'Seen', sound: 's', place: 'Tip of the tongue (whistling sound)' },
  { ar: 'ش', name: 'Sheen', sound: 'sh', place: 'Middle of the tongue' },
  { ar: 'ص', name: 'Suad', sound: 'ṣ', place: 'Tip of the tongue (whistling sound, heavy)' },
  { ar: 'ض', name: 'Duad', sound: 'ḍ', place: 'Side of the tongue (heavy)' },
  { ar: 'ط', name: 'Toa', sound: 'ṭ', place: 'Tip of the tongue (heavy)' },
  { ar: 'ظ', name: 'Zoa', sound: 'ẓ', place: 'Tip of the tongue and the edge of the teeth (heavy)' },
  { ar: 'ع', name: 'Ain', sound: 'ʿ', place: 'Middle of the throat' },
  { ar: 'غ', name: 'Ghain', sound: 'gh', place: 'Top of the throat (heavy)' },
  { ar: 'ف', name: 'Fa', sound: 'f', place: 'Upper front teeth and the inside of the lower lip' },
  { ar: 'ق', name: 'Qaaf', sound: 'q', place: 'Back of the tongue (heavy)' },
  { ar: 'ك', name: 'Kaaf', sound: 'k', place: 'Back of the tongue, a little forward of Qaaf' },
  { ar: 'ل', name: 'Laam', sound: 'l', place: 'Side of the tongue' },
  { ar: 'م', name: 'Meem', sound: 'm', place: 'Both lips (with a nasal sound)' },
  { ar: 'ن', name: 'Noon', sound: 'n', place: 'Tip of the tongue (with a nasal sound)' },
  { ar: 'و', name: 'Waw', sound: 'w', place: 'Both lips, rounded' },
  { ar: 'ه', name: 'Ha', sound: 'h', place: 'Bottom of the throat' },
  { ar: 'ء', name: 'Hamza', sound: 'ʾ', place: 'Bottom of the throat' },
  { ar: 'ي', name: 'Ya', sound: 'y', place: 'Middle of the tongue' },
];

// Alif is a carrier of sound, so syllable practice uses the other 28 letters
const SYL_LETTERS = LETTERS.filter((l) => l.ar !== 'ا');
const VOWELS = [{ mark: M.FATHA, v: 'a' }, { mark: M.KASRA, v: 'i' }, { mark: M.DAMMA, v: 'u' }];
const syllable = (letter, v) => ({ ar: letter.ar + VOWELS[v].mark, tr: letter.sound + VOWELS[v].v });

module.exports = { M, LETTERS, SYL_LETTERS, VOWELS, syllable };
