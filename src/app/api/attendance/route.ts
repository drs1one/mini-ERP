import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface AttendanceRequestBody {
    employee_id: number;
    date: string;
    clock_in: string;
    clock_out: string;
    day_of_week?: string;
}

function calculateWorkedHours(clockIn: string, clockOut: string, dayOfWeek: string): number {
    const [inHours, inMinutes] = clockIn.split(':').map(Number);
    const [outHours, outMinutes] = clockOut.split(':').map(Number);

    const totalMinutesWorked = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    // Friday automatically gets 1h 30m (90 mins) break, other days get 30 mins break
    const pauseMinutes = dayOfWeek.toLowerCase() === 'friday' ? 90 : 30;

    const netMinutes = totalMinutesWorked - pauseMinutes;
    return Math.max(0, parseFloat((netMinutes / 60).toFixed(2)));
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as AttendanceRequestBody;
        const { employee_id, date, clock_in, clock_out, day_of_week = 'Monday' } = body;

        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;

        if (!db) {
            return NextResponse.json({ success: false, error: "Database binding missing" }, { status: 500 });
        }

        // 1. Calculate exact worked hours based on individual start & end times
        const total_hours_worked = calculateWorkedHours(clock_in, clock_out, day_of_week);

        // 2. Insert or log the shift session
        await db.prepare(
            `INSERT INTO time_sessions (employee_id, date, clock_in, clock_out, total_hours_worked, status)
             VALUES (?, ?, ?, ?, ?, 'completed')`
        ).bind(
            employee_id,
            date || new Date().toISOString().split('T')[0],
            clock_in,
            clock_out,
            total_hours_worked
        ).run();

        // 3. Sum all hours for this specific employee across their sessions
        const sessionsResult: any = await db.prepare(
            "SELECT SUM(total_hours_worked) as total_worked FROM time_sessions WHERE employee_id = ?"
        ).bind(employee_id).first();

        const accumulatedHours = sessionsResult?.total_worked || 0;

        // 4. Fetch employee financial details and recalculate Gross & Net Salary automatically
        const emp: any = await db.prepare("SELECT * FROM employees WHERE id = ?").bind(employee_id).first();

        if (emp) {
            const earnedFromHours = (emp.hourly_rate || 0) * accumulatedHours;
            const grossSalary = earnedFromHours + (emp.transport_allowance || 0) + (emp.prime || 0);
            const newTotalNet = grossSalary - (emp.advance || 0) - (emp.credit || 0);

            await db.prepare(
                "UPDATE employees SET weekly_hours = ?, total_net = ? WHERE id = ?"
            ).bind(accumulatedHours, newTotalNet, employee_id).run();
        }

        return NextResponse.json({
            success: true,
            accumulatedHours,
            message: "Individual employee hours and salary updated successfully!"
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}