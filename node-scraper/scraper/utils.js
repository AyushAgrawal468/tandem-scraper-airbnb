exports.autoScroll = async function autoScroll(page) {
  console.log("Starting auto-scroll for full page...");
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500; // px per scroll
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
