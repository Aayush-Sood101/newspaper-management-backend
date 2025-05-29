// backend/server.js
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const authRoutes = require('./routes/auth');
const newspaperRoutes = require('./routes/newspapers');
const recordRoutes = require('./routes/records');
const authorize  = require('./middleware/authorize');

const app = express();

// Allow Next.js (http://localhost:3000) to call this API
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://newspaper-management-backend.onrender.com'
  ],
  credentials: true,
}));


// connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Mongo connected'))
.catch(err => console.error(err));

// public auth route
app.use('/api/auth', authRoutes);

// protected API routes
app.use('/api/newspapers', authorize(['user','admin']), newspaperRoutes);
app.use('/api/records', authorize(['user','admin']), recordRoutes);

// protected page routes
//  - users (role='user') can only GET /daily
//  - admins (role='admin') can access /, /setup, /daily
app.get('/daily', authorize(['user','admin']), (req, res) => {
  res.json({ message: `Hello ${req.user.role}, this is your Daily page.` });
});

app.get('/', authorize(['admin']), (req, res) => {
  res.json({ message: 'Admin Home' });
});

app.get('/setup', authorize(['admin']), (req, res) => {
  res.json({ message: 'Admin Setup' });
});

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));