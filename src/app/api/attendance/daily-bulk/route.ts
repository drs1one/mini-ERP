import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface AttendanceRecord {
    employee_id: number;
    block1_in: string;
    block1_out: string;
    block2_in: string;
    block2_out: string;
    block3_in: string;
    block3_out: string;
    is_present: boolean;
}

// Helper to convert "HH:MM" string into total minutes
function getMinutes(timeStr: string): number {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { date, records } = body as { date: string; records: AttendanceRecord[] };

        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;

        if (!db) {
            return NextResponse.json({ success: false, error: "Database binding missing" }, { status: 500 });
        }

        if (!records || !Array.isArray(records)) {
            return NextResponse.json({ success: false, error: "Invalid records provided" }, { status: 400 });
        }

        const targetDate = date || new Date().toISOString().split('T')[0];

        for (const record of records) {
            const employee_id = record.employee_id;
            const is_present = record.is_present ?? true;

            if (!employee_id) continue;

            // 🛡️ If marked absent, save 0 hours
            if (!is_present) {
                await db.prepare(
                    `INSERT INTO time_sessions (employee_id, date, clock_in, clock_out, total_hours_worked, status)
                     VALUES (?, ?, '00:00', '00:00', 0, 'absent')
                     ON CONFLICT(employee_id, date) DO UPDATE SET clock_in='00:00', clock_out='00:00', total_hours_worked=0, status='absent'`
                ).bind(employee_id, targetDate).run();
                continue;
            }

            // 🛡️ Safely fallback all 6 blocks to prevent any 'undefined'
            const b1_in = record.block1_in || '07:30';
            const b1_out = record.block1_out || '09:30';
            const b2_in = record.block2_in || '10:45';
            const b2_out = record.block2_out || '14:00';
            const b3_in = record.block3_in || '14:45';
            const b3_out = record.block3_out || '17:00';

            // Calculate minutes across all 3 blocks
            const mins1 = Math.max(0, getMinutes(b1_out) - getMinutes(b1_in));
            const mins2 = Math.max(0, getMinutes(b2_out) - getMinutes(b2_in));
            const mins3 = Math.max(0, getMinutes(b3_out) - getMinutes(b3_in));

            const totalMinutes = mins1 + mins2 + mins3;
            const total_hours_worked = parseFloat((totalMinutes / 60).toFixed(2));

            // Check if session already exists for this employee and date
            const existing = await db.prepare(
                "SELECT id FROM time_sessions WHERE employee_id = ? AND date = ?"
            ).bind(employee_id, targetDate).first();

            if (existing) {
                await db.prepare(
                    `UPDATE time_sessions
                     SET clock_in = ?, clock_out = ?, total_hours_worked = ?, status = 'active'
                     WHERE employee_id = ? AND date = ?`
                ).bind(b1_in, b3_out, total_hours_worked, employee_id, targetDate).run();
            } else {
                await db.prepare(
                    `INSERT INTO time_sessions (employee_id, date, clock_in, clock_out, total_hours_worked, status)
                     VALUES (?, ?, ?, ?, ?, 'active')`
                ).bind(employee_id, targetDate, b1_in, b3_out, total_hours_worked).run();
            }
        }

        return NextResponse.json({ success: true, message: "Daily attendance saved successfully!" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}