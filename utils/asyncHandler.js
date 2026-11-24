// Wraps an async controller function so thrown errors are forwarded to
// errorMiddleware instead of requiring repetitive try/catch blocks.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
