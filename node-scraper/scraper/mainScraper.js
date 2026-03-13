const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const scrapeCategory = require('./scrapeCategory');

puppeteer.use(StealthPlugin());

const LOCATIONS = [
     'New-Delhi', 'Bengaluru','Mumbai','Indore', 'Hyderabad', 'Goa',
    'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur',
    'Gurgaon', 'Noida', 'Chandigarh'
];

const SUB_CATEGORIES = ['experiences'];

const MAX_EVENTS_PER_LOCATION = null; // ✅ set null for unlimited per location
const MAX_EVENTS_TOTAL = null;      // ✅ set null for unlimited total across all cities

module.exports = async function mainScraper(baseUrl) {
    const allEvents = [];
    const today = new Date().toISOString().split('T')[0];

    console.log(chalk.cyan(`[START] mainScraper | baseUrl: ${baseUrl} | date: ${today}`));
    console.log(chalk.cyan(`[CONFIG] Max per location: ${MAX_EVENTS_PER_LOCATION ?? 'unlimited'} | Max total: ${MAX_EVENTS_TOTAL ?? 'unlimited'}`));

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-default-apps',
            '--mute-audio'
        ]
    });

    try {
        for (const location of LOCATIONS) {
            // stop if total max reached
            if (MAX_EVENTS_TOTAL !== null && allEvents.length >= MAX_EVENTS_TOTAL) {
                console.log(chalk.cyan(`[INFO] Reached total max ${MAX_EVENTS_TOTAL}. Stopping all locations.`));
                break;
            }

            console.log(chalk.cyan(`\n[INFO] Starting location: ${location}`));

            const url = `${baseUrl}/s/${location}/experiences?checkin=${today}`;
            console.log(chalk.yellow(`[SCRAPE] URL: ${url}`));

            try {
                // how many slots left for total cap
                const remainingTotal = MAX_EVENTS_TOTAL === null ? null : MAX_EVENTS_TOTAL - allEvents.length;

                // per location cap — take the smaller of the two limits
                let perLocationLimit = MAX_EVENTS_PER_LOCATION;
                if (remainingTotal !== null) {
                    perLocationLimit = perLocationLimit === null
                        ? remainingTotal
                        : Math.min(perLocationLimit, remainingTotal);
                }

                const events = await scrapeCategory(browser, url, location, today, perLocationLimit);
                console.log(chalk.green(`[SUCCESS] ${events.length} events for ${location}`));
                allEvents.push(...events);

            } catch (err) {
                console.error(chalk.red(`[ERROR] ${location}: ${err.stack || err.message}`));
            }
        }
    } catch (err) {
        console.error(chalk.red(`[FATAL] ${err.message}`));
    } finally {
        await browser.close();
        console.log(chalk.blue(`[BROWSER] Closed`));
    }

    console.log(chalk.magenta(`[COMPLETE] Total events: ${allEvents.length}`));
    return allEvents;
};