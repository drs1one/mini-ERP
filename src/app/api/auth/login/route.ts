import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface LoginRequest {
    username: string;
    password: string;
}

// Helper function to hash passwords securely using Web Crypto API
async function hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as LoginRequest;
        const { username, password } = body;

        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;

        if (!db) {
            return NextResponse.json({ success: false, error: "Database binding missing" }, { status: 500 });
        }

        // Hash the incoming password attempt
        const hashedPassword = await hashPassword(password);

        // Check against the database hash
        const admin: any = await db.prepare(
            "SELECT * FROM admins WHERE username = ? AND password = ?"
        ).bind(username, hashedPassword).first();

        if (!admin) {
            return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
        }

        return NextResponse.json({ success: true, message: "Logged in successfully" });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}