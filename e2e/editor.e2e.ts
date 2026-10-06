import { expect, test, type Page } from '@playwright/test';

/** Wait until Svelte has hydrated, so clicks hit live handlers. */
const hydrated = (page: Page) => page.waitForSelector('html[data-hydrated]', { state: 'attached' });

/** A fresh account per run (local dev database only). */
async function signUp(page: Page) {
	const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@rupa.test`;
	await page.goto('/login?mode=signup');
	await hydrated(page);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('e2e-test-password');
	await page.locator('form').getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('heading', { name: /What are we making/ })).toBeVisible();
	await hydrated(page);
}

type Win = { __editor: { data: { pages: { elements: { type: string; text?: string }[] }[] } } };
const elements = (page: Page) =>
	page.evaluate(() => (window as unknown as Win).__editor.data.pages.flatMap((p) => p.elements));

test('create, edit, persist, add pages and present a design', async ({ page }) => {
	await signUp(page);

	await page
		.getByRole('button', { name: /Instagram Post/ })
		.first()
		.click();
	await page.waitForURL(/\/design\//);
	await expect(page.locator('canvas').first()).toBeVisible();

	// Keyboard shortcuts add a text box and a rectangle.
	await page.locator('main').click({ position: { x: 20, y: 120 } });
	await page.keyboard.press('t');
	await page.keyboard.press('Escape');
	await page.keyboard.press('r');
	await expect
		.poll(async () => (await elements(page)).map((e) => e.type))
		.toEqual(['text', 'shape']);

	// Undo / redo.
	await page.keyboard.press('Control+z');
	await expect.poll(async () => (await elements(page)).length).toBe(1);
	await page.keyboard.press('Control+Shift+z');
	await expect.poll(async () => (await elements(page)).length).toBe(2);

	// Autosave, then reload and check the design came back.
	await expect(page.getByRole('button', { name: 'All changes saved' })).toBeVisible({
		timeout: 10_000
	});
	await page.reload();
	await hydrated(page);
	await page.waitForFunction(() => '__editor' in window);
	await expect
		.poll(async () => (await elements(page)).map((e) => e.type))
		.toEqual(['text', 'shape']);

	// Pages + present mode.
	await page.getByRole('button', { name: 'Add page' }).last().click();
	await expect(page.getByText('Page 2', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'All changes saved' })).toBeVisible({
		timeout: 10_000
	});
	await page.getByRole('link', { name: 'Present' }).click();
	await expect(page.getByRole('img', { name: 'Slide 1' })).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await expect(page.getByText('2 / 2')).toBeVisible();
});

test('apply a template and export every page', async ({ page }) => {
	await signUp(page);
	await page
		.getByRole('button', { name: /Presentation/ })
		.first()
		.click();
	await page.waitForURL(/\/design\//);

	await page.getByRole('button', { name: 'Templates', exact: true }).click();
	await page.getByRole('button', { name: 'Pitch Deck' }).click();
	await expect
		.poll(() => page.evaluate(() => (window as unknown as Win).__editor.data.pages.length))
		.toBe(3);

	// Render every page offscreen exactly like the PNG/PDF export does.
	const sizes = await page.evaluate(async () => {
		const { renderPage } = await import('/src/lib/editor/canvas/export.ts');
		const data = (window as unknown as Win).__editor.data as never;
		const out = [];
		for (let i = 0; i < 3; i++) {
			const c = await renderPage(data, i, { pixelRatio: 0.25 });
			c.getContext('2d')!.getImageData(0, 0, 1, 1); // throws if the canvas is tainted
			out.push(`${c.width}x${c.height}`);
		}
		return out;
	});
	expect(sizes).toEqual(['480x270', '480x270', '480x270']);
});

test('crop an image by dragging the photo inside its frame', async ({ page }) => {
	await signUp(page);
	await page
		.getByRole('button', { name: /Instagram Post/ })
		.first()
		.click();
	await page.waitForURL(/\/design\//);
	await page.waitForFunction(() => '__editor' in window);

	// A generated 800×1200 test image, placed and then cropped to its top half.
	await page.evaluate(async () => {
		const c = document.createElement('canvas');
		c.width = 800;
		c.height = 1200;
		const ctx = c.getContext('2d')!;
		ctx.fillStyle = '#e11d48';
		ctx.fillRect(0, 0, 800, 600);
		ctx.fillStyle = '#2563eb';
		ctx.fillRect(0, 600, 800, 600);
		const { addImage } = await import('/src/lib/editor/insert.ts');
		const ed = (window as unknown as { __editor: never }).__editor;
		addImage(ed, c.toDataURL(), 800, 1200);
		(ed as { updateSelected: (fn: (e: Record<string, unknown>) => void) => void }).updateSelected(
			(e) => {
				Object.assign(e, {
					x: 240,
					y: 240,
					width: 600,
					height: 450,
					crop: { x: 0, y: 0, width: 800, height: 600 }
				});
			}
		);
	});

	type Img = { y: number; crop: { y: number } };
	const image = () =>
		page.evaluate(
			() =>
				(window as unknown as { __editor: { activePage: { elements: Img[] } } }).__editor.activePage
					.elements[0]
		);

	// Page → screen coordinates.
	const box = (await page.locator('[data-page-index="0"] canvas').first().boundingBox())!;
	const zoom = await page.evaluate(
		() => (window as unknown as { __editor: { zoom: number } }).__editor.zoom
	);
	const at = (x: number, y: number) => ({ x: box.x + x * zoom, y: box.y + y * zoom });

	const center = at(540, 465);
	await page.mouse.dblclick(center.x, center.y);
	await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();

	// Drag the photo up by 150 page px: the frame now shows lower in the source image.
	await page.mouse.move(center.x, center.y);
	await page.mouse.down();
	await page.mouse.move(center.x, center.y - 75 * zoom, { steps: 5 });
	await page.mouse.move(center.x, center.y - 150 * zoom, { steps: 5 });
	await page.mouse.up();
	await page.keyboard.press('Enter');

	const after = await image();
	expect(after.y).toBeCloseTo(240, 0); // the element itself did not move
	expect(after.crop.y).toBeCloseTo(200, -1); // 150 display px = 200 source px at 600/800 scale

	await page.keyboard.press('Control+z');
	expect((await image()).crop.y).toBe(0);
});

test('presentations open in slides view with a working filmstrip', async ({ page }) => {
	await signUp(page);
	await page
		.getByRole('button', { name: /Presentation/ })
		.first()
		.click();
	await page.waitForURL(/\/design\//);
	await page.waitForFunction(() => '__editor' in window);

	type Ed = { layout: string; activePageIndex: number; data: { pages: { title?: string }[] } };
	const state = () =>
		page.evaluate(() => {
			const ed = (window as unknown as { __editor: Ed }).__editor;
			// Class getters don't survive serialization; copy the fields out.
			return {
				layout: ed.layout,
				activePageIndex: ed.activePageIndex,
				pages: ed.data.pages.length
			};
		});
	const strip = page.getByRole('navigation', { name: 'Slides' });

	// 16:9 opens as slides: one page on the canvas and a filmstrip below.
	await expect(strip).toBeVisible();
	expect((await state()).layout).toBe('slides');

	// "+" adds a slide after the last one and opens it.
	await strip.getByRole('button', { name: 'Add slide', exact: true }).click();
	await expect.poll(async () => (await state()).pages).toBe(2);
	expect((await state()).activePageIndex).toBe(1);

	// Title a slide from its menu.
	await strip.getByRole('button', { name: 'Slide 2 options' }).click();
	await page.getByRole('menuitem', { name: 'Add title' }).click();
	await page.keyboard.type('Problem');
	await page.keyboard.press('Enter');
	await expect(strip.getByRole('button', { name: 'Slide 2: Problem' })).toBeVisible();

	// Thumbnails and arrow keys switch slides.
	await strip.getByRole('button', { name: 'Slide 1', exact: true }).click();
	expect((await state()).activePageIndex).toBe(0);
	await page.keyboard.press('ArrowRight');
	await expect.poll(async () => (await state()).activePageIndex).toBe(1);

	// The toggle switches to the vertical scroll view and back; the choice sticks.
	await page.getByRole('button', { name: 'Scroll view' }).click();
	await expect(strip).toBeHidden();
	await expect(page.getByRole('button', { name: 'Add page' }).last()).toBeVisible();
	await page.reload();
	await page.waitForFunction(() => '__editor' in window);
	expect((await state()).layout).toBe('scroll');
});
