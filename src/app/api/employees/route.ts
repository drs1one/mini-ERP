import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface EmployeeRequestBody {
    matricule: string;
    name: string;
    hourly_rate?: number;
    has_transport?: boolean;
    transport_allowance?: number;
    prime?: number;
    advance?: number;
    credit?: number;
}

export async function GET() {
    try {
        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;

        if (!db) {
            return NextResponse.json({ success: false, error: "Database binding missing" }, { status: 500 });
        }

        const { results } = await db.prepare("SELECT * FROM employees").all();

        // Valeurs par défaut pour l'affichage du tableau récapitulatif
        const employeesWithCalculations = results.map((emp: any) => {
            const weeklyHours = emp.weekly_hours || 40; // Valeur par défaut ou calculée depuis la présence
            const grossSalary = ((emp.hourly_rate || 0) * weeklyHours) + (emp.prime || 0) + (emp.transport_allowance || 0);
            const totalNet = grossSalary - (emp.advance || 0) - (emp.credit || 0);

            return {
                ...emp,
                weekly_hours: weeklyHours,
                gross_salary: parseFloat(grossSalary.toFixed(2)),
                total_net: parseFloat(totalNet.toFixed(2))
            };
        });

        return NextResponse.json({ success: true, employees: employeesWithCalculations });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as EmployeeRequestBody;
        const {
            matricule,
            name,
            hourly_rate = 0,
            has_transport = true,
            transport_allowance = 5,
            prime = 0,
            advance = 0,
            credit = 0
        } = body;

        const cfContext = await getCloudflareContext();
        //@ts-ignore
        const db = cfContext?.env?.DB || process.env.DB;

        if (!db) {
            return NextResponse.json({ success: false, error: "Database binding missing" }, { status: 500 });
        }

        const finalTransport = has_transport ? Number(transport_allowance) : 0;

        await db.prepare(
            `INSERT INTO employees (matricule, name, hourly_rate, has_transport, transport_allowance, prime, advance, credit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            matricule,
            name,
            Number(hourly_rate),
            has_transport ? 1 : 0,
            finalTransport,
            Number(prime),
            Number(advance),
            Number(credit)
        ).run();

        return NextResponse.json({ success: true, message: "Employee added successfully" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}