const { autoScroll, delay, randomDelay } = require('./utils');

module.exports = async function scrapeCategory(browser, url, location, checkinDate, maxEventsToScrape = null) {
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('https://www.airbnb.co.in', ['geolocation']);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1440, height: 900 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setGeolocation({ latitude: 0, longitude: 0 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
    await delay(8000);
    await autoScroll(page);
    await delay(2000);

    const eventLinks = await page.$$eval(
        'a[rel="noopener noreferrer nofollow"][href^="/experiences/"]',
        anchors => [...new Set(
            anchors
                .map(a => a.href)
                .filter(href => /\/experiences\/\d+/.test(href))
        )]
    );

    console.log(`[LIST] Found ${eventLinks.length} experience links`);

    const eventList = [];

    for (const [index, link] of eventLinks.entries()) {
        if (maxEventsToScrape !== null && eventList.length >= maxEventsToScrape) break;

        const detailPage = await browser.newPage();
        await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        detailPage.on('console', msg => {
            const text = msg.text();
            if (!text.includes('muscache') && !text.includes('%c')) {
                console.log(`📜 [BROWSER]: ${text}`);
            }
        });

        console.log(`\n[DETAIL ${index + 1}/${eventLinks.length}] Opening: ${link}`);

        try {
            await detailPage.goto(link, { waitUntil: 'networkidle2', timeout: 0 });
            await delay(5000);

            // ── 1. DATE RANGE ──
            let dateRange = checkinDate;
            try {
                const showDatesBtn = await detailPage.$('button[data-testid="ExperiencesBookItController-sidebar-button"]');
                if (showDatesBtn) {
                    await showDatesBtn.click();
                    await delay(2000);

                    await detailPage.evaluate(async () => {
                        const scrollable = document.querySelector('.sip151')
                            || document.querySelector('[class*="sip151"]')
                            || document.querySelector('div[role="dialog"]');
                        if (scrollable) {
                            scrollable.scrollTop = scrollable.scrollHeight;
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    });
                    await delay(1500);

                    const dates = await detailPage.$$eval(
                        'div[class*="huykxj1"]',
                        els => els.map(el => el.innerText?.trim()).filter(Boolean)
                    );

                    if (dates.length > 0) {
                        function parseAirbnbDate(str) {
                            try {
                                const cleaned = str.replace(/^(Today|Tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/i, '').trim();
                                const parts = cleaned.split(' ');
                                const day = parts[0].padStart(2, '0');
                                const months = {
                                    January: '01', February: '02', March: '03', April: '04',
                                    May: '05', June: '06', July: '07', August: '08',
                                    September: '09', October: '10', November: '11', December: '12'
                                };
                                const month = months[parts[1]] || '01';
                                const year = new Date().getFullYear();
                                return `${day}/${month}/${year}`;
                            } catch { return str; }
                        }

                        const firstDate = parseAirbnbDate(dates[0]);
                        const lastDate = parseAirbnbDate(dates[dates.length - 1]);
                        dateRange = firstDate === lastDate
                            ? firstDate
                            : `${firstDate} - ${lastDate}`;
                        console.log(`[DATE] Range: ${dateRange}`);
                    }

                    await detailPage.keyboard.press('Escape');
                    await delay(1000);
                }
            } catch (err) {
                console.warn(`[DATE] Failed: ${err.message}`);
            }

            // ── 2. MAP URL ──
            let mapsUrl = null;
            

            // ── 3. MAIN DATA ──
            const data = await detailPage.evaluate((loc, link, dateRange, mapsUrl) => {

                // ── IMAGES ──
                const allImages = Array.from(document.querySelectorAll('picture img'))
                    .map(img => img.src)
                    .filter(src =>
                        src &&
                        src.startsWith('https://a0.muscache.com') &&
                        !src.includes('AirbnbPlatformAssets')
                    )
                    .filter((src, i, self) => self.indexOf(src) === i);

                const image = allImages[0] || '';
                const additionalImages = allImages.slice(1, 5);

                // ── TITLE ──
                const title = document.querySelector('section[data-section-id="Title"] h1')?.innerText?.trim()
                    || document.querySelector('h1')?.innerText?.trim()
                    || 'Untitled';

                // ── DESCRIPTION ──
                const titleSection = document.querySelector('section[data-section-id="Title"]');
                const allDivsInTitle = titleSection
                    ? Array.from(titleSection.querySelectorAll('div'))
                    : [];
                const descDiv = allDivsInTitle.find(div =>
                    div.children.length === 0 &&
                    div.innerText?.trim().length > 20
                );
                const description = descDiv?.innerText?.trim()
                    || titleSection?.querySelector('span')?.innerText?.trim()
                    || '';

                // ── PRICE ──
                const price = document.querySelector('span.dl4dvaz')?.innerText?.trim() || 'Free';

                // ── TAGS ──
                // div.l1xunq6g contains "Bengaluru · Food tours"
                // split by · and take everything after city name
                const tagEl = document.querySelector('div.l1xunq6g');
                const tags = [];
                if (tagEl) {
                    const fullText = tagEl.innerText?.trim() || '';
                    const parts = fullText.split('·').map(p => p.trim()).filter(Boolean);
                    parts.slice(1).forEach(part => {
                        if (part.length > 1) tags.push(part.toLowerCase());
                    });
                }

                // ── T&C ──
                const thingsSection = document.querySelector('[data-section-id="ThingsToKnow"]');
                const termsAndConditions = [];
                if (thingsSection) {
                    const blocks = Array.from(thingsSection.querySelectorAll('div.i1rmhggr'));
                    blocks.forEach(block => {
                        const heading = block.querySelector('h3, h4')?.innerText?.trim();
                        const content = block.querySelector('div.i11d54p2')?.innerText?.trim();
                        if (heading && content) {
                            termsAndConditions.push({ heading, content });
                        }
                    });
                }

                return {
                    title,
                    category: 'Experiences',
                    eventDate: dateRange,
                    eventTime: 'TBD',
                    image,
                    poster: image,
                    location: mapsUrl,
                    price,
                    eventLink: link,
                    description,
                    additionalImages,
                    tags,
                    termsAndConditions
                };

            }, location, link, dateRange, mapsUrl);

            eventList.push(data);

            console.log('\n🧩 EVENT');
            console.log(` Title          : ${data.title}`);
            console.log(` Link           : ${data.eventLink}`);
            console.log(` Poster Image   : ${data.image || 'NONE'}`);
            console.log(` Extra Images   : ${data.additionalImages.length}`);
            console.log(` Date           : ${data.eventDate}`);
            console.log(` Price          : ${data.price}`);
            console.log(` Location(map)  : ${data.location || 'NONE'}`);
            console.log(` Tags           : ${data.tags.join(', ') || 'NONE'}`);
            console.log(` Description    : ${data.description?.slice(0, 100) || 'NONE'}...`);
            console.log(` T&C            : ${data.termsAndConditions.length} items`);
            data.termsAndConditions.forEach(t =>
                console.log(`   - ${t.heading}: ${t.content.slice(0, 60)}...`)
            );
            console.log('────────────────────────────────────');

        } catch (e) {
            console.error(`  ❌ Error scraping ${link}: ${e.message}`);
        } finally {
            await detailPage.close();
        }

        await randomDelay(1500, 3000);
    }

    await page.close();
    return eventList;
};