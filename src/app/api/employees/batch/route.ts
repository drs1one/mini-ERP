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

export async function POST(request: Request) {
    try {
        const body = await request.json() as { employees: any[] };
        const { employees } = body;

        if (!employees || !Array.isArray(employees) || employees.length === 0) {
            return NextResponse.json({ success: false, error: 'Invalid or empty employee array' }, { status: 400 });
        }

        const db = await getDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database binding (DB) not found' }, { status: 500 });
        }

        const stmt = db.prepare(`
            INSERT INTO employees (
                matricule, name, cin, phone, address, birth_date, age, is_student, hourly_rate, 
                has_transport, transport_allowance, prime, gross_salary, advance, credit, 
                primary_station, secondary_stations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        for (const emp of employees) {
            await stmt.bind(
                emp.matricule || '',
                emp.name || '',
                emp.cin || '',
                emp.phone || '',
                emp.address || '',
                emp.birth_date || '',
                Number(emp.age) || 0,
                emp.is_student ? 1 : 0,
                Number(emp.hourly_rate) || 0,
                emp.has_transport ? 1 : 0,
                Number(emp.transport_allowance) || 0,
                Number(emp.prime) || 0,
                Number(emp.gross_salary) || 0,
                Number(emp.advance) || 0,
                Number(emp.credit) || 0,
                emp.primary_station || '5yata',
                JSON.stringify(emp.secondary_stations || [])
            ).run();
            count++;
        }

        return NextResponse.json({ success: true, count });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}