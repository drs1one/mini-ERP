import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

async function getDb() {
    try {
        const { env } = await getCloudflareContext();
        // @ts-ignore
        if (env?.DB) return env.DB;
    } catch {}

    try {
        // @ts-ignore
        const { env } = await import('@opennextjs/cloudflare').catch(() => ({}));
        if (env?.DB) return env.DB;
    } catch {}

    // @ts-ignore
    if (typeof process !== 'undefined' && process.env?.DB) {
        // @ts-ignore
        return process.env.DB;
    }

    return null;
}

// GET: Fetch the standard schedule template
export async function GET() {
    try {
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }

        const { results } = await db.prepare(`SELECT * FROM weekly_schedule_template ORDER BY id`).all();
        return NextResponse.json({ success: true, template: results || [] });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// POST: Upsert standard schedule template for a day
export async function POST(request: Request) {
    try {
        const body = (await request.json()) as any;
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }

        const {
            day_of_week,
            block1_in,
            block1_out,
            block2_in,
            block2_out,
            block3_in,
            block3_out
        } = body;

        if (!day_of_week) {
            return NextResponse.json({ success: false, error: 'Day of week is required' }, { status: 400 });
        }

        await db.prepare(`
            INSERT INTO weekly_schedule_template (day_of_week, block1_in, block1_out, block2_in, block2_out, block3_in, block3_out)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(day_of_week) DO UPDATE SET
                block1_in = excluded.block1_in,
                block1_out = excluded.block1_out,
                block2_in = excluded.block2_in,
                block2_out = excluded.block2_out,
                block3_in = excluded.block3_in,
                block3_out = excluded.block3_out
        `).bind(
            day_of_week,
            block1_in || '',
            block1_out || '',
            block2_in || '',
            block2_out || '',
            block3_in || '',
            block3_out || ''
        ).run();

        return NextResponse.json({ success: true, message: 'Template saved successfully' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}