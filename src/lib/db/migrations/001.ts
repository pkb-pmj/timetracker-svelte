import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('nodes')
		.addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
		.addColumn('name', 'text', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('intervals')
		.addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
		.addColumn('start_time', 'integer', (col) => col.notNull())
		.addColumn('end_time', 'integer')
		.addColumn('start_node_id', 'integer', (col) => col.references('nodes.id').notNull())
		.addColumn('end_node_id', 'integer', (col) => col.references('nodes.id'))
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('intervals').execute();
	await db.schema.dropTable('nodes').execute();
}
