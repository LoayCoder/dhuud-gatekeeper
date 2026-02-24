const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
    });
    page.on('pageerror', error => {
        console.log('UNCAUGHT ERROR:', error.message);
    });
    console.log('Navigating...');
    await page.goto('http://localhost:5173/incidents/investigate?incident=35d6d099-f506-4381-a576-faa29bf3c2ee').catch(e => console.error('GOTO ERROR:', e.message));
    await page.waitForTimeout(3000);
    console.log('Done.');
    await browser.close();
})();
