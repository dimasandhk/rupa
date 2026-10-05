export interface SizePreset {
	name: string;
	width: number;
	height: number;
	category: string;
}

/** Common Canva design types (px). */
export const PRESETS: SizePreset[] = [
	{ name: 'Instagram Post', width: 1080, height: 1080, category: 'Social media' },
	{ name: 'Instagram Story', width: 1080, height: 1920, category: 'Social media' },
	{ name: 'Facebook Post', width: 940, height: 788, category: 'Social media' },
	{ name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'Video' },
	{ name: 'Presentation (16:9)', width: 1920, height: 1080, category: 'Presentations' },
	{ name: 'Poster', width: 1587, height: 2245, category: 'Print' },
	{ name: 'A4 Document', width: 794, height: 1123, category: 'Docs' },
	{ name: 'Flyer (Letter)', width: 816, height: 1056, category: 'Print' },
	{ name: 'Logo', width: 500, height: 500, category: 'Branding' },
	{ name: 'Business Card', width: 1050, height: 600, category: 'Print' }
];
