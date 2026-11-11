import { test, expect } from '@playwright/test';
import {
  openEditor, loadFromLibrary, currentGraph, workingLeap, pointAtCanvas, performHopOnC6, LEAP,
} from './helpers';

test.describe('working leap', () => {
  test('performing a hop from the workspace sticks', async ({ page }) => {
    await openEditor(page);
    await loadFromLibrary(page, 'C6 (Hexagon)');
    await page.getByRole('button', { name: 'All hops' }).click();

    await page.locator('.hop-item').first().hover();
    // The hop belongs to the graph on the canvas, so nothing is swapped in.
    await expect(page.locator('.snapshotBanner')).toHaveCount(0);

    await page.locator('.hop-item-perform').first().click();
    await pointAtCanvas(page);
    await expect(workingLeap(page)).toHaveText(LEAP);
  });

  test('shows the hops performed, composed in order', async ({ page }) => {
    await openEditor(page);
    await loadFromLibrary(page, 'C6 (Hexagon)');
    await page.getByRole('button', { name: 'All hops' }).click();

    // HOPS[1] is (1,2,3,4,5,6): performing it once gives exactly that leap.
    await page.locator('.hop-item-perform').nth(1).click();
    await pointAtCanvas(page);
    await expect(workingLeap(page)).toHaveText('(1 2 3 4 5 6)');

    await page.locator('.hop-item-perform').nth(1).click();
    await pointAtCanvas(page);
    await expect(workingLeap(page)).toHaveText('(1 3 5)(2 4 6)');
  });

  test('its arrows never become edges', async ({ page }) => {
    await openEditor(page);
    await performHopOnC6(page);

    // Delete with nothing selected is a no-op...
    await page.keyboard.press('Delete');
    expect((await currentGraph(page)).edges).toHaveLength(6);
    await expect(workingLeap(page)).toHaveText(LEAP);

    // ...and editing a text field is not a canvas shortcut.
    await page.locator('.control-panel-input').click();
    await page.keyboard.press('Backspace');
    await page.keyboard.type('2');
    expect((await currentGraph(page)).edges).toHaveLength(6);
    await expect(workingLeap(page)).toHaveText(LEAP);
  });

  test('survives a visit to the database page', async ({ page }) => {
    await openEditor(page);
    await performHopOnC6(page);

    await page.getByRole('tab', { name: 'Database' }).click();
    await page.locator('.db-search-input').fill('C6x');
    await page.keyboard.press('Backspace');
    await expect(page.locator('.db-card').first()).toBeVisible();

    await page.getByRole('tab', { name: 'Editor' }).click();
    await expect(workingLeap(page)).toHaveText(LEAP);
    expect((await currentGraph(page)).edges).toHaveLength(6);
  });
});

