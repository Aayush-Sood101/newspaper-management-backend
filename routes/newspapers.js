const express = require('express');
const router = express.Router();
const Newspaper = require('../models/Newspaper');

// Get newspapers for specific month/year
router.get('/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    const newspapers = await Newspaper.find({ 
      month: parseInt(month), 
      year: parseInt(year) 
    });
    res.json(newspapers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new newspaper
router.post('/', async (req, res) => {
  try {
    const newspaper = new Newspaper(req.body);
    await newspaper.save();
    res.status(201).json(newspaper);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update newspaper
router.put('/:id', async (req, res) => {
  try {
    const newspaper = await Newspaper.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    if (!newspaper) {
      return res.status(404).json({ message: 'Newspaper not found' });
    }
    res.json(newspaper);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete newspaper
router.delete('/:id', async (req, res) => {
  try {
    const newspaper = await Newspaper.findByIdAndDelete(req.params.id);
    if (!newspaper) {
      return res.status(404).json({ message: 'Newspaper not found' });
    }
    res.json({ message: 'Newspaper deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;