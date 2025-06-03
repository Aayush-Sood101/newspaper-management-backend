const express = require('express');
const router = express.Router();
const Record = require('../models/Record');
const Newspaper = require('../models/Newspaper');
const XLSX = require('xlsx');

// Get records for specific date
router.get('/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    
    const records = await Record.find({ 
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('newspaperId');
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add/update record
router.post('/', async (req, res) => {
  try {
    const { newspaperId, date, received } = req.body;
    const recordDate = new Date(date);
    const startOfDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate(), 23, 59, 59, 999);
    
    let record = await Record.findOne({
      newspaperId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (record) {
      record.received = received;
      await record.save();
    } else {
      record = new Record({ 
        newspaperId, 
        date: new Date(date), 
        received 
      });
      await record.save();
    }

    await record.populate('newspaperId');
    res.json(record);
  } catch (error) {
    console.error('Error creating/updating record:', error);
    res.status(400).json({ message: error.message });
  }
});

// Generate monthly report
// Generate monthly report
router.get('/report/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    console.log(`Generating report for ${monthNum}/${yearNum}`);
    
    // Validate input
    if (monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 3000) {
      return res.status(400).json({ message: 'Invalid month or year' });
    }
    
    // Create date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    
    console.log(`Date range: ${startDate} to ${endDate}`);

    // Get all records for the month first
    const records = await Record.find({
      date: { 
        $gte: startDate, 
        $lte: endDate 
      }
    }).populate('newspaperId').lean();
    
    console.log(`Found ${records.length} records for the month`);

    if (records.length === 0) {
      return res.status(404).json({ message: 'No records found for this month' });
    }

    // Get unique newspaper IDs from the records
    const newspaperIds = [...new Set(records.map(record => 
      record.newspaperId && record.newspaperId._id ? record.newspaperId._id.toString() : null
    ).filter(id => id !== null))];

    // Get only newspapers that have records for this month
    const newspapers = await Newspaper.find({
      _id: { $in: newspaperIds }
    }).lean();
    
    console.log(`Found ${newspapers.length} newspapers with records for this month`);

    if (newspapers.length === 0) {
      return res.status(404).json({ message: 'No newspapers found with records for this month' });
    }

    const reportData = [];
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    
    console.log(`Days in month: ${daysInMonth}`);

    // Process each newspaper that has records
    newspapers.forEach(newspaper => {
      try {
        const row = {
          'Newspaper Name': newspaper.name || 'Unknown'
        };
        let totalCost = 0;

        // Add columns for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(yearNum, monthNum - 1, day);
          const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = daysOfWeek[currentDate.getDay()];

          // Find if there's a record for this newspaper and date
          const record = records.find(r => {
            if (!r.newspaperId || !r.newspaperId._id) return false;
            
            const recordDate = new Date(r.date);
            const isSameNewspaper = r.newspaperId._id.toString() === newspaper._id.toString();
            const isSameDate = recordDate.getDate() === day && 
                              recordDate.getMonth() === monthNum - 1 && 
                              recordDate.getFullYear() === yearNum;
            
            return isSameNewspaper && isSameDate;
          });

          // Get the rate for this day
          const dayRate = (newspaper.rates && newspaper.rates[dayName]) ? newspaper.rates[dayName] : 0;

          // Set the value based on whether the newspaper was received
          if (record && record.received) {
            row[day.toString()] = dayRate;
            totalCost += dayRate;
          } else {
            row[day.toString()] = 0;
          }
        }

        row['Total Cost'] = totalCost;
        reportData.push(row);
      } catch (error) {
        console.error(`Error processing newspaper ${newspaper.name}:`, error);
      }
    });

    console.log(`Generated ${reportData.length} rows of data`);

    if (reportData.length === 0) {
      return res.status(404).json({ message: 'No data to generate report' });
    }

    // Define headers in required order
    const headers = ['Newspaper Name'];
    for (let i = 1; i <= daysInMonth; i++) {
      headers.push(i.toString());
    }
    headers.push('Total Cost');

    // Create Excel worksheet with custom headers
    const ws = XLSX.utils.json_to_sheet(reportData, { header: headers });

    // Auto-size columns
    const colWidths = [{ width: 20 }]; // Newspaper Name column
    for (let i = 1; i <= daysInMonth; i++) {
      colWidths.push({ width: 8 });
    }
    colWidths.push({ width: 12 }); // Total Cost column
    ws['!cols'] = colWidths;

    // Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Report-${monthNum}-${yearNum}`);

    // Convert workbook to buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=newspaper-report-${monthNum}-${yearNum}.xlsx`);
    res.send(buffer);
    
    console.log('Report generated successfully');
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      message: 'Error generating report', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;