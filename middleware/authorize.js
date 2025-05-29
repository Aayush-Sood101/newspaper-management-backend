// backend/middleware/authorize.js
const jwt = require('jsonwebtoken');

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    if (!token) 
      return res.status(401).json({ message: 'No token provided' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = authorize;
