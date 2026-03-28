const express = require('express');
const router = express.Router();
const mainScraper = require('../scraper/mainScraper');

router.post('/', async (req, res) => {
    const { baseUrl, callbackUrl } = req.body;
    if (!baseUrl) return res.status(400).json({ error: 'Missing baseUrl' });
    if (!callbackUrl) return res.status(400).json({ error: 'Missing callbackUrl' });

    mainScraper(baseUrl, callbackUrl).catch(err =>
        console.error(`[ERROR] mainScraper failed: ${err.message}`)
    );

    res.json({ status: 'Crawl started' });
});

module.exports = router;
