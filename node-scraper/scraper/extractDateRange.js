// async function extractDateRange(page) {
//   // Click "Show dates" button
//   await page.waitForSelector('button[data-testid="ExperiencesBookItController-sidebar-button"]', { visible: true, timeout: 5000 });
//   const showDatesBtn = await page.$('button[data-testid="ExperiencesBookItController-sidebar-button"]');
//   await page.evaluate(btn => {
//     btn.scrollIntoView({ behavior: 'instant', block: 'center' });
//     btn.click();
//   }, showDatesBtn);

//   // Wait for modal to appear
//   await page.waitForSelector('div[role="dialog"]', { visible: true, timeout: 5000 });

//   // Click calendar icon inside modal
//   await page.waitForSelector('button[aria-label="Open the calendar to search for an available date"]', { visible: true, timeout: 5000 });
//   const calendarBtn = await page.$('button[aria-label="Open the calendar to search for an available date"]');
//   await page.evaluate(btn => {
//     btn.scrollIntoView({ behavior: 'instant', block: 'center' });
//     btn.click();
//   }, calendarBtn);

//   // Wait for the actual calendar days to appear
//    await page.waitForSelector('[data-testid="calendar-day"]', { visible: true, timeout: 15000 });

//   const calendarExists = await page.$('[data-testid="calendar-day"]');
// if (!calendarExists) {
//   console.warn(`[SKIP] No calendar-day found on ${page.url()}`);
//   return { availableFrom: null, availableTo: null, dateRange: null };
// }
// await page.waitForSelector('[data-testid="calendar-day"]', { visible: true, timeout: 5000 });

//   // Extract available dates
//   const availableDates = await page.evaluate(() => {
//     return Array.from(
//       document.querySelectorAll('[data-testid="calendar-day"]:not([aria-disabled="true"])')
//     )
//       .map(el => el.getAttribute('aria-label'))
//       .filter(Boolean);
//   });

//   if (!availableDates.length) {
//     return { availableFrom: null, availableTo: null, dateRange: null };
//   }

//   // Sort and format dates
//   const parsedDates = availableDates.map(d => new Date(d)).sort((a, b) => a - b);
//   const formatDate = date => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

//   const availableFromStr = formatDate(parsedDates[0]);
//   const availableToStr = formatDate(parsedDates[parsedDates.length - 1]);
//   const dateRange = `${availableFromStr} - ${availableToStr}`;

//   return { availableFrom: availableFromStr, availableTo: availableToStr, dateRange };
// }

// module.exports = extractDateRange;


async function extractDateRange(page) {
  try {
    // Click "Show dates" button if exists
    const showDatesBtn = await page.$('button[data-testid="ExperiencesBookItController-sidebar-button"]');
    if (!showDatesBtn) {
      console.warn(`[SKIP] No "Show dates" button found on ${page.url()}`);
      return { availableFrom: null, availableTo: null, dateRange: null };
    }
    await showDatesBtn.click();

    // Wait for modal
    await page.waitForSelector('div[role="dialog"]', { visible: true, timeout: 5000 });

    // Click calendar icon inside modal if exists
    const calendarBtn = await page.$('button[aria-label="Open the calendar to search for an available date"]');
    if (!calendarBtn) {
      console.warn(`[SKIP] No calendar icon found on ${page.url()}`);
      return { availableFrom: null, availableTo: null, dateRange: null };
    }
    await calendarBtn.click();

    // Check if calendar-day exists
    const calendarExists = await page.$('[data-testid="calendar-day"]');
    if (!calendarExists) {
      console.warn(`[SKIP] No calendar-day found on ${page.url()}`);
      return { availableFrom: null, availableTo: null, dateRange: null };
    }

    // Wait max 5s for available days
    await page.waitForSelector('[data-testid="calendar-day"]:not([aria-disabled="true"])', { visible: true, timeout: 5000 });

    // Extract available dates
    const availableDates = await page.$$eval('[data-testid="calendar-day"]:not([aria-disabled="true"])', els =>
      els.map(el => el.getAttribute('aria-label')).filter(Boolean)
    );

    if (!availableDates.length) {
      return { availableFrom: null, availableTo: null, dateRange: null };
    }

    // Parse dates safely
    const parsedDates = availableDates
      .map(d => {
        const cleaned = d.replace(/^[A-Za-z]+,\s*/, ''); // remove weekday names
        return new Date(cleaned);
      })
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b);

    if (!parsedDates.length) {
      return { availableFrom: null, availableTo: null, dateRange: null };
    }

    const formatDate = date =>
      date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const availableFromStr = formatDate(parsedDates[0]);
    const availableToStr = formatDate(parsedDates[parsedDates.length - 1]);
    const dateRange = `${availableFromStr} - ${availableToStr}`;

    return { availableFrom: availableFromStr, availableTo: availableToStr, dateRange };

  } catch (err) {
    console.warn(`[SKIP] Failed extracting date range from ${page.url()} → ${err.message}`);
    return { availableFrom: null, availableTo: null, dateRange: null };
  }
}

module.exports = extractDateRange;

