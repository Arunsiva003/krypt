module.exports = function configureDevHeaders(app) {
  app.use((request, response, next) => {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });
};
