import { boolean, index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { DesignData } from '../../editor/model/types';
import { user } from './auth.schema';

export const design = pgTable(
	'design',
	{
		id: text('id').primaryKey(),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull().default('Untitled design'),
		width: integer('width').notNull(),
		height: integer('height').notNull(),
		data: jsonb('data').$type<DesignData>().notNull(),
		thumbnailKey: text('thumbnail_key'),
		isTemplate: boolean('is_template').notNull().default(false),
		templateCategory: text('template_category'),
		/** Optimistic concurrency: clients send the version they edited. */
		version: integer('version').notNull().default(1),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(t) => [
		index('design_owner_idx').on(t.ownerId, t.updatedAt),
		index('design_template_idx').on(t.isTemplate)
	]
);

export const asset = pgTable(
	'asset',
	{
		id: text('id').primaryKey(),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		key: text('key').notNull(),
		mime: text('mime').notNull(),
		width: integer('width'),
		height: integer('height'),
		size: integer('size').notNull(),
		/** 'upload' | 'bg_removed' | 'thumbnail' */
		kind: text('kind').notNull().default('upload'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [index('asset_owner_idx').on(t.ownerId, t.kind, t.createdAt)]
);

export * from './auth.schema';
