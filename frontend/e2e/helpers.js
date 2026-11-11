import { expect } from '@playwright/test';

/** Hops the mocked server reports for any graph (they are hops of C6). */
export const HOPS = [
  { one_line: [2, 1, 4, 3, 6, 5], cycle: '(1,2)(3,4)(5,6)' },
  { one_line: [2, 3, 4, 5, 6, 1], cycle: '(1,2,3,4,5,6)' },
  { one_line: [6, 1, 2, 3, 4, 5], cycle: '(1,6,5,4,3,2)' },
];

const json = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

/**
 * Stand in for the backend. `overrides` maps an endpoint name to a response
 * body, or to [status, body].
 */
export async function mockApi(page, overrides = {}) {
  const defaults = {
    'health': { status: 'ok' },
    'hops': { hops: HOPS, count: HOPS.length, more: false },
    'hop': { hops: [HOPS[0]], count: 1, more: false },
    'leap-group': { structure: 'C3 x S3', order: 18, order_str: '18' },
    'verify-hop': { valid: true },
  };
  for (const [name, fallback] of Object.entries(defaults)) {
    const reply = overrides[name] ?? fallback;
    const response = Array.isArray(reply) ? json(reply[1], reply[0]) : json(reply);
    await page.route(new RegExp(`/${name}(\\?.*)?$`), (route) => route.fulfill(response));
  }
}

export async function openEditor(page, overrides) {
  await mockApi(page, overrides);
  await page.goto('./');
  await expect(page.locator('.canvas canvas').first()).toBeVisible();
}

export async function loadFromLibrary(page, name) {
  await page.getByRole('button', { name: 'Library' }).click();
  await page.getByText(name, { exact: true }).click();
  await expect(page.locator('.library-modal')).toHaveCount(0);
}

/** The graph the app would send to the server right now. */
export async function currentGraph(page) {
  const request = page.waitForRequest((r) => /\/hop$/.test(r.url()) && r.method() === 'POST');
  await page.getByRole('button', { name: 'One hop' }).click();
  const graph = (await request).postDataJSON();
  await expect(page.getByRole('button', { name: 'One hop' })).toBeEnabled();
  return graph;
}

export const workingLeap = (page) => page.locator('.working-leap-perm');

/** Move the pointer onto an empty corner of the canvas. */
export async function pointAtCanvas(page) {
  await page.locator('.canvas').hover({ position: { x: 20, y: 20 } });
}

/** What the working leap shows after performing HOPS[0] once. */
export const LEAP = '(1 2)(3 4)(5 6)';

/** Give C6 a working leap by pinning a hop and performing it from the palette. */
export async function performHopOnC6(page) {
  await loadFromLibrary(page, 'C6 (Hexagon)');
  await page.getByRole('button', { name: 'All hops' }).click();
  await page.locator('.hop-item-pin').first().click();
  await pointAtCanvas(page);
  await page.locator('.hop-palette-perform').first().click();
  await expect(workingLeap(page)).toHaveText(LEAP);
}
