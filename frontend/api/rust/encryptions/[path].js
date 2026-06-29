const handler = require('../[...path].js');

module.exports = (req, res) => {
  const nestedPath = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  req.query.path = ['encryptions', ...nestedPath];
  return handler(req, res);
};
