import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET() {
    try {
        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;
        if (!db) return NextResponse.json({ success: false, error: "DB missing" }, { status: 500 });

        const { results } = await db.prepare("SELECT * FROM weekly_schedule_template").all();
        return NextResponse.json({ success: true, template: results });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { day_of_week, default_clock_in, default_clock_out, break_minutes, is_working_day } = body;

        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;
        if (!db) return NextResponse.json({ success: false, error: "DB missing" }, { status: 500 });

        await db.prepare(
            `INSERT INTO weekly_schedule_template (day_of_week, default_clock_in, default_clock_out, break_minutes, is_working_day)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(day_of_week) DO UPDATE SET
             default_clock_in = excluded.default_clock_in,
             default_clock_out = excluded.default_clock_out,
             break_minutes = excluded.break_minutes,
             is_working_day = excluded.is_working_day`
        ).bind(day_of_week, default_clock_in, default_clock_out, break_minutes, is_working_day ? 1 : 0).run();

        return NextResponse.json({ success: true, message: "Weekly template rule updated successfully!" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}