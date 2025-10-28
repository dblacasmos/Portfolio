import { test, expect } from '@playwright/test';

test('no TDZ from state chunk', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(1500);
    const log = errors.join('\n');
    expect(log).not.toMatch(/Cannot access ['"]?_['"]? before initialization/i);
    expect(log).not.toMatch(/state-[A-Za-z0-9]+\.js:\d+:\d+/);
});
