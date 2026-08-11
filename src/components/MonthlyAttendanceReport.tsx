'use client';
import { useState, useEffect } from 'react';

interface Employee {
    id: number;
    matricule: string;
    name: string;
}

interface MonthlyRecord {
    employee_id: number;
    employee_name?: string;
    employee_matricule?: string;
    date: string;
    block1_in: string;
    block1_out: string;
    block2_in: string;
    block2_out: string;
    block3_in: string;
    block3_out: string;
    total_hours: number;
    is_present: number;
    declaration_status?: string;
    absence?: boolean | number;
    status?: string;
}

// Helper to convert time strings (e.g., "07:30 AM") into decimal hours
function parseTimeToHours(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return 0;
    const [time, modifier] = parts;
    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours + minutes / 60;
}

// Helper to calculate total hours, strictly respecting attendance status
function getRecordHours(r: MonthlyRecord): number {
    if (r.is_present === 0 || r.status === 'absent') return 0;

    if (r.total_hours !== undefined && r.total_hours !== null && Number(r.total_hours) > 0) {
        return Number(r.total_hours);
    }

    const b1 = r.block1_in && r.block1_out ? Math.max(0, parseTimeToHours(r.block1_out) - parseTimeToHours(r.block1_in)) : 0;
    const b2 = r.block2_in && r.block2_out ? Math.max(0, parseTimeToHours(r.block2_out) - parseTimeToHours(r.block2_in)) : 0;
    const b3 = r.block3_in && r.block3_out ? Math.max(0, parseTimeToHours(r.block3_out) - parseTimeToHours(r.block3_in)) : 0;
    return Number((b1 + b2 + b3).toFixed(2));
}

export default function MonthlyAttendanceReport({ employees = [] }: { employees?: Employee[] }) {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
    const [records, setRecords] = useState<MonthlyRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const fetchMonthData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/attendance/monthly?year=${selectedYear}&month=${selectedMonth}`);
            const data = await res.json() as { success?: boolean; records?: MonthlyRecord[] };
            if (data.success && data.records) {
                setRecords(data.records);
            }
        } catch (err) {
            console.error('Failed to fetch monthly records', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchMonthData();
    }, [selectedYear, selectedMonth]);

    // Aggregate hours and days present per employee
    const employeeSummary = employees.map(emp => {
        const empRecords = records.filter(r => Number(r.employee_id) === Number(emp.id));
        const totalHours = empRecords.reduce((sum, r) => sum + getRecordHours(r), 0);
        const daysPresent = empRecords.filter(r => r.is_present === 1 && r.status !== 'absent' && getRecordHours(r) > 0).length;
        return {
            ...emp,
            totalHours: Number(totalHours.toFixed(2)),
            daysPresent,
            records: empRecords
        };
    });

    // Filter employees based on search query
    const filteredSummary = employeeSummary.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.matricule.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Monthly Employee Time Summary</h2>
                    <p className="text-sm text-gray-500">Click on any employee row to open their full month time blocks and schedule popup.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search employee or matricule..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 shadow-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {Array.from({ length: 12 }, (_, i) => {
                            const m = String(i + 1).padStart(2, '0');
                            const name = new Date(2026, i, 1).toLocaleString('default', { month: 'long' });
                            return <option key={m} value={m} className="text-gray-900">{name}</option>;
                        })}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="text-gray-900">{y}</option>)}
                    </select>

                    <button
                        onClick={() => void fetchMonthData()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500 font-medium">Loading summary records...</div>
            ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                        <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                            <th className="p-3">Matricule</th>
                            <th className="p-3">Name</th>
                            <th className="p-3 text-center">Days Present</th>
                            <th className="p-3 text-center">Total Monthly Hours</th>
                            <th className="p-3 text-center">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {filteredSummary.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-400 font-medium">No employees found matching your search.</td>
                            </tr>
                        ) : (
                            filteredSummary.map(emp => (
                                <tr
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                                >
                                    <td className="p-3 border-r font-mono font-bold text-gray-900">{emp.matricule}</td>
                                    <td className="p-3 border-r font-medium text-gray-900">{emp.name}</td>
                                    <td className="p-3 border-r text-center text-gray-600 font-mono">{emp.daysPresent} days</td>
                                    <td className="p-3 border-r text-center font-bold text-indigo-600 bg-indigo-50/20 font-mono text-base">
                                        {emp.totalHours} hrs
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg inline-block">
                                            View Blocks ➔
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* POPUP MODAL FOR INDIVIDUAL EMPLOYEE MONTH PLAN */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEmployee(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {selectedEmployee.name} <span className="text-sm font-mono text-indigo-600 font-normal">({selectedEmployee.matricule})</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Complete monthly time blocks and daily hours breakdown for {selectedMonth}/{selectedYear}</p>
                            </div>
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors"
                            >
                                ✕ Close
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {(() => {
                                const empData = employeeSummary.find(e => e.id === selectedEmployee.id);
                                const recs = empData?.records || [];
                                if (recs.length === 0) {
                                    return <div className="text-center py-12 text-gray-400 font-medium">No time attendance records saved for this employee in {selectedMonth}/{selectedYear}.</div>;
                                }
                                return (
                                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                            <tr className="bg-gray-50 text-gray-700 uppercase tracking-wider border-b">
                                                <th className="p-3 border-r font-bold">Date</th>
                                                <th className="p-3 border-r font-bold">Block 1 (In ➔ Out)</th>
                                                <th className="p-3 border-r font-bold">Block 2 (In ➔ Out)</th>
                                                <th className="p-3 border-r font-bold">Block 3 (In ➔ Out)</th>
                                                <th className="p-3 border-r font-bold text-center">Attendance</th>
                                                <th className="p-3 border-r font-bold text-center">Declaration</th>
                                                <th className="p-3 text-center bg-indigo-50 text-indigo-700 font-bold">Total Hours</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                            {recs.map((r, i) => {
                                                const isAbsent = r.is_present === 0 || r.status === 'absent';
                                                const computedHours = getRecordHours(r);
                                                const isNotDeclared = r.declaration_status === 'not_declared';

                                                return (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="p-3 border-r font-mono font-bold text-gray-900">{r.date}</td>
                                                        <td className="p-3 border-r font-mono text-gray-600">
                                                            {r.block1_in && r.block1_out ? `${r.block1_in} ➔ ${r.block1_out}` : '-'}
                                                        </td>
                                                        <td className="p-3 border-r font-mono text-gray-600">
                                                            {r.block2_in && r.block2_out ? `${r.block2_in} ➔ ${r.block2_out}` : '-'}
                                                        </td>
                                                        <td className="p-3 border-r font-mono text-gray-600">
                                                            {r.block3_in && r.block3_out ? `${r.block3_in} ➔ ${r.block3_out}` : '-'}
                                                        </td>
                                                        <td className="p-3 border-r text-center">
                                                            {isAbsent ? (
                                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                                    Absent
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                                    Présent
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 border-r text-center">
                                                            {isAbsent ? (
                                                                <span className="text-gray-400 font-medium">-</span>
                                                            ) : isNotDeclared ? (
                                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                                    Non déclaré
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                                    Déclaré
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center font-bold text-indigo-600 bg-indigo-50/30 font-mono text-sm">
                                                            {computedHours} hrs
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                            <span>Total Monthly Accumulation: <strong className="text-indigo-600">{employeeSummary.find(e => e.id === selectedEmployee.id)?.totalHours || 0} hrs</strong></span>
                            <button
                                onClick={() => window.print()}
                                className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-xl font-bold transition-colors"
                            >
                                🖨️ Print Employee Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}