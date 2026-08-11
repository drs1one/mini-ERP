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

async function ensureTable(db: any) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS time_sessions (
                                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     employee_id INTEGER,
                                                     date TEXT,
                                                     block1_in TEXT,
                                                     block1_out TEXT,
                                                     block2_in TEXT,
                                                     block2_out TEXT,
                                                     block3_in TEXT,
                                                     block3_out TEXT,
                                                     total_hours REAL,
                                                     is_present INTEGER,
                                                     declaration_status TEXT DEFAULT 'declared',
                                                     status TEXT,
                                                     UNIQUE(employee_id, date)
            )
    `).run();
}

const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    let clean = String(timeStr).trim();
    let parts = clean.split(' ');
    let time = parts[0];
    let modifier = parts[1] ? parts[1].toUpperCase() : '';
    if (!time) return 0;

    let [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;

    if (modifier) {
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
};

const getMinutesBetween = (start: string, end: string) => {
    const sMins = parseTimeToMinutes(start);
    const eMins = parseTimeToMinutes(end);
    const totalMins = eMins - sMins;
    return totalMins > 0 ? totalMins : 0;
};

// GET: Fetch attendance records for a specific date
export async function GET(request: Request) {
    try {
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding not found' }, { status: 500 });
        }
        await ensureTable(db);

        const url = new URL(request.url);
        const date = url.searchParams.get('date');

        if (!date) {
            return NextResponse.json({ success: false, error: 'Missing date parameter' }, { status: 400 });
        }

        const { results } = await db.prepare(
            "SELECT * FROM time_sessions WHERE date = ?"
        ).bind(date).all();

        return NextResponse.json({ success: true, records: results || [] });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// POST: Save or update attendance records including declaration_status
export async function POST(request: Request) {
    try {
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding not found' }, { status: 500 });
        }
        await ensureTable(db);

        const body = await request.json() as { attendanceDate?: string; date?: string; records: any[] };
        const attendanceDate = body.attendanceDate || body.date;
        const records = body.records;

        if (!attendanceDate || !records || !Array.isArray(records)) {
            return NextResponse.json({ success: false, error: 'Invalid payload data' }, { status: 400 });
        }

        for (const r of records) {
            const employeeId = r.employee_id;
            const declarationStatus = r.declaration_status === 'not_declared' ? 'not_declared' : 'declared';

            // CRITICAL FIX: Strictly respect is_present. If absent (0 or false), hours must be 0!
            const isPresent = r.is_present ? 1 : 0;

            let totalHours = 0;
            if (isPresent) {
                const w1 = getMinutesBetween(r.block1_in, r.block1_out);
                const w2 = getMinutesBetween(r.block2_in, r.block2_out);
                const w3 = getMinutesBetween(r.block3_in, r.block3_out);
                totalHours = Number(((w1 + w2 + w3) / 60).toFixed(2));
            }

            const status = isPresent ? 'active' : 'absent';

            await db.prepare(`
                INSERT INTO time_sessions
                (employee_id, date, block1_in, block1_out, block2_in, block2_out, block3_in, block3_out, total_hours, is_present, declaration_status, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(employee_id, date) DO UPDATE SET
                    block1_in = excluded.block1_in,
                                                          block1_out = excluded.block1_out,
                                                          block2_in = excluded.block2_in,
                                                          block2_out = excluded.block2_out,
                                                          block3_in = excluded.block3_in,
                                                          block3_out = excluded.block3_out,
                                                          total_hours = excluded.total_hours,
                                                          is_present = excluded.is_present,
                                                          declaration_status = excluded.declaration_status,
                                                          status = excluded.status
            `).bind(
                employeeId,
                attendanceDate,
                r.block1_in || '',
                r.block1_out || '',
                r.block2_in || '',
                r.block2_out || '',
                r.block3_in || '',
                r.block3_out || '',
                totalHours,
                isPresent,
                declarationStatus,
                status
            ).run();
        }

        return NextResponse.json({ success: true, message: 'Attendance and declaration status saved successfully!' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}