'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmployeeForm from '@/components/EmployeeForm';
import TemplatePlanner from '@/components/TemplatePlanner';
import DailyAttendanceSheet from '@/components/DailyAttendanceSheet';
import PayrollSummary from '@/components/PayrollSummary';
import MonthlyAttendanceReport from '@/components/MonthlyAttendanceReport';
import TransportManager from '@/components/TransportManager';
import FinancialsManager from '@/components/FinancialSummary';
import Navbar from '@/components/Navbar';

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
    declaration_status?: string;
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

const getDayOfWeekFromDateStr = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()];
};

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'attendance' | 'payroll' | 'reports' | 'transport' | 'financials'>('attendance');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [templateRules, setTemplateRules] = useState<TemplateRule[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [uploadingJson, setUploadingJson] = useState<boolean>(false);

    const todayStr = getMoroccanToday();
    const [attendanceDate, setAttendanceDate] = useState<string>(todayStr);
    const [selectedDay, setSelectedDay] = useState<string>(getDayOfWeekFromDateStr(todayStr));
    const [dailyRecords, setDailyRecords] = useState<Record<number, DailyRow>>({});

    const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
    const [showPlannerModal, setShowPlannerModal] = useState<boolean>(false);

    const router = useRouter();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empRes, tempRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/schedule/template')
            ]);
            const empData = await empRes.json() as { success?: boolean; employees?: Employee[] };
            const tempD = await tempRes.json() as { success?: boolean; template?: TemplateRule[]; rules?: TemplateRule[] };

            let loadedEmps: Employee[] = [];
            if (empData.success && empData.employees) {
                loadedEmps = empData.employees;
                setEmployees(loadedEmps);
            }

            let loadedRules: TemplateRule[] = [];
            if (tempD.success) {
                loadedRules = tempD.rules || tempD.template || [];
                setTemplateRules(loadedRules);
            }

            const currentDay = getDayOfWeekFromDateStr(attendanceDate);
            setSelectedDay(currentDay);

            await loadAttendanceForDate(attendanceDate, loadedEmps, loadedRules, currentDay);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const loadAttendanceForDate = async (dateStr: string, empList: Employee[], rules: TemplateRule[], day: string) => {
        try {
            const res = await fetch(`/api/attendance?date=${dateStr}`);
            const data = await res.json() as { success?: boolean; records?: any[] };

            const savedMap: Record<number, any> = {};
            if (data.success && data.records) {
                data.records.forEach((r: any) => {
                    savedMap[r.employee_id] = r;
                });
            }

            const rule = rules.find(r =>
                r.day_of_week && r.day_of_week.toLowerCase().trim() === day.toLowerCase().trim()
            );

            const initialRecords: Record<number, DailyRow> = {};
            empList.forEach((emp) => {
                const saved = savedMap[emp.id];
                if (saved) {
                    initialRecords[emp.id] = {
                        employee_id: emp.id,
                        block1_in: saved.block1_in || '',
                        block1_out: saved.block1_out || '',
                        block2_in: saved.block2_in || '',
                        block2_out: saved.block2_out || '',
                        block3_in: saved.block3_in || '',
                        block3_out: saved.block3_out || '',
                        is_present: Boolean(saved.is_present),
                        declaration_status: saved.declaration_status || 'declared',
                    };
                } else if (rule) {
                    initialRecords[emp.id] = {
                        employee_id: emp.id,
                        block1_in: rule.block1_in || '',
                        block1_out: rule.block1_out || '',
                        block2_in: rule.block2_in || '',
                        block2_out: rule.block2_out || '',
                        block3_in: rule.block3_in || '',
                        block3_out: rule.block3_out || '',
                        is_present: false,
                        declaration_status: 'declared',
                    };
                } else {
                    initialRecords[emp.id] = {
                        employee_id: emp.id,
                        block1_in: '', block1_out: '',
                        block2_in: '', block2_out: '',
                        block3_in: '', block3_out: '',
                        is_present: false,
                        declaration_status: 'declared',
                    };
                }
            });
            setDailyRecords(initialRecords);
        } catch (err) {
            console.error('Failed to load attendance records for date', err);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const handleDateChange = async (dateStr: string) => {
        setAttendanceDate(dateStr);
        if (dateStr) {
            const currentDay = getDayOfWeekFromDateStr(dateStr);
            setSelectedDay(currentDay);
            await loadAttendanceForDate(dateStr, employees, templateRules, currentDay);
        }
    };

    const handleTimeChange = (empId: number, field: keyof DailyRow, value: string | boolean) => {
        setDailyRecords(prev => {
            const existing = prev[empId] || {
                employee_id: empId,
                block1_in: '',
                block1_out: '',
                block2_in: '',
                block2_out: '',
                block3_in: '',
                block3_out: '',
                is_present: false,
                declaration_status: 'declared'
            };

            return {
                ...prev,
                [empId]: {
                    ...existing,
                    [field]: value
                }
            };
        });
    };

    const handleSaveDailyAttendance = async () => {
        try {
            const recordsArray = Object.values(dailyRecords).map(r => ({
                ...r,
                declaration_status: r.declaration_status || 'declared'
            }));

            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendanceDate: attendanceDate, records: recordsArray })
            });
            const data = await res.json() as { success?: boolean; message?: string; error?: string };
            if (data.success) {
                alert(data.message || 'Attendance saved successfully!');
                void fetchData();
            } else {
                alert(data.error || 'Failed to save attendance');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(message);
        }
    };

    const handleBulkJsonUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingJson(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = JSON.parse(e.target?.result as string);
                const employeesArray = Array.isArray(jsonContent) ? jsonContent : [jsonContent];

                const res = await fetch('/api/employees/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employees: employeesArray }),
                });

                const data = await res.json() as { success?: boolean; count?: number; error?: string };
                if (data.success) {
                    alert(`Successfully uploaded ${data.count ?? employeesArray.length} employees!`);
                    void fetchData();
                } else {
                    alert(`Error: ${data.error ?? 'Unknown error'}`);
                }
            } catch (err) {
                alert('Invalid JSON file format.');
            } finally {
                setUploadingJson(false);
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header with Navigation Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-md">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Tixtile Admin Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage employee attendance, payroll, and schedules</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className={`cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold shadow transition-colors flex items-center gap-2 ${uploadingJson ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <span>📁 {uploadingJson ? 'Uploading...' : 'Upload JSON'}</span>
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleBulkJsonUpload}
                                disabled={uploadingJson}
                            />
                        </label>

                        <button
                            onClick={() => setShowEmployeeModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold shadow transition-colors flex items-center gap-2"
                        >
                            <span>➕ Add Employee</span>
                        </button>
                        <button
                            onClick={() => setShowPlannerModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold shadow transition-colors flex items-center gap-2"
                        >
                            <span>📅 Week Planner</span>
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium shadow transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Navbar Component */}
                <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

                {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

                {/* Active Tab Content */}
                <div className="transition-all duration-300">
                    {activeTab === 'attendance' && (
                        <DailyAttendanceSheet
                            employees={employees}
                            dailyRecords={dailyRecords}
                            selectedDay={selectedDay}
                            attendanceDate={attendanceDate}
                            loading={loading}
                            onDateChange={(date) => void handleDateChange(date)}
                            onTimeChange={handleTimeChange}
                            onSave={() => void handleSaveDailyAttendance()}
                        />
                    )}
                    {activeTab === 'payroll' && (
                        <PayrollSummary
                            employees={employees}
                            dailyRecords={dailyRecords}
                            loading={loading}
                            onRefresh={() => void fetchData()}
                            onDelete={() => void fetchData()}
                        />
                    )}
                    {activeTab === 'reports' && (
                        <MonthlyAttendanceReport employees={employees} />
                    )}
                    {activeTab === 'transport' && <TransportManager />}
                    {activeTab === 'financials' && <FinancialsManager />}
                </div>

                {showEmployeeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEmployeeModal(false)}>
                        <EmployeeForm onEmployeeAdded={() => void fetchData()} onClose={() => setShowEmployeeModal(false)} />
                    </div>
                )}

                {showPlannerModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowPlannerModal(false)}>
                        <TemplatePlanner onRuleSaved={() => void fetchData()} onClose={() => setShowPlannerModal(false)} />
                    </div>
                )}
            </div>
        </div>
    );
}