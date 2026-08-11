import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: Request) {
    try {
        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;

        if (!db) {
            return NextResponse.json({ success: false, error: "Database binding missing" }, { status: 500 });
        }

        const body = (await request.json()) as any;
        const { attendanceDate, records } = body;

        if (!attendanceDate || !records || !Array.isArray(records)) {
            return NextResponse.json({ success: false, error: "Invalid payload data" }, { status: 400 });
        }

        // Loop through each employee's record for the day and upsert into time_sessions
        for (const rec of records) {
            const {
                employee_id,
                block1_in,
                block1_out,
                block2_in,
                block2_out,
                block3_in,
                block3_out,
                total_hours,
                is_present,
                declaration_status // <-- Capture declaration status from frontend
            } = rec;

            await db.prepare(`
                INSERT INTO time_sessions
                (employee_id, date, block1_in, block1_out, block2_in, block2_out, block3_in, block3_out, total_hours, is_present, declaration_status, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
                    ON CONFLICT(employee_id, date) DO UPDATE SET
                    block1_in = excluded.block1_in,
                                                          block1_out = excluded.block1_out,
                                                          block2_in = excluded.block2_in,
                                                          block2_out = excluded.block2_out,
                                                          block3_in = excluded.block3_in,
                                                          block3_out = excluded.block3_out,
                                                          total_hours = excluded.total_hours,
                                                          is_present = excluded.is_present,
                                                          declaration_status = excluded.declaration_status;
            `).bind(
                employee_id,
                attendanceDate,
                block1_in || '',
                block1_out || '',
                block2_in || '',
                block2_out || '',
                block3_in || '',
                block3_out || '',
                total_hours || 0,
                is_present ? 1 : 0,
                declaration_status || 'declared' // <-- Save 'declared' or 'not_declared'
            ).run();
        }

        return NextResponse.json({
            success: true,
            message: "Daily attendance and declaration statuses saved successfully!"
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}