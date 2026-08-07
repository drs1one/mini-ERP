'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Employee {
    id: number;
    matricule: string;
    name: string;
    hourly_rate: number;
    weekly_hours: number;
    transport_allowance: number;
    prime: number;
    gross_salary: number;
    advance: number;
    credit: number;
    total_net: number;
}

interface TemplateRule {
    day_of_week: string;
    default_clock_in: string;
    default_clock_out: string;
    break_minutes: number;
    is_working_day: number;
}

interface DailyRow {
    employee_id: number;
    clock_in: string;
    clock_out: string;
}

// Helper to get today's date in Moroccan time zone (Africa/Casablanca)
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

    // Add Employee Form fields
    const [matricule, setMatricule] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [hourlyRate, setHourlyRate] = useState<string>('');
    const [hasTransport, setHasTransport] = useState<boolean>(true);
    const [transportAllowance, setTransportAllowance] = useState<string>('5');
    const [prime, setPrime] = useState<string>('');
    const [advance, setAdvance] = useState<string>('');
    const [credit, setCredit] = useState<string>('');

    // Daily Attendance Sheet State (Moroccan Time Zone Default)
    const [attendanceDate, setAttendanceDate] = useState<string>(getMoroccanToday());
    const [selectedDay, setSelectedDay] = useState<string>('Monday');
    const [dailyRecords, setDailyRecords] = useState<Record<number, DailyRow>>({});

    // Template Editor State
    const [editDay, setEditDay] = useState<string>('Monday');
    const [editClockIn, setEditClockIn] = useState<string>('08:30');
    const [editClockOut, setEditClockOut] = useState<string>('17:30');
    const [editBreak, setEditBreak] = useState<number>(30);
    const [editIsWorking, setEditIsWorking] = useState<boolean>(true);

    const router = useRouter();

    const fetchData = async () => {
        try {
            const [empRes, tempRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/schedule/template')
            ]);
            const empData = await empRes.json();
            const tempD = await tempRes.json();

            if (empData.success && empData.employees) {
                setEmployees(empData.employees);
            }
            if (tempD.success) {
                setTemplateRules(tempD.template || []);
                const d = new Date(getMoroccanToday());
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const initialDay = days[d.getDay()];
                setSelectedDay(initialDay);
                if (empData.employees) {
                    applyTemplateToSheet(initialDay, empData.employees, tempD.template || []);
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
        const rule = rules.find(r => r.day_of_week === day);
        const initialRecords: Record<number, DailyRow> = {};

        empList.forEach((emp) => {
            if (rule && rule.is_working_day) {
                initialRecords[emp.id] = {
                    employee_id: emp.id,
                    clock_in: rule.default_clock_in,
                    clock_out: rule.default_clock_out,
                };
            } else if (day === 'Sunday' || (rule && !rule.is_working_day)) {
                initialRecords[emp.id] = {
                    employee_id: emp.id,
                    clock_in: '00:00',
                    clock_out: '00:00',
                };
            } else {
                initialRecords[emp.id] = {
                    employee_id: emp.id,
                    clock_in: '08:30',
                    clock_out: '17:30',
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

    const handleSaveTemplateRule = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/schedule/template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_of_week: editDay,
                    default_clock_in: editClockIn,
                    default_clock_out: editClockOut,
                    break_minutes: editBreak,
                    is_working_day: editIsWorking
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                fetchData();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(message);
        }
    };

    const handleTimeChange = (empId: number, field: 'clock_in' | 'clock_out', value: string) => {
        setDailyRecords(prev => ({
            ...prev,
            [empId]: { ...prev[empId], [field]: value }
        }));
    };

    const handleAddEmployee = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const finalTransport = hasTransport ? (parseFloat(transportAllowance) || 0) : 0;
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matricule, name,
                    hourly_rate: parseFloat(hourlyRate) || 0,
                    transport_allowance: finalTransport,
                    prime: parseFloat(prime) || 0,
                    advance: parseFloat(advance) || 0,
                    credit: parseFloat(credit) || 0,
                })
            });
            const data = await res.json();
            if (data.success) {
                setMatricule(''); setName(''); setHourlyRate(''); setPrime(''); setAdvance(''); setCredit('');
                setHasTransport(true); setTransportAllowance('5');
                fetchData();
            } else {
                alert(data.error);
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
                body: JSON.stringify({
                    date: attendanceDate,
                    day_of_week: selectedDay,
                    records: recordsArray
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                fetchData();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(message);
        }
    };

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Tixtile Admin Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-1">Moroccan Time Zone Weekly Plan & Daily Attendance Control</p>
                    </div>
                    <button onClick={() => router.push('/')} className="bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 font-medium shadow-md">
                        Logout
                    </button>
                </div>

                {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Add Employee Form with French Transport Oui/Non Toggle */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold mb-4 text-gray-700">Add New Employee</h2>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Matricule</label>
                                    <input type="text" value={matricule} onChange={(e) => setMatricule(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Name</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Rate</label>
                                    <input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Transport (Oui/Non)</label>
                                    <select
                                        value={hasTransport ? 'oui' : 'non'}
                                        onChange={(e) => {
                                            const val = e.target.value === 'oui';
                                            setHasTransport(val);
                                            if (!val) setTransportAllowance('0');
                                            else setTransportAllowance('5');
                                        }}
                                        className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white"
                                    >
                                        <option value="oui">Oui</option>
                                        <option value="non">Non</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Prime</label>
                                    <input type="number" step="0.01" value={prime} onChange={(e) => setPrime(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                            </div>

                            {hasTransport && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Montant Transport (DH)</label>
                                    <input type="number" step="0.01" value={transportAllowance} onChange={(e) => setTransportAllowance(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Advance</label>
                                    <input type="number" step="0.01" value={advance} onChange={(e) => setAdvance(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Credit</label>
                                    <input type="number" step="0.01" value={credit} onChange={(e) => setCredit(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-bold">
                                Save Employee
                            </button>
                        </form>
                    </div>

                    {/* Weekly Template Setup Form with 7-Day Overview */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold mb-4 text-gray-700">Program Weekly Plan Template (All Days)</h2>

                        <div className="mb-4 grid grid-cols-7 gap-1 text-center bg-gray-50 p-2 rounded-lg border text-xs">
                            {allDays.map(d => {
                                const rule = templateRules.find(r => r.day_of_week === d);
                                const isWorking = rule ? rule.is_working_day : (d !== 'Sunday');
                                return (
                                    <div key={d} className={`p-1 rounded ${editDay === d ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-gray-700 border'}`}>
                                        <div className="font-semibold">{d.slice(0, 3)}</div>
                                        <div className="text-[10px] opacity-80">{isWorking ? `${rule?.break_minutes || 30}m break` : 'Off'}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSaveTemplateRule} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Select Day to Program</label>
                                    <select value={editDay} onChange={(e) => {
                                        const day = e.target.value;
                                        setEditDay(day);
                                        const existing = templateRules.find(r => r.day_of_week === day);
                                        if (existing) {
                                            setEditClockIn(existing.default_clock_in);
                                            setEditClockOut(existing.default_clock_out);
                                            setEditBreak(existing.break_minutes);
                                            setEditIsWorking(Boolean(existing.is_working_day));
                                        } else {
                                            if(day === 'Friday') { setEditBreak(90); setEditIsWorking(true); }
                                            else if(day === 'Sunday') { setEditBreak(0); setEditIsWorking(false); }
                                            else { setEditBreak(30); setEditIsWorking(true); }
                                        }
                                    }} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white">
                                        {allDays.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Break Pause (Minutes)</label>
                                    <input type="number" value={editBreak} onChange={(e) => setEditBreak(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Default Start (Clock In)</label>
                                    <input type="time" value={editClockIn} onChange={(e) => setEditClockIn(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Default End (Clock Out)</label>
                                    <input type="time" value={editClockOut} onChange={(e) => setEditClockOut(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={editIsWorking} onChange={(e) => setEditIsWorking(e.target.checked)} id="workingDay" />
                                <label htmlFor="workingDay" className="text-sm font-semibold text-gray-700">Is Working Day</label>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-bold">
                                Save Plan for {editDay}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Daily Attendance Sheet */}
                <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-700">Daily Attendance Sheet ({selectedDay})</h2>
                            <p className="text-xs text-gray-500 mt-1">Auto-populated from template. Adjust individual clock-out times if someone leaves early.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Select Date (Moroccan Time)</label>
                                <input type="date" value={attendanceDate} onChange={(e) => handleDateChange(e.target.value)} className="px-3 py-2 border rounded-lg text-gray-900 bg-white" />
                            </div>
                            <button onClick={handleSaveDailyAttendance} className="mt-5 bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-bold shadow-md">
                                💾 Save Today's Sheet
                            </button>
                        </div>
                    </div>

                    {loading ? <p className="text-gray-500">Loading...</p> : employees.length === 0 ? <p className="text-gray-500">No employees added yet.</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                                    <th className="p-3">Matricule</th>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Clock In</th>
                                    <th className="p-3">Clock Out (Edit if left early)</th>
                                    <th className="p-3">Day Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {employees.map((emp) => {
                                    const rec = dailyRecords[emp.id] || { clock_in: '08:30', clock_out: '17:30' };
                                    return (
                                        <tr key={emp.id} className="border-t hover:bg-gray-50 text-gray-800 text-sm">
                                            <td className="p-3 font-medium">{emp.matricule}</td>
                                            <td className="p-3 font-semibold">{emp.name}</td>
                                            <td className="p-3">
                                                <input type="time" value={rec.clock_in} onChange={(e) => handleTimeChange(emp.id, 'clock_in', e.target.value)} className="px-3 py-1.5 border rounded-lg text-gray-900 bg-white" />
                                            </td>
                                            <td className="p-3">
                                                <input type="time" value={rec.clock_out} onChange={(e) => handleTimeChange(emp.id, 'clock_out', e.target.value)} className="px-3 py-1.5 border rounded-lg text-gray-900 bg-white border-blue-400" />
                                            </td>
                                            <td className="p-3 text-xs text-gray-500">{selectedDay === 'Sunday' ? 'Day Off (0 hrs)' : 'Working'}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Cumulative Payroll Summary */}
                <div className="bg-white rounded-xl shadow-md overflow-x-auto">
                    <h2 className="text-xl font-bold p-6 bg-gray-50 border-b text-gray-700">Cumulative Payroll Summary</h2>
                    {loading ? <p className="p-6 text-gray-500">Loading...</p> : (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                            <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                                <th className="p-4">Matricule</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Rate</th>
                                <th className="p-4">Total Worked Hours</th>
                                <th className="p-4">Transport</th>
                                <th className="p-4">Prime</th>
                                <th className="p-4 bg-blue-50 text-blue-800 font-bold">Gross Salary</th>
                                <th className="p-4">Advance</th>
                                <th className="p-4">Credit</th>
                                <th className="p-4 bg-green-50 text-green-800 font-bold">Total Net</th>
                            </tr>
                            </thead>
                            <tbody>
                            {employees.map((emp) => (
                                <tr key={emp.id} className="border-t hover:bg-gray-50 text-gray-800 text-sm">
                                    <td className="p-4 font-medium">{emp.matricule}</td>
                                    <td className="p-4">{emp.name}</td>
                                    <td className="p-4">{emp.hourly_rate}</td>
                                    <td className="p-4 font-semibold text-blue-600">{emp.weekly_hours} hrs</td>
                                    <td className="p-4">{emp.transport_allowance}</td>
                                    <td className="p-4">{emp.prime}</td>
                                    <td className="p-4 bg-blue-50 font-bold text-blue-700">{emp.gross_salary}</td>
                                    <td className="p-4 text-orange-600">{emp.advance}</td>
                                    <td className="p-4 text-red-600">{emp.credit}</td>
                                    <td className="p-4 bg-green-50 font-bold text-green-700">{emp.total_net}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}