import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST() {
    try {
        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;

        if (!db) {
            return NextResponse.json({ success: false, error: "Database binding missing" }, { status: 500 });
        }

        // Fetch all employees
        const { results: employees } = await db.prepare("SELECT * FROM employees").all();

        if (!employees || employees.length === 0) {
            return NextResponse.json({ success: false, error: "No employees found to apply schedule" }, { status: 400 });
        }

        // Standard standard weekly hours calculation:
        // Mon, Tue, Wed, Thu, Sat: 07:30 to 16:30 = 9 hours - 30m break = 8.5 hours * 5 days = 42.5 hours
        // Friday: 07:30 to 16:30 = 9 hours - 1h 30m break = 7.5 hours
        // Total standard weekly hours = 50 hours (adjust if your standard is different)
        const STANDARD_WEEKLY_HOURS = 50.0;

        for (const emp of employees as any[]) {
            const employee_id = emp.id;
            const hourlyRate = emp.hourly_rate || 0;
            const transport = emp.transport_allowance || 0;
            const prime = emp.prime || 0;
            const advance = emp.advance || 0;
            const credit = emp.credit || 0;

            // Clear old time sessions for a clean slate, or insert standard weekly block
            await db.prepare("DELETE FROM time_sessions WHERE employee_id = ?").bind(employee_id).run();

            // Insert a standard summary session or weekly block
            await db.prepare(
                `INSERT INTO time_sessions (employee_id, date, clock_in, clock_out, total_hours_worked, status) 
                 VALUES (?, ?, '07:30', '16:30', ?, 'standard_week')`
            ).bind(employee_id, new Date().toISOString().split('T')[0], STANDARD_WEEKLY_HOURS).run();

            // Calculate new Gross & Net salary automatically
            const grossSalary = (hourlyRate * STANDARD_WEEKLY_HOURS) + transport + prime;
            const totalNet = grossSalary - advance - credit;

            // Update employee record
            await db.prepare(
                "UPDATE employees SET weekly_hours = ?, total_net = ? WHERE id = ?"
            ).bind(STANDARD_WEEKLY_HOURS, totalNet, employee_id).run();
        }

        return NextResponse.json({
            success: true,
            message: "Standard weekly schedule successfully applied to all employees!"
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}