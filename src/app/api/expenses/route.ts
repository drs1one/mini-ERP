import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

// Ensure table exists
db.exec(`
    CREATE TABLE IF NOT EXISTS business_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_name TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL
    )
`);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        let query = 'SELECT * FROM business_expenses';
        let stmt;

        if (date) {
            query += ' WHERE date = ?';
            stmt = db.prepare(query);
            const expenses = stmt.all(date);
            return NextResponse.json({ success: true, expenses });
        } else {
            stmt = db.prepare(query);
            const expenses = stmt.all();
            return NextResponse.json({ success: true, expenses });
        }
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { expense_name, category, amount, date } = body;

        if (!expense_name || !category || !amount || !date) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const stmt = db.prepare('INSERT INTO business_expenses (expense_name, category, amount, date) VALUES (?, ?, ?, ?)');
        const info = stmt.run(expense_name, category, amount, date);

        return NextResponse.json({ success: true, id: info.lastInsertRowid });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}