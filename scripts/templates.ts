/**
 * Starter templates, written as plain design data. Text heights are rough;
 * the editor re-measures text when it renders.
 */
import { createLine, createShape, createText, newId } from '../src/lib/editor/model/factory';
import type {
	DesignData,
	Element,
	Page,
	ShapeKind,
	TextElement
} from '../src/lib/editor/model/types';

export interface TemplateDef {
	title: string;
	category: string;
	data: DesignData;
}

type TextOpts = Partial<TextElement> & { x: number; y: number; w: number; size: number };

function t(text: string, o: TextOpts): TextElement {
	const lines = text.split('\n').length;
	const { x, y, w, size, ...rest } = o;
	return createText({
		text,
		x,
		y,
		width: w,
		fontSize: size,
		height: size * (rest.lineHeight ?? 1.2) * lines,
		lineHeight: 1.2,
		align: 'left',
		...rest
	});
}

function s(
	shape: ShapeKind,
	x: number,
	y: number,
	w: number,
	h: number,
	fill: string,
	extra: Partial<Element> = {}
) {
	return createShape(shape, { x, y, width: w, height: h, fill, ...(extra as object) });
}

function page(background: string, elements: Element[]): Page {
	return { id: newId(), background: { color: background }, elements };
}

const design = (width: number, height: number, ...pages: Page[]): DesignData => ({
	width,
	height,
	pages
});

