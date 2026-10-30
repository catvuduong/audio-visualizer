import { test, expect } from '@playwright/test';

test('canvas renders on load', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('visualizer-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.evaluate((el: HTMLCanvasElement) => el.width > 0 && el.height > 0)).toBe(true);
});

test('idle state shows the preview before audio starts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('status')).toContainText('Idle preview');
  await expect(page.getByTestId('play-toggle')).toHaveAttribute('aria-label', 'Play');
});

test('mode tabs switch the visual mode', async ({ page }) => {
  await page.goto('/');
  const stage = page.getByTestId('visualizer');

  await expect(page.getByTestId('mode-radial')).toHaveAttribute('aria-selected', 'true');

  for (const mode of ['wave', 'particles', 'radial'] as const) {
    await page.getByTestId(`mode-${mode}`).click();
    await expect(page.getByTestId(`mode-${mode}`)).toHaveAttribute('aria-selected', 'true');
    await expect(stage).toHaveAttribute('data-mode', mode);
    await expect(page.getByTestId('visualizer-canvas')).toBeVisible();
  }
});

test('theme selector changes the colour theme and remembers it', async ({ page }) => {
  await page.goto('/');
  const select = page.getByTestId('theme-select');
  const stage = page.getByTestId('visualizer');

  await select.selectOption('sunset');
  await expect(stage).toHaveAttribute('data-theme', 'sunset');
  await select.selectOption('ocean');
  await expect(stage).toHaveAttribute('data-theme', 'ocean');

  await page.reload();
  await expect(page.getByTestId('theme-select')).toHaveValue('ocean');
  await expect(page.getByTestId('visualizer')).toHaveAttribute('data-theme', 'ocean');
});

test('play button starts the demo track', async ({ page }) => {
  await page.goto('/');
  const play = page.getByTestId('play-toggle');

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await expect(page.getByTestId('status')).toContainText('Demo track');

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Play');
  await expect(page.getByTestId('status')).toContainText('Demo track paused');
});

test('microphone asks for consent before the browser prompt', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('source-mic').click();
  await expect(page.getByTestId('mic-consent')).toBeVisible();

  await page.getByTestId('mic-cancel').click();
  await expect(page.getByTestId('mic-consent')).toHaveCount(0);
  await expect(page.getByTestId('source-mic')).toHaveAttribute('aria-pressed', 'false');
});

test('controls are present', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('volume')).toBeVisible();
  await expect(page.getByTestId('sensitivity')).toBeVisible();
  await expect(page.getByTestId('fullscreen-toggle')).toBeVisible();
  await expect(page.getByTestId('source-file')).toBeVisible();
});
