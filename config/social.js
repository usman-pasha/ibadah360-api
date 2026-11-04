// Rules for usernames, bios and people search. Clients read them from GET /api/meta.
module.exports = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 30,
  BIO_MAX: 150,
  SEARCH_MIN: 2,
  RESERVED: ['me', 'admin', 'support', 'ibadah360', 'api', 'root', 'null', 'undefined', 'settings', 'help'],
};
