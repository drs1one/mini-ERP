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

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const year = url.searchParams.get('year') || new Date().getFullYear().toString();
        const month = url.searchParams.get('month') || String(new Date().getMonth() + 1).padStart(2, '0');

        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }

        // Dynamically calculate the exact last day of the selected month
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        // Query time_sessions records joined with employees table
        const { results } = await db.prepare(`
            SELECT
                ts.*,
                e.name as employee_name,
                e.matricule as employee_matricule
            FROM time_sessions ts
                     LEFT JOIN employees e ON ts.employee_id = e.id
            WHERE ts.date >= ? AND ts.date <= ?
            ORDER BY ts.date ASC, e.matricule ASC
        `).bind(startDate, endDate).all();

        return NextResponse.json({ success: true, records: results || [] });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}