import { z } from 'zod';
import { TRANSITION_DIRECTIONS, TRANSITION_TYPES } from './types';
import type { DesignData, Element } from './types';

const color = z.string().max(64);

const gradient = z.object({
	type: z.enum(['linear', 'radial']),
	angle: z.number(),
	stops: z
		.array(z.object({ offset: z.number().min(0).max(1), color }))
		.min(2)
		.max(8)
});

/** Solid colour or gradient. */
const fill = z.union([color, gradient]);

const base = {
	id: z.string().min(1).max(64),
	name: z.string().max(200).optional(),
	x: z.number(),
	y: z.number(),
	width: z.number().nonnegative(),
	height: z.number().nonnegative(),
	rotation: z.number(),
	opacity: z.number().min(0).max(1),
	locked: z.boolean(),
	flipX: z.boolean(),
	flipY: z.boolean()
};

const shadow = z.object({
	color,
	blur: z.number(),
	offsetX: z.number(),
	offsetY: z.number(),
	opacity: z.number()
});

const text = z.object({
	...base,
	type: z.literal('text'),
	text: z.string().max(20_000),
	fontFamily: z.string().max(200),
	fontSize: z.number().positive(),
	fontWeight: z.number(),
	italic: z.boolean(),
	underline: z.boolean(),
	strike: z.boolean(),
	letterSpacing: z.number(),
	lineHeight: z.number().positive(),
	align: z.enum(['left', 'center', 'right', 'justify']),
	fill,
	uppercase: z.boolean(),
	effects: z.object({
		shadow: shadow.optional(),
		outline: z.object({ color, width: z.number() }).optional(),
		background: z.object({ color, padding: z.number(), cornerRadius: z.number() }).optional()
	})
});

const image = z.object({
	...base,
	type: z.literal('image'),
	src: z.string().max(4096),
	assetId: z.string().optional(),
	originalSrc: z.string().max(4096).optional(),
	naturalWidth: z.number().positive(),
	naturalHeight: z.number().positive(),
	crop: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
	cornerRadius: z.number(),
	border: z.object({ color, width: z.number() }).optional(),
	filters: z.object({
		brightness: z.number(),
		contrast: z.number(),
		saturation: z.number(),
		blur: z.number(),
		grayscale: z.boolean(),
		sepia: z.boolean()
	}),
	shadow: shadow.optional()
});

const shape = z.object({
	...base,
	type: z.literal('shape'),
	shape: z.enum([
		'rect',
		'ellipse',
		'triangle',
		'diamond',
		'pentagon',
		'hexagon',
		'star',
		'arrow-right',
		'heart',
		'speech'
	]),
	fill,
	stroke: color,
	strokeWidth: z.number().nonnegative(),
	dash: z.boolean(),
	cornerRadius: z.number(),
	shadow: shadow.optional()
});

const line = z.object({
	...base,
	type: z.literal('line'),
	stroke: color,
	strokeWidth: z.number().nonnegative(),
	dash: z.enum(['solid', 'dashed', 'dotted']),
	startArrow: z.boolean(),
	endArrow: z.boolean()
});

const icon = z.object({
	...base,
	type: z.literal('icon'),
	svg: z.string().max(200_000),
	color
});

const crop = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() });

const frame = z.object({
	...base,
	type: z.literal('frame'),
	frame: z.enum([
		'square',
		'rounded',
		'circle',
		'arch',
		'triangle',
		'diamond',
		'hexagon',
		'star',
		'burst',
		'heart',
		'arrow',
		'scallop',
		'blob',
		'leaf',
		'parallelogram',
		'polaroid',
		'film',
		'phone',
		'tablet',
		'laptop',
		'browser',
		'letter'
	]),
	char: z.string().max(2).optional(),
	image: z
		.object({
			src: z.string().max(4096),
			assetId: z.string().optional(),
			naturalWidth: z.number().positive(),
			naturalHeight: z.number().positive(),
			crop
		})
		.optional()
});

export const elementSchema: z.ZodType<Element> = z.lazy(() =>
	z.discriminatedUnion('type', [
		text,
		image,
		shape,
		line,
		icon,
		frame,
		z.object({ ...base, type: z.literal('group'), children: z.array(elementSchema) })
	])
);

export const designDataSchema: z.ZodType<DesignData> = z.object({
	width: z.number().positive().max(20_000),
	height: z.number().positive().max(20_000),
	pages: z
		.array(
			z.object({
				id: z.string().min(1).max(64),
				title: z.string().max(200).optional(),
				background: z.object({
					color: fill,
					image: z.object({ src: z.string().max(4096), assetId: z.string().optional() }).optional()
				}),
				elements: z.array(elementSchema),
				notes: z.string().max(20_000).optional(),
				transition: z
					.object({
						type: z.enum(TRANSITION_TYPES),
						duration: z.number().min(0.1).max(3),
						direction: z.enum(TRANSITION_DIRECTIONS)
					})
					.optional()
			})
		)
		.min(1)
		.max(200)
});
