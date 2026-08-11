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

async function ensureTables(db: any) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS drivers (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               name TEXT NOT NULL,
                                               phone TEXT
        )
    `).run();

    await db.prepare(`
        CREATE TABLE IF NOT EXISTS daily_driver_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            driver_id INTEGER,
            arrival_done INTEGER DEFAULT 1,
            departure_done INTEGER DEFAULT 1,
            is_fault INTEGER DEFAULT 0,
            cost REAL DEFAULT 0,
            UNIQUE(date, driver_id)
        )
    `).run();

    try {
        await db.prepare(`ALTER TABLE employees ADD COLUMN has_transport INTEGER DEFAULT 0`).run();
    } catch {}

    try {
        await db.prepare(`ALTER TABLE employees ADD COLUMN driver_id INTEGER DEFAULT NULL`).run();
    } catch {}
}

export async function GET(request: Request) {
    try {
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }
        await ensureTables(db);

        const url = new URL(request.url);
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

        const { results: drivers } = await db.prepare(`SELECT * FROM drivers ORDER BY name ASC`).all();
        const { results: employees } = await db.prepare(`SELECT id, matricule, name, has_transport, driver_id FROM employees ORDER BY name ASC`).all();
        const { results: logs } = await db.prepare(`SELECT * FROM daily_driver_logs WHERE date = ?`).bind(date).all();

        return NextResponse.json({
            success: true,
            drivers: drivers || [],
            employees: employees || [],
            logs: logs || []
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as any;
        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }
        await ensureTables(db);

        const { action } = body;

        if (action === 'add_driver') {
            const { name, phone } = body;
            if (!name) {
                return NextResponse.json({ success: false, error: 'Driver name is required' }, { status: 400 });
            }
            await db.prepare(`INSERT INTO drivers (name, phone) VALUES (?, ?)`).bind(name, phone || '').run();
            return NextResponse.json({ success: true });
        }

        if (action === 'delete_driver') {
            const { driver_id } = body;
            await db.prepare(`DELETE FROM drivers WHERE id = ?`).bind(driver_id).run();
            await db.prepare(`UPDATE employees SET driver_id = NULL, has_transport = 0 WHERE driver_id = ?`).bind(driver_id).run();
            return NextResponse.json({ success: true });
        }

        if (action === 'save_roster') {
            const { assignments } = body; // [{ id, driver_id }]
            const stmt = db.prepare(`UPDATE employees SET driver_id = ?, has_transport = ? WHERE id = ?`);
            for (const a of assignments) {
                await stmt.bind(a.driver_id || null, a.driver_id ? 1 : 0, a.id).run();
            }
            return NextResponse.json({ success: true });
        }

        if (action === 'save_logs') {
            const { date, logs } = body; // [{ driver_id, arrival_done, departure_done, is_fault, cost }]
            const tripDate = date || new Date().toISOString().split('T')[0];
            const stmt = db.prepare(`
                INSERT INTO daily_driver_logs (date, driver_id, arrival_done, departure_done, is_fault, cost)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, driver_id) DO UPDATE SET
                    arrival_done = excluded.arrival_done,
                    departure_done = excluded.departure_done,
                    is_fault = excluded.is_fault,
                    cost = excluded.cost
            `);
            for (const l of logs) {
                await stmt.bind(
                    tripDate,
                    l.driver_id,
                    l.arrival_done ? 1 : 0,
                    l.departure_done ? 1 : 0,
                    l.is_fault ? 1 : 0,
                    l.cost
                ).run();
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}