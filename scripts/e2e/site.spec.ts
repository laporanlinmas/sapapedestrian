import { expect, test, type Page } from '@playwright/test';

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p2cAAAAASUVORK5CYII=',
  'base64',
);

async function expectNoPageErrors(page: Page, errors: string[]) {
  expect(errors, 'JavaScript page errors').toEqual([]);
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
}

test('home stays within desktop, tablet, and mobile viewport widths', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const sizes = [
    { name: 'phone-320', width: 320, height: 740 },
    { name: 'phone-360', width: 360, height: 800 },
    { name: 'phone-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1280', width: 1280, height: 800 },
    { name: 'desktop-1920', width: 1920, height: 1080 },
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(dimensions.page, `horizontal overflow at ${size.name}: ${JSON.stringify(dimensions)}`)
      .toBeLessThanOrEqual(dimensions.viewport);

    await page.screenshot({
      path: testInfo.outputPath('screenshots', `home-${size.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  }

  await expectNoPageErrors(page, errors);
});

test('mobile navigation opens, scrolls to a section, and closes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const menuButton = page.getByRole('button', { name: 'Buka menu' });
  await menuButton.click();
  await expect(page.getByRole('button', { name: 'FAQ', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  await expect(page.locator('#faq')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Buka menu' })).toHaveAttribute('aria-expanded', 'false');

  await expectNoPageErrors(page, errors);
});

test('theme toggle updates the page theme', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const initialDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
  await page.getByRole('button', { name: 'Toggle dark mode' }).click();
  await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark')))
    .toBe(!initialDark);
  await page.getByRole('button', { name: 'Toggle dark mode' }).click();
  await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark')))
    .toBe(initialDark);

  await expectNoPageErrors(page, errors);
});

test('CCTV and map screens have a working back action and never embed the app into itself', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://sipedasview.vercel.app/**', (route) => route.fulfill({ body: '<title>Test CCTV</title>' }));
  await page.route('https://www.google.com/maps/**', (route) => route.fulfill({ body: '<title>Test map</title>' }));

  for (const [path, title] of [['/cctv', 'SIPEDAS VIEW'], ['/mymaps', 'Peta Kerawanan']]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    const frame = page.locator('iframe');
    if (await frame.count()) {
      const src = await frame.getAttribute('src');
      expect(src).toBeTruthy();
      expect(new URL(src!, page.url()).origin).not.toBe(new URL(page.url()).origin);
    } else {
      await expect(page.getByText(`${title} belum dikonfigurasi.`)).toBeVisible();
    }
    await page.getByRole('button', { name: 'Beranda' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }

  await expectNoPageErrors(page, errors);
});

test('chatbot opens and closes without a browser error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Buka Chatbot SIPEDAS' }).click();
  await expect(page.getByRole('heading', { name: 'SIPEDAS Assistant' })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup chatbot' }).click();
  await expect(page.getByRole('button', { name: 'Buka Chatbot SIPEDAS' })).toBeVisible();

  await expectNoPageErrors(page, errors);
});

test('complaint submission reaches success state and ticket lookup renders status', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/submit-complaint', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, ticketNumber: 'ADU-261018-1234', jumlahFoto: 0 }),
  }));
  await page.route('**/api/complaint-status?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      found: true,
      ticket: 'ADU-261018-1234',
      timestamp: '18/10/2026 10:00:00',
      timestampISO: '2026-10-18T10:00:00+07:00',
      nama: 'Warga Uji',
      kategori: 'Kebersihan',
      lokasi: 'Jalan uji',
      deskripsi: 'Laporan uji otomatis untuk halaman aduan.',
      fotos: [],
      jumlahFoto: 0,
      status: 'Diproses',
      catatan: '',
      fotoTindakLanjut: '',
      updatedAt: '',
      source: 'Website',
    }),
  }));
  await page.goto('/');
  await page.getByRole('button', { name: /Buat Laporan/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Layanan Aduan Masyarakat' });
  await expect(dialog).toBeVisible();
  await page.getByLabel('Nama', { exact: false }).fill('Warga Uji');
  await page.getByRole('button', { name: 'Pilih kategori laporan' }).click();
  await page.getByRole('option', { name: /Kebersihan/ }).click();
  await page.getByLabel('Lokasi', { exact: false }).fill('Jalan uji');
  await page.getByLabel('Deskripsi', { exact: false }).fill('Laporan uji otomatis untuk halaman aduan.');
  await page.getByRole('button', { name: 'Kirim Laporan' }).click();
  await expect(dialog.getByText('Laporan Terkirim!')).toBeVisible();
  await expect(dialog.getByText('ADU-261018-1234')).toBeVisible();

  await dialog.getByRole('tab', { name: /Lacak Tiket/ }).click();
  await dialog.getByRole('textbox', { name: 'Nomor tiket' }).fill('ADU-261018-1234');
  await dialog.getByRole('button', { name: 'Cari tiket' }).click();
  await expect(dialog.getByText('Sedang diproses')).toBeVisible();

  await expectNoPageErrors(page, errors);
});

test('rating form submits and shows confirmation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/submit-survey', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, rating: 5 }),
  }));
  await page.goto('/rating');

  await page.getByRole('radio', { name: /5 bintang/ }).click();
  await page.getByRole('button', { name: 'Kirim Penilaian' }).click();
  await expect(page.getByRole('heading', { name: 'Terima Kasih atas Penilaian Anda!' })).toBeVisible();

  await expectNoPageErrors(page, errors);
});

test('gallery loads photos and opens the lightbox', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/gallery?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      total: 1,
      limit: 60,
      pool: 1,
      page: 1,
      start: 0,
      perPage: 12,
      pages: 1,
      items: [{
        id: 'photo-test',
        tanggal: '18 Oktober 2026',
        thumb: '/api/gallery-photo?id=p1234567890&w=400',
        large: '/api/gallery-photo?id=p1234567890&w=1200',
      }],
    }),
  }));
  await page.route('**/api/gallery-photo?*', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: TRANSPARENT_PNG,
  }));
  await page.goto('/galeri');

  const photo = page.getByRole('button', { name: 'Buka foto 18 Oktober 2026' });
  await expect(photo).toBeVisible();
  await photo.click();
  await expect(page.getByRole('dialog', { name: 'Pratinjau foto' })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup pratinjau' }).click();
  await expect(page.getByRole('dialog', { name: 'Pratinjau foto' })).toHaveCount(0);

  await expectNoPageErrors(page, errors);
});

test('rating and gallery pages fit narrow phone screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/gallery?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, total: 0, limit: 60, pool: 0, page: 1, start: 0, perPage: 12, pages: 0, items: [] }),
  }));

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/rating');
    await expect(page.getByRole('radio', { name: /5 bintang/ })).toBeVisible();
    let dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(dimensions.page, `rating overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);

    await page.goto('/galeri');
    await expect(page.getByRole('heading', { name: 'Galeri Kegiatan' })).toBeVisible();
    dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(dimensions.page, `gallery overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }

  await expectNoPageErrors(page, errors);
});
