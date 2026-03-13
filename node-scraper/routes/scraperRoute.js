const express = require('express');
const router = express.Router();
const mainScraper = require('../scraper/mainScraper');

router.post('/', async (req, res) => {
    const { baseUrl } = req.body;
    if (!baseUrl) return res.status(400).json({ error: 'Missing baseUrl' });

    try {
        const allEvents = await mainScraper(baseUrl);
        res.json(allEvents);
    } catch (err) {
        // ← TEMPORARY: log everything
        console.error('==================== FULL ERROR ====================');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        console.error('====================================================');
        res.status(500).json({ 
            error: err.message, 
            stack: err.stack  // ← this will show in your API response too
        });
    }
});

module.exports = router;