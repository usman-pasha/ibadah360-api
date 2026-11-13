const crypto = require('crypto');
// Short invite codes people can type or send on WhatsApp. No 0, O, 1, I, L, so they are not mixed up.
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = (n = 6) => Array.from(crypto.randomBytes(n), (b) => LETTERS[b % LETTERS.length]).join('');
const cleanCode = (c) => String(c || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
module.exports = { makeCode, cleanCode };
