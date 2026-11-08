const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const Record = require('../models/ZakatRecord');
const { NISAB_GOLD_G, NISAB_SILVER_G, RATE } = require('../config/zakat');

const FIELDS = ['goldGrams', 'silverGrams', 'goldPrice', 'silverPrice', 'cash', 'bank', 'investments', 'business', 'receivables', 'other', 'debts'];
const money = (n) => Math.round(n * 100) / 100;
const bad = (res, message) => res.status(400).json({ message });

router.get('/', auth, safe(async (req, res) => {
  const list = await Record.find({ user: req.userId }).sort({ createdAt: -1 }).limit(10).lean();
  res.json({ constants: { nisabGoldGrams: NISAB_GOLD_G, nisabSilverGrams: NISAB_SILVER_G, rate: RATE }, last: list[0] ? list[0].inputs : null, history: list.map((r) => ({ at: r.createdAt, zakat: r.result.zakat, net: r.result.net, eligible: r.result.eligible })) });
}));

// All amounts in rupees, gold and silver in grams, prices in rupees per gram
router.post('/calculate', auth, safe(async (req, res) => {
  const i = {};
  for (const f of FIELDS) {
    const v = req.body[f] === undefined || req.body[f] === '' ? 0 : Number(req.body[f]);
    if (!Number.isFinite(v) || v < 0 || v > 1e12) return bad(res, `Enter a valid number for ${f}`);
    i[f] = v;
  }
  i.nisabBasis = req.body.nisabBasis === 'gold' ? 'gold' : 'silver';
  const price = i.nisabBasis === 'gold' ? i.goldPrice : i.silverPrice;
  if (!(price > 0)) return bad(res, `Enter today's price per gram of ${i.nisabBasis} to find the nisab`);
  if (i.goldGrams && !(i.goldPrice > 0)) return bad(res, 'Enter the price per gram of gold');
  if (i.silverGrams && !(i.silverPrice > 0)) return bad(res, 'Enter the price per gram of silver');

  const gold = i.goldGrams * i.goldPrice;
  const silver = i.silverGrams * i.silverPrice;
  const assets = gold + silver + i.cash + i.bank + i.investments + i.business + i.receivables + i.other;
  const net = Math.max(0, assets - i.debts);
  const grams = i.nisabBasis === 'gold' ? NISAB_GOLD_G : NISAB_SILVER_G;
  const nisab = grams * price;
  const eligible = net >= nisab;
  const result = {
    breakdown: [['Gold', gold], ['Silver', silver], ['Cash in hand', i.cash], ['Money in bank', i.bank], ['Investments and shares', i.investments], ['Business stock', i.business], ['Money others owe you', i.receivables], ['Other savings', i.other]].map(([label, value]) => ({ label, value: money(value) })),
    assets: money(assets), debts: money(i.debts), net: money(net),
    nisab: { basis: i.nisabBasis, grams, pricePerGram: price, value: money(nisab) },
    rate: RATE, eligible, zakat: eligible ? money(net * RATE) : 0,
  };
  await Record.create({ user: req.userId, inputs: i, result });
  res.json(result);
}));

module.exports = router;