export const TEMPLATES: TemplateDef[] = [
	{
		title: 'Summer Sale',
		category: 'Instagram Post',
		data: design(
			1080,
			1080,
			page('#ffde59', [
				s('ellipse', 640, -180, 640, 640, '#ffbd59'),
				s('ellipse', -200, 760, 520, 520, '#ff914d'),
				s('star', 820, 760, 160, 160, '#ff3131'),
				t('SUMMER', { x: 90, y: 300, w: 900, size: 190, fontFamily: 'Anton', fill: '#0e1318' }),
				t('SALE', { x: 90, y: 520, w: 900, size: 190, fontFamily: 'Anton', fill: '#ff3131' }),
				t('UP TO 50% OFF · THIS WEEKEND ONLY', {
					x: 90,
					y: 770,
					w: 700,
					size: 34,
					fontFamily: 'Montserrat',
					fontWeight: 700,
					letterSpacing: 2,
					fill: '#0e1318'
				})
			])
		)
	},
	{
		title: 'Quote of the Day',
		category: 'Instagram Post',
		data: design(
			1080,
			1080,
			page('#1f2a37', [
				t('“', {
					x: 120,
					y: 140,
					w: 300,
					size: 260,
					fontFamily: 'Playfair Display',
					fontWeight: 700,
					fill: '#ffbd59'
				}),
				t('Creativity is intelligence\nhaving fun.', {
					x: 120,
					y: 400,
					w: 840,
					size: 84,
					fontFamily: 'Playfair Display',
					italic: true,
					fill: '#ffffff',
					lineHeight: 1.25
				}),
				createLine({ x: 120, y: 700, width: 160, height: 4, strokeWidth: 4, stroke: '#ffbd59' }),
				t('ALBERT EINSTEIN', {
					x: 120,
					y: 740,
					w: 700,
					size: 30,
					fontFamily: 'Montserrat',
					fontWeight: 600,
					letterSpacing: 6,
					fill: '#cbd5e1'
				})
			])
		)
	},
	{
		title: 'Workshop Invite',
		category: 'Instagram Post',
		data: design(
			1080,
			1080,
			page('#f4edff', [
				s('rect', 60, 60, 960, 960, '#ffffff', { cornerRadius: 48 }),
				s('ellipse', 700, 120, 260, 260, '#8b3dff'),
				s('ellipse', 790, 210, 260, 260, '#00c4cc', { opacity: 0.85 }),
				t('FREE WORKSHOP', {
					x: 140,
					y: 170,
					w: 500,
					size: 30,
					fontFamily: 'Poppins',
					fontWeight: 600,
					letterSpacing: 4,
					fill: '#8b3dff'
				}),
				t('Design\nThinking\n101', {
					x: 140,
					y: 420,
					w: 800,
					size: 120,
					fontFamily: 'Poppins',
					fontWeight: 800,
					fill: '#0e1318',
					lineHeight: 1.05
				}),
				t('Saturday, 10 AM · Community Hall', {
					x: 140,
					y: 860,
					w: 800,
					size: 36,
					fontFamily: 'Poppins',
					fill: '#5e6d77'
				})
			])
		)
	},
	{
		title: 'Pitch Deck',
		category: 'Presentation',
		data: design(
			1920,
			1080,
			page('#5e17eb', [
				s('ellipse', 1300, -300, 1000, 1000, '#8c52ff'),
				s('ellipse', 1550, 650, 600, 600, '#cb6ce6'),
				t('ACME STUDIO', {
					x: 160,
					y: 300,
					w: 900,
					size: 40,
					fontFamily: 'Montserrat',
					fontWeight: 700,
					letterSpacing: 8,
					fill: '#c1ff72'
				}),
				t('Building the future\nof creative work', {
					x: 160,
					y: 400,
					w: 1200,
					size: 110,
					fontFamily: 'Montserrat',
					fontWeight: 800,
					fill: '#ffffff',
					lineHeight: 1.1
				}),
				t('Investor presentation · 2026', {
					x: 160,
					y: 720,
					w: 900,
					size: 40,
					fontFamily: 'Montserrat',
					fill: '#e9d5ff'
				})
			]),
			page('#ffffff', [
				s('rect', 0, 0, 24, 1080, '#5e17eb'),
				t('The problem', {
					x: 160,
					y: 140,
					w: 1400,
					size: 90,
					fontFamily: 'Montserrat',
					fontWeight: 800,
					fill: '#0e1318'
				}),
				t(
					'•  Teams juggle five tools to ship one asset\n•  Brand rules live in PDFs nobody reads\n•  Review cycles take days, not minutes',
					{
						x: 160,
						y: 340,
						w: 1500,
						size: 52,
						fontFamily: 'Inter',
						fill: '#334155',
						lineHeight: 1.7
					}
				),
				s('rect', 1460, 760, 300, 180, '#f4edff', { cornerRadius: 24 }),
				t('3.2×', {
					x: 1460,
					y: 790,
					w: 300,
					size: 80,
					fontFamily: 'Montserrat',
					fontWeight: 800,
					fill: '#5e17eb',
					align: 'center'
				})
			]),
			page('#0e1318', [
				t('Thank you', {
					x: 160,
					y: 380,
					w: 1600,
					size: 160,
					fontFamily: 'Montserrat',
					fontWeight: 800,
					fill: '#ffffff',
					align: 'center'
				}),
				t('hello@acme.studio', {
					x: 160,
					y: 620,
					w: 1600,
					size: 48,
					fontFamily: 'Montserrat',
					fill: '#c1ff72',
					align: 'center'
				})
			])
		)
	},
	{
		title: 'New Arrivals Story',
		category: 'Instagram Story',
		data: design(
			1080,
			1920,
			page('#ff66c4', [
				s('rect', 80, 80, 920, 1760, '#ffffff', { opacity: 0.15, cornerRadius: 60 }),
				s('heart', 340, 340, 400, 360, '#ffffff'),
				t('NEW', {
					x: 80,
					y: 820,
					w: 920,
					size: 220,
					fontFamily: 'Bebas Neue',
					fill: '#ffffff',
					align: 'center'
				}),
				t('ARRIVALS', {
					x: 80,
					y: 1040,
					w: 920,
					size: 160,
					fontFamily: 'Bebas Neue',
					fill: '#5e17eb',
					align: 'center'
				}),
				t('Swipe up to shop the collection', {
					x: 80,
					y: 1500,
					w: 920,
					size: 44,
					fontFamily: 'Poppins',
					fontWeight: 500,
					fill: '#ffffff',
					align: 'center'
				})
			])
		)
	},
	{
		title: '10 Tips Thumbnail',
		category: 'YouTube Thumbnail',
		data: design(
			1280,
			720,
			page('#0e1318', [
				s('rect', 760, 0, 520, 720, '#ff3131'),
				s('star', 900, 180, 300, 300, '#ffde59'),
				t('10', { x: 70, y: 60, w: 600, size: 300, fontFamily: 'Anton', fill: '#ffde59' }),
				t('TIPS THAT\nCHANGED\nEVERYTHING', {
					x: 70,
					y: 380,
					w: 700,
					size: 86,
					fontFamily: 'Anton',
					fill: '#ffffff',
					lineHeight: 1
				})
			])
		)
	},
	{
		title: 'Music Festival Poster',
		category: 'Poster',
		data: design(
			1587,
			2245,
			page('#130f40', [
				s('ellipse', 280, 300, 1030, 1030, '#ff3cac'),
				s('ellipse', 430, 450, 730, 730, '#784ba0'),
				s('ellipse', 580, 600, 430, 430, '#2b86c5'),
				t('SOUNDWAVE', {
					x: 100,
					y: 1480,
					w: 1387,
					size: 230,
					fontFamily: 'Bebas Neue',
					fill: '#ffffff',
					align: 'center',
					letterSpacing: 10
				}),
				t('MUSIC FESTIVAL 2026', {
					x: 100,
					y: 1740,
					w: 1387,
					size: 70,
					fontFamily: 'Montserrat',
					fontWeight: 700,
					fill: '#ff3cac',
					align: 'center',
					letterSpacing: 12
				}),
				t('JULY 18 – 20  ·  RIVERSIDE PARK', {
					x: 100,
					y: 1920,
					w: 1387,
					size: 52,
					fontFamily: 'Montserrat',
					fill: '#c7d2fe',
					align: 'center',
					letterSpacing: 4
				})
			])
		)
	},
	{
		title: 'Minimal Business Card',
		category: 'Business Card',
		data: design(
			1050,
			600,
			page('#ffffff', [
				s('rect', 0, 0, 340, 600, '#0e1318'),
				s('ellipse', 110, 200, 120, 120, '#00c4cc'),
				t('Alex Morgan', {
					x: 420,
					y: 160,
					w: 580,
					size: 64,
					fontFamily: 'Montserrat',
					fontWeight: 700,
					fill: '#0e1318'
				}),
				t('Product Designer', {
					x: 420,
					y: 250,
					w: 580,
					size: 32,
					fontFamily: 'Montserrat',
					fill: '#00a3aa'
				}),
				createLine({ x: 420, y: 320, width: 120, height: 3, strokeWidth: 3, stroke: '#0e1318' }),
				t('alex@morgan.design\n+1 555 010 2026\nmorgan.design', {
					x: 420,
					y: 360,
					w: 580,
					size: 26,
					fontFamily: 'Inter',
					fill: '#5e6d77',
					lineHeight: 1.6
				})
			])
		)
	},
	{
		title: 'Monogram Logo',
		category: 'Logo',
		data: design(
			500,
			500,
			page('#ffffff', [
				s('ellipse', 100, 60, 300, 300, '#0e1318'),
				t('DM', {
					x: 100,
					y: 145,
					w: 300,
					size: 120,
					fontFamily: 'Playfair Display',
					fontWeight: 700,
					fill: '#ffffff',
					align: 'center'
				}),
				t('DIMVA STUDIO', {
					x: 50,
					y: 400,
					w: 400,
					size: 30,
					fontFamily: 'Montserrat',
					fontWeight: 600,
					letterSpacing: 8,
					fill: '#0e1318',
					align: 'center'
				})
			])
		)
	},
	{
		title: 'Newsletter',
		category: 'A4 Document',
		data: design(
			794,
			1123,
			page('#ffffff', [
				s('rect', 0, 0, 794, 260, '#00c4cc'),
				t('THE MONTHLY', {
					x: 60,
					y: 70,
					w: 674,
					size: 22,
					fontFamily: 'Montserrat',
					fontWeight: 700,
					letterSpacing: 6,
					fill: '#ffffff'
				}),
				t('Spring Update', {
					x: 60,
					y: 110,
					w: 674,
					size: 72,
					fontFamily: 'Playfair Display',
					fontWeight: 700,
					fill: '#ffffff'
				}),
				t('What we shipped', {
					x: 60,
					y: 320,
					w: 674,
					size: 34,
					fontFamily: 'Montserrat',
					fontWeight: 700,
					fill: '#0e1318'
				}),
				t(
					'This quarter we focused on speed. Pages now load twice as fast, and the new template library makes it easy to start any project with a polished layout.',
					{ x: 60, y: 380, w: 674, size: 20, fontFamily: 'Inter', fill: '#334155', lineHeight: 1.6 }
				),
				s('rect', 60, 560, 674, 2, '#e2e4e8'),
				t('Coming next', {
					x: 60,
					y: 600,
					w: 674,
					size: 34,
					fontFamily: 'Montserrat',
					fontWeight: 700,
					fill: '#0e1318'
				}),
				t('Real-time collaboration, brand kits, and smarter resizing are on the way.', {
					x: 60,
					y: 660,
					w: 674,
					size: 20,
					fontFamily: 'Inter',
					fill: '#334155',
					lineHeight: 1.6
				})
			])
		)
	},
	{
		title: "We're Hiring",
		category: 'Facebook Post',
		data: design(
			940,
			788,
			page('#c1ff72', [
				s('speech', 470, 90, 380, 300, '#0e1318'),
				t('Join\nus!', {
					x: 520,
					y: 140,
					w: 280,
					size: 76,
					fontFamily: 'Poppins',
					fontWeight: 800,
					fill: '#c1ff72',
					align: 'center',
					lineHeight: 1
				}),
				t("WE'RE\nHIRING", {
					x: 70,
					y: 380,
					w: 800,
					size: 140,
					fontFamily: 'Anton',
					fill: '#0e1318',
					lineHeight: 1
				}),
				t('Designers · Engineers · Writers', {
					x: 70,
					y: 690,
					w: 800,
					size: 32,
					fontFamily: 'Poppins',
					fontWeight: 600,
					fill: '#0e1318'
				})
			])
		)
	}
];
