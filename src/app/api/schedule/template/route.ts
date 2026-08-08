import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET() {
    try {
        const { env } = await getCloudflareContext();
        const db = (env as any).DB;

        const { results: rules } = await db.prepare('SELECT * FROM weekly_schedule_template').all();
        return NextResponse.json({ success: true, rules: rules || [] });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { env } = await getCloudflareContext();
        const db = (env as any).DB;

        const body = await request.json();
        const { day_of_week, block1_in, block1_out, block2_in, block2_out, block3_in, block3_out, is_working_day } = body;

        if (!day_of_week) {
            return NextResponse.json({ success: false, error: 'Day of week is required' }, { status: 400 });
        }

        await db.prepare(`
            INSERT INTO weekly_schedule_template (day_of_week, block1_in, block1_out, block2_in, block2_out, block3_in, block3_out, is_working_day)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(day_of_week) DO UPDATE SET
                block1_in = excluded.block1_in,
                                                block1_out = excluded.block1_out,
                                                block2_in = excluded.block2_in,
                                                block2_out = excluded.block2_out,
                                                block3_in = excluded.block3_in,
                                                block3_out = excluded.block3_out,
                                                is_working_day = excluded.is_working_day
        `).bind(
            day_of_week,
            block1_in || '',
            block1_out || '',
            block2_in || '',
            block2_out || '',
            block3_in || '',
            block3_out || '',
            is_working_day ? 1 : 0
        ).run();

        return NextResponse.json({ success: true, message: `Template for ${day_of_week} registered successfully!` });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}