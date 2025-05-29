const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  newspaperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Newspaper',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  received: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Record', RecordSchema);