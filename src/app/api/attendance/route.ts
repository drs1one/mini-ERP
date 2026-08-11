import { NextResponse } from 'next/server';

// ==========================================
// DATABASE HELPERS (Self-contained)
// ==========================================
async function getDb() {
    try {
        // @ts-ignore
        const { env } = await import('@opennext/cloudflare');
        if (env?.DB) return env.DB;
    } catch {}

    if (typeof process !== 'undefined' && process.env?.DB) {
        return process.env.DB as any;
    }

    return (globalThis as any).DB as any;
}

async function ensureTable(db: any) {
    if (!db?.prepare) return;
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS time_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            block1_in TEXT,
            block1_out TEXT,
            block2_in TEXT,
            block2_out TEXT,
            block3_in TEXT,
            block3_out TEXT,
            total_hours REAL DEFAULT 0,
            is_present INTEGER DEFAULT 0,
            declaration_status TEXT DEFAULT 'declared',
            status TEXT DEFAULT 'active',
            UNIQUE(employee_id, date)
        )
    `).run();
}

// Helper function to parse time string to minutes
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

// POST: Save or update attendance records and recalculate monthly salaries
export async function POST(request: Request) {
    try {
        const db = await getDb();
        if (!db) {
            return NextResponse.json(
                { success: false, error: 'Database binding not found' },
                { status: 500 }
            );
        }
        await ensureTable(db);

        const body = (await request.json().catch(() => ({}))) as {
            attendanceDate?: string;
            date?: string;
            records?: Array<{
                employee_id: number;
                declaration_status?: string;
                is_present?: boolean;
                block1_in?: string;
                block1_out?: string;
                block2_in?: string;
                block2_out?: string;
                block3_in?: string;
                block3_out?: string;
            }>;
        };

        const attendanceDate = body.attendanceDate || body.date;
        const records = body.records;

        if (!attendanceDate || !records || !Array.isArray(records)) {
            return NextResponse.json(
                { success: false, error: 'Invalid payload data: missing attendanceDate or records array' },
                { status: 400 }
            );
        }

        for (const r of records) {
            const employeeId = r.employee_id;
            const declarationStatus = r.declaration_status === 'not_declared' ? 'not_declared' : 'declared';
            const isPresent = r.is_present ? 1 : 0;

            let totalHours = 0;
            if (isPresent) {
                const w1 = getMinutesBetween(r.block1_in || '', r.block1_out || '');
                const w2 = getMinutesBetween(r.block2_in || '', r.block2_out || '');
                const w3 = getMinutesBetween(r.block3_in || '', r.block3_out || '');
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

        const yearMonth = attendanceDate.substring(0, 7);

        await db.prepare(`
            UPDATE employees 
            SET 
                gross_salary = (
                    COALESCE(
                        (SELECT SUM(t.total_hours) FROM time_sessions t WHERE t.employee_id = employees.id AND t.date LIKE ?), 
                        0
                    ) * COALESCE(hourly_rate, 0)
                ) + COALESCE(transport_allowance, 0) + COALESCE(prime, 0),
                
                net_salary = (
                    (
                        COALESCE(
                            (SELECT SUM(t.total_hours) FROM time_sessions t WHERE t.employee_id = employees.id AND t.date LIKE ?), 
                            0
                        ) * COALESCE(hourly_rate, 0)
                    ) + COALESCE(transport_allowance, 0) + COALESCE(prime, 0)
                ) - COALESCE(advance, 0) - COALESCE(credit, 0)
        `).bind(`${yearMonth}%`, `${yearMonth}%`).run();

        return NextResponse.json({
            success: true,
            message: 'Attendance and monthly salaries saved successfully!'
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}