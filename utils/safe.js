// Express 4 does not catch errors in async routes. This does, and always answers with JSON.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error(e);
    res.status(e.status || 500).json({ message: e.expose ? e.message : 'Server error. Check the terminal for details' });
  });