test.describe('editing', () => {
  test('undo and redo from the keyboard', async ({ page }) => {
    await openEditor(page);
    const canvas = page.locator('.canvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    await canvas.click({ position: { x: 400, y: 200 } });
    expect((await currentGraph(page)).vertices).toEqual([0, 1]);

    await page.keyboard.press('Control+z');
    expect((await currentGraph(page)).vertices).toEqual([0]);
    await page.keyboard.press('Control+Shift+z');
    expect((await currentGraph(page)).vertices).toEqual([0, 1]);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+y');
    expect((await currentGraph(page)).vertices).toEqual([0, 1]);
  });

  test('deleting a vertex renumbers the rest', async ({ page }) => {
    await openEditor(page);
    const canvas = page.locator('.canvas');
    for (const x of [200, 400, 600]) {
      await canvas.click({ position: { x, y: 300 } });
    }
    await page.getByRole('button', { name: 'Edge', exact: true }).click();
    await canvas.click({ position: { x: 400, y: 300 } });
    await canvas.click({ position: { x: 600, y: 300 } });
    expect(await currentGraph(page)).toMatchObject({ vertices: [0, 1, 2], edges: [[1, 2]] });

    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await canvas.click({ position: { x: 200, y: 300 } });
    await page.keyboard.press('Backspace');
    expect(await currentGraph(page)).toMatchObject({ vertices: [0, 1], edges: [[0, 1]] });

    await page.keyboard.press('Control+z');
    expect(await currentGraph(page)).toMatchObject({ vertices: [0, 1, 2], edges: [[1, 2]] });
  });

  test('an older result shows its own graph on hover, then gives the canvas back', async ({ page }) => {
    await openEditor(page);
    await loadFromLibrary(page, 'C6 (Hexagon)');
    await page.getByRole('button', { name: 'All hops' }).click();
    await page.locator('.canvas').click({ position: { x: 30, y: 600 } });   // a 7th vertex
    expect((await currentGraph(page)).vertices).toHaveLength(7);

    await page.locator('.hop-item').first().hover();
    await expect(page.locator('.snapshotBanner')).toBeVisible();
    await pointAtCanvas(page);
    await expect(page.locator('.snapshotBanner')).toHaveCount(0);
    expect((await currentGraph(page)).vertices).toHaveLength(7);
  });
});

test.describe('drawing a hop', () => {
  async function drawSwap(page) {
    const canvas = page.locator('.canvas');
    await canvas.click({ position: { x: 200, y: 300 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.getByRole('button', { name: 'Edge', exact: true }).click();
    await canvas.click({ position: { x: 200, y: 300 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.getByRole('button', { name: 'Draw hop' }).click();
    for (const [from, to] of [[200, 400], [400, 200]]) {
      await canvas.click({ position: { x: from, y: 300 } });
      await canvas.click({ position: { x: to, y: 300 } });
    }
    await page.getByRole('button', { name: 'Verify & save hop' }).click();
  }

  test('a valid hop is saved', async ({ page }) => {
    await openEditor(page);
    await drawSwap(page);
    await expect(page.locator('.toast-success')).toContainText('(1 2)');
    await expect(page.locator('.hop-palette-item')).toHaveCount(1);
  });

  test('a server error is reported as an error, not as an invalid hop', async ({ page }) => {
    await openEditor(page, { 'verify-hop': [422, { detail: 'Too many vertices.' }] });
    await drawSwap(page);
    await expect(page.locator('.toast-error')).toContainText('Too many vertices.');
  });
});

test.describe('results', () => {
  test('server messages are shown as they are', async ({ page }) => {
    await openEditor(page, { 'leap-group': [504, { detail: 'Computation stopped after 30 seconds.' }] });
    await loadFromLibrary(page, 'K4');
    await page.getByRole('button', { name: 'Leap group' }).click();
    await expect(page.locator('.control-panel-error')).toHaveText('Computation stopped after 30 seconds.');
  });

  test('a huge order is abbreviated, and a missing structure says so', async ({ page }) => {
    const digits = '1' + '0'.repeat(40);
    await openEditor(page, { 'leap-group': { structure: null, order: 1e40, order_str: digits } });
    await loadFromLibrary(page, 'K4');
    await page.getByRole('button', { name: 'Leap group' }).click();
    await expect(page.locator('.leap-group-structure')).toHaveText('structure unavailable');
    await expect(page.locator('.leap-group-order')).toContainText('≈ 1.00 × 1040');
    await expect(page.locator('.leap-group-order span')).toHaveAttribute('title', digits);
  });

  test('a long hop list is paged', async ({ page }) => {
    const hops = Array.from({ length: 450 }, (_, i) => ({ one_line: [2, 1], cycle: `(1,2) #${i}` }));
    await openEditor(page, { 'hops': { hops, count: 5000, more: true } });
    await loadFromLibrary(page, 'K4');
    await page.getByRole('button', { name: 'All hops' }).click();
    await expect(page.locator('.hops-body-count')).toHaveText('5,000+ hops found (first 450 listed)');
    await expect(page.locator('.hop-item')).toHaveCount(5);
    await page.getByRole('button', { name: /Show more/ }).click();
    await expect(page.locator('.hop-item')).toHaveCount(200);
    await page.getByRole('button', { name: /Show more \(250 remaining\)/ }).click();
    await expect(page.locator('.hop-item')).toHaveCount(400);
  });
});

test.describe('files, without the File System Access API (Firefox, Safari)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete window.showSaveFilePicker;
      delete window.showOpenFilePicker;
    });
  });

  test('saving writes the graph and not the working leap arrows', async ({ page }) => {
    await openEditor(page);
    await performHopOnC6(page);
    const download = page.waitForEvent('download');
    await page.locator('#fileops').getByRole('button', { name: 'Save', exact: true }).click();
    const stream = await (await download).createReadStream();
    let text = '';
    for await (const chunk of stream) text += chunk;
    const file = JSON.parse(text);
    expect(file.vertices).toHaveLength(6);
    expect(file.edges).toHaveLength(6);
  });

  test('opening a file works, whatever its vertex numbering', async ({ page }) => {
    await openEditor(page);
    const file = {
      vertices: [{ id: 3, x: 0, y: 0 }, { id: 8, x: 100, y: 0 }, { id: 5, x: 50, y: 80 }],
      edges: [{ source: 3, target: 8 }, { source: 8, target: 5 }],
    };
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await (await chooser).setFiles({
      name: 'path.leap', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)),
    });
    await expect(page.locator('.menu-bar-filename')).toContainText('path.leap');
    expect(await currentGraph(page)).toMatchObject({ vertices: [0, 1, 2], edges: [[0, 1], [1, 2]] });
  });
});
