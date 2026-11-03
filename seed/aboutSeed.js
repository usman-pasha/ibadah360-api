// Default About us data. Replace the team and contact placeholders with your real details,
// then run:  npm run seed:about
module.exports = {
  key: 'main',
  appName: 'Ibadah360',
  version: '3.0',
  tagline: 'Your daily ibadah, in one place',
  about:
    'Ibadah360 helps you keep your five daily prayers, qaza, Tahajjud and other voluntary prayers, read the Quran, learn daily duas and follow the Islamic calendar. It is built for Muslims in India, with prayer times for your city and the Hanafi Asr time by default.',
  features: [
    'Track the five daily prayers, with on-time and qaza marks',
    'Voluntary prayers: Ishraq, Duha, Awwabin, Witr and Tahajjud',
    'Prayer times for your city, Hanafi Asr by default',
    'Islamic calendar with Eid and other important dates',
    'Full Quran in Indian style script with Urdu, Hindi and more translations',
    'Ayah of the day and a library of daily duas',
  ],
  team: [
    { name: 'Your Name', role: 'Full-stack developer', email: 'you@example.com', phone: '+91 00000 00000' },
    { name: 'Teammate Name', role: 'UI designer', email: 'teammate@example.com', phone: '+91 00000 00000' },
  ],
  contact: { email: 'support@example.com', phone: '+91 00000 00000', address: 'Bengaluru, Karnataka, India' },
  disclaimer:
    'Ibadah360 is a reminder and tracking tool and does not give religious rulings. Prayer times and Islamic dates can differ by a few minutes or a day. Please confirm with your local masjid.',
  copyright: '© 2026 Ibadah360. All rights reserved.',
};
