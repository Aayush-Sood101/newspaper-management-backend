// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },   // store only bcrypt hashes
  role:     { type: String, enum: ['user','admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.models?.User || mongoose.model('User', UserSchema);
