exports.autoScroll = async function autoScroll(page) {
    console.log('[SCROLL] Auto-scrolling page...');
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 500);
        });
    });
};

exports.delay = (ms) => new Promise((res) => setTimeout(res, ms));

// NEW: random delay to avoid rate limiting
exports.randomDelay = (min = 1000, max = 3000) =>
    new Promise((res) => setTimeout(res, Math.floor(Math.random() * (max - min + 1)) + min));