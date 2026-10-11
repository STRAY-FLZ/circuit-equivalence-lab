// Replay with playwright-cli run-code --filename tests/browser/preview-contrast.js.
// The browser must already be open on the local development app.
async (page) => {
  await page.reload();
  await page.getByRole('group', { name: '可用变换候选' }).getByRole('button').first().click();
  await page.getByRole('button', { name: '预览等效变换', exact: true }).click();
  const results = [];
  for (const theme of ['light', 'dark']) {
    if (await page.evaluate(() => globalThis.document.documentElement.dataset.theme) !== theme) {
      await page.getByRole('button', { name: /切换为.*主题/ }).click();
    }
    const samples = await page.evaluate(() => {
      const luminance = color => {
        const channels = color.match(/[0-9.]+/g).slice(0, 3).map(Number).map(value => {
          value /= 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      return [...globalThis.document.querySelectorAll('.candidate-picker button[aria-pressed="true"] span, .preview-status p')].map(element => {
        let parent = element;
        let background;
        while (parent) {
          background = globalThis.getComputedStyle(parent).backgroundColor;
          if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break;
          parent = parent.parentElement;
        }
        const foreground = globalThis.getComputedStyle(element).color;
        const a = luminance(foreground), b = luminance(background);
        return { text: element.textContent, foreground, background, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      });
    });
    if (samples.length !== 4) throw new Error('Expected selected candidate detail and three preview paragraphs');
    for (const sample of samples) {
      if (sample.contrast < 4.5) throw new Error(`${theme}: ${sample.text}: contrast ${sample.contrast.toFixed(2)} < 4.5`);
    }
    results.push({ theme, samples });
  }
  return results;
}
