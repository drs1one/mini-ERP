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
        CREATE TABLE IF NOT EXISTS employees (
                                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 matricule TEXT,
                                                 name TEXT,
                                                 cin TEXT,
                                                 phone TEXT,
                                                 address TEXT,
                                                 birth_date TEXT,
                                                 age INTEGER DEFAULT 0,
                                                 is_student INTEGER DEFAULT 0,
                                                 hourly_rate REAL DEFAULT 0,
                                                 weekly_hours REAL DEFAULT 0,
                                                 has_transport INTEGER DEFAULT 0,
                                                 transport_allowance REAL DEFAULT 0,
                                                 prime REAL DEFAULT 0,
                                                 gross_salary REAL DEFAULT 0,
                                                 advance REAL DEFAULT 0,
                                                 credit REAL DEFAULT 0,
                                                 net_salary REAL DEFAULT 0,
                                                 primary_station TEXT DEFAULT '5yata',
                                                 secondary_stations TEXT DEFAULT '[]'
        )
    `).run();

    // Patch existing tables if columns are missing
    try { await db.prepare(`ALTER TABLE employees ADD COLUMN birth_date TEXT`).run(); } catch {}
    try { await db.prepare(`ALTER TABLE employees ADD COLUMN weekly_hours REAL DEFAULT 0`).run(); } catch {}
    try { await db.prepare(`ALTER TABLE employees ADD COLUMN gross_salary REAL DEFAULT 0`).run(); } catch {}
    try { await db.prepare(`ALTER TABLE employees ADD COLUMN net_salary REAL DEFAULT 0`).run(); } catch {}
    try { await db.prepare(`ALTER TABLE employees ADD COLUMN primary_station TEXT DEFAULT '5yata'`).run(); } catch {}
    try { await db.prepare(`ALTER TABLE employees ADD COLUMN secondary_stations TEXT DEFAULT '[]'`).run(); } catch {}
}

// GET: Fetch all employees with their registered database salaries
export async function GET() {
    try {
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }
        await ensureTable(db);

        const { results } = await db.prepare(`SELECT * FROM employees`).all();

        const formattedResults = (results || []).map((emp: any) => ({
            ...emp,
            secondary_stations: JSON.parse(emp.secondary_stations || '[]')
        }));

        return NextResponse.json({ success: true, employees: formattedResults });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// POST: Create a new employee and register calculated gross and net salary in the DB
export async function POST(request: Request) {
    try {
        const body = (await request.json()) as any;
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }
        await ensureTable(db);

        const {
            matricule, name, cin, phone, address, birth_date, age, is_student,
            hourly_rate, weekly_hours, has_transport, transport_allowance,
            prime, advance, credit, primary_station, secondary_stations
        } = body;

        const hRate = Number(hourly_rate) || 0;
        const wHours = Number(weekly_hours) || 0;
        const tAllowance = Number(transport_allowance) || 0;
        const pPrime = Number(prime) || 0;
        const adv = Number(advance) || 0;
        const cred = Number(credit) || 0;

        // Calculate and register exact values in DB
        const grossSalary = (wHours * hRate) + tAllowance + pPrime;
        const netSalary = grossSalary - adv - cred;
        const secondaryStationsJson = JSON.stringify(secondary_stations || []);

        const res = await db.prepare(`
            INSERT INTO employees (
                matricule, name, cin, phone, address, birth_date, age, is_student, 
                hourly_rate, weekly_hours, has_transport, transport_allowance, 
                prime, gross_salary, advance, credit, net_salary, primary_station, secondary_stations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            matricule || '', name || '', cin || '', phone || '', address || '',
            birth_date || '', Number(age) || 0, is_student ? 1 : 0,
            hRate, wHours, has_transport ? 1 : 0, tAllowance,
            pPrime, grossSalary, adv, cred, netSalary,
            primary_station || '5yata', secondaryStationsJson
        ).run();

        return NextResponse.json({ success: true, id: res.meta.last_row_id });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// PUT: Update an existing employee and re-register gross and net salary in the DB
export async function PUT(request: Request) {
    try {
        const body = (await request.json()) as any;
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }
        await ensureTable(db);

        const {
            id, matricule, name, cin, phone, address, birth_date, age, is_student,
            hourly_rate, weekly_hours, has_transport, transport_allowance,
            prime, advance, credit, primary_station, secondary_stations
        } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
        }

        const hRate = Number(hourly_rate) || 0;
        const wHours = Number(weekly_hours) || 0;
        const tAllowance = Number(transport_allowance) || 0;
        const pPrime = Number(prime) || 0;
        const adv = Number(advance) || 0;
        const cred = Number(credit) || 0;

        const grossSalary = (wHours * hRate) + tAllowance + pPrime;
        const netSalary = grossSalary - adv - cred;
        const secondaryStationsJson = JSON.stringify(secondary_stations || []);

        await db.prepare(`
            UPDATE employees
            SET matricule = ?, name = ?, cin = ?, phone = ?, address = ?, birth_date = ?,
                age = ?, is_student = ?, hourly_rate = ?, weekly_hours = ?, has_transport = ?,
                transport_allowance = ?, prime = ?, gross_salary = ?, advance = ?, credit = ?,
                net_salary = ?, primary_station = ?, secondary_stations = ?
            WHERE id = ?
        `).bind(
            matricule || '', name || '', cin || '', phone || '', address || '',
            birth_date || '', Number(age) || 0, is_student ? 1 : 0,
            hRate, wHours, has_transport ? 1 : 0, tAllowance,
            pPrime, grossSalary, adv, cred, netSalary,
            primary_station || '5yata', secondaryStationsJson, id
        ).run();

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const db = await getDb();
        if (!db) return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });

        const body = await request.json() as { id?: number; ids?: number[] };

        if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
            const placeholders = body.ids.map(() => '?').join(',');
            await db.prepare(`DELETE FROM employees WHERE id IN (${placeholders})`).bind(...body.ids).run();
        } else if (body.id) {
            await db.prepare(`DELETE FROM employees WHERE id = ?`).bind(body.id).run();
        } else {
            return NextResponse.json({ success: false, error: 'No employee ID(s) provided' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}