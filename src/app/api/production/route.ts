import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

// Ensure table includes garment_type and taille
db.exec(`
    CREATE TABLE IF NOT EXISTS production_records (
                                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                      model_name TEXT NOT NULL,
                                                      garment_type TEXT,
                                                      taille TEXT,
                                                      quantity INTEGER NOT NULL,
                                                      unit_price REAL NOT NULL,
                                                      date TEXT NOT NULL
    )
`);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        let query = 'SELECT * FROM production_records';
        let stmt;

        if (date) {
            query += ' WHERE date = ?';
            stmt = db.prepare(query);
            const records = stmt.all(date);
            return NextResponse.json({ success: true, records });
        } else {
            stmt = db.prepare(query);
            const records = stmt.all();
            return NextResponse.json({ success: true, records });
        }
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { model_name, garment_type, taille, quantity, unit_price, date } = body;

        if (!model_name || !quantity || !unit_price || !date) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const stmt = db.prepare(`
            INSERT INTO production_records (model_name, garment_type, taille, quantity, unit_price, date) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(model_name, garment_type || '', taille || '', quantity, unit_price, date);

        return NextResponse.json({ success: true, id: info.lastInsertRowid });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}