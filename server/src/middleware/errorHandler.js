function errorHandler(err, req, res, _next) {
  console.error(`[${req.method} ${req.path}]`, err.message);

  // Sequelize validation errors
  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
}

module.exports = errorHandler;
