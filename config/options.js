// Choices users can pick in My profile. The web page and the mobile app both read these from GET /api/meta.
module.exports = {
  MADHABS: [
    { value: 'hanafi', label: 'Hanafi', note: 'default' },
    { value: 'shafi', label: 'Shafi, Maliki, Hanbali' },
  ],
  METHODS: [
    { value: '1', label: 'University of Islamic Sciences, Karachi', note: 'default, widely used in India' },
    { value: '3', label: 'Muslim World League' },
  ],
  HIJRI_ADJUSTMENTS: [
    { value: -1, label: '1 day behind Saudi Arabia', note: 'default, usual in India' },
    { value: 0, label: 'Same as Saudi Arabia' },
  ],
};
