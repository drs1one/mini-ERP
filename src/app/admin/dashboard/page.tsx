'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmployeeForm from '@/components/EmployeeForm';
import TemplatePlanner from '@/components/TemplatePlanner';
import DailyAttendanceSheet from '@/components/DailyAttendanceSheet';
import PayrollSummary from '@/components/PayrollSummary';

interface Employee {
    id: number;
    matricule: string;
    name: string;
    hourly_rate: number;
    weekly_hours: number;
    has_transport: number;
    transport_allowance: number;
    prime: number;
    gross_salary: number;
    advance: number;
    credit: number;
    total_net: number;
}

interface TemplateRule {
    day_of_week: string;
    block1_in: string;
    block1_out: string;
    block2_in: string;
    block2_out: string;
    block3_in: string;
    block3_out: string;
    is_working_day: number;
}

interface DailyRow {
    employee_id: number;
    block1_in: string;
    block1_out: string;
    block2_in: string;
    block2_out: string;
    block3_in: string;
    block3_out: string;
    is_present: boolean;
}

const getMoroccanToday = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Casablanca',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
};

export default function AdminDashboard() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [templateRules, setTemplateRules] = useState<TemplateRule[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const [attendanceDate, setAttendanceDate] = useState<string>(getMoroccanToday());
    const [selectedDay, setSelectedDay] = useState<string>('Monday');
    const [dailyRecords, setDailyRecords] = useState<Record<number, DailyRow>>({});

    const router = useRouter();

    const fetchData = async () => {
        try {
            const [empRes, tempRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/schedule/template')
            ]);
            const empData = await empRes.json() as { success?: boolean; employees?: Employee[] };
            const tempD = await tempRes.json() as { success?: boolean; template?: TemplateRule[]; rules?: TemplateRule[] };

            if (empData.success && empData.employees) {
                setEmployees(empData.employees);
            }
            if (tempD.success) {
                const loadedRules = tempD.rules || tempD.template || [];
                setTemplateRules(loadedRules);

                const d = new Date(getMoroccanToday());
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const initialDay = days[d.getDay()];
                setSelectedDay(initialDay);

                if (empData.employees) {
                    applyTemplateToSheet(initialDay, empData.employees, loadedRules);
                }
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const applyTemplateToSheet = (day: string, empList: Employee[], rules: TemplateRule[]) => {
        const initialRecords: Record<number, DailyRow> = {};

        // FIX: Make the matching case-insensitive and ignore trailing spaces
        const rule = rules.find(r =>
            r.day_of_week && r.day_of_week.toLowerCase().trim() === day.toLowerCase().trim()
        );

        empList.forEach((emp) => {
            if (rule) {
                // DB has a template: use exact DB values
                const isWorking = Boolean(rule.is_working_day);
                initialRecords[emp.id] = {
                    employee_id: emp.id,
                    block1_in: rule.block1_in || '',
                    block1_out: rule.block1_out || '',
                    block2_in: rule.block2_in || '',
                    block2_out: rule.block2_out || '',
                    block3_in: rule.block3_in || '',
                    block3_out: rule.block3_out || '',
                    is_present: isWorking,
                };
            } else {
                // NO template in DB for this day: default to Absent & Empty
                initialRecords[emp.id] = {
                    employee_id: emp.id,
                    block1_in: '', block1_out: '',
                    block2_in: '', block2_out: '',
                    block3_in: '', block3_out: '',
                    is_present: false,
                };
            }
        });
        setDailyRecords(initialRecords);
    };

    const handleDateChange = (dateStr: string) => {
        setAttendanceDate(dateStr);
        if (dateStr) {
            const d = new Date(dateStr);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentDay = days[d.getDay()];
            setSelectedDay(currentDay);
            applyTemplateToSheet(currentDay, employees, templateRules);
        }
    };

    const handleTimeChange = (empId: number, field: keyof DailyRow, value: string | boolean) => {
        setDailyRecords(prev => ({
            ...prev,
            [empId]: { ...prev[empId], [field]: value }
        }));
    };

    const handleDeleteEmployee = async (id: number) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        try {
            const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.success) {
                fetchData();
            } else {
                alert(data.error || 'Failed to delete employee');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(message);
        }
    };

    const handleSaveDailyAttendance = async () => {
        try {
            const recordsArray = Object.values(dailyRecords);
            const res = await fetch('/api/attendance/daily-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: attendanceDate, records: recordsArray })
            });
            const data = await res.json() as { success?: boolean; message?: string; error?: string };
            if (data.success) {
                alert(data.message || 'Attendance saved successfully!');
                fetchData();
            } else {
                alert(data.error || 'Failed to save attendance');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Tixtile Admin Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-1">Modular Attendance & Payroll Control</p>
                    </div>
                    <button onClick={() => router.push('/')} className="bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 font-medium shadow-md">
                        Logout
                    </button>
                </div>

                {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <EmployeeForm onEmployeeAdded={fetchData} />
                    <TemplatePlanner templateRules={templateRules} onRuleSaved={fetchData} />
                </div>

                <DailyAttendanceSheet
                    employees={employees}
                    dailyRecords={dailyRecords}
                    selectedDay={selectedDay}
                    attendanceDate={attendanceDate}
                    loading={loading}
                    onDateChange={handleDateChange}
                    onTimeChange={handleTimeChange}
                    onSave={handleSaveDailyAttendance}
                />

                <PayrollSummary employees={employees} loading={loading} onDelete={handleDeleteEmployee} />
            </div>
        </div>
    );
}