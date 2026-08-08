'use client';

interface Employee {
    id: number;
    matricule: string;
    name: string;
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

interface Props {
    employees: Employee[];
    dailyRecords: Record<number, DailyRow>;
    selectedDay: string;
    attendanceDate: string;
    loading: boolean;
    onDateChange: (dateStr: string) => void;
    onTimeChange: (empId: number, field: keyof DailyRow, value: string | boolean) => void;
    onSave: () => void;
}

export default function DailyAttendanceSheet({
                                                 employees,
                                                 dailyRecords,
                                                 selectedDay,
                                                 attendanceDate,
                                                 loading,
                                                 onDateChange,
                                                 onTimeChange,
                                                 onSave,
                                             }: Props) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-700">Daily Attendance Sheet ({selectedDay})</h2>
                    <p className="text-xs text-gray-500 mt-1">Schedule loaded automatically. Adjust times if an employee is late.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Select Date</label>
                        <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-gray-900 bg-white"
                        />
                    </div>
                    <button
                        onClick={onSave}
                        className="mt-5 bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-bold shadow-md transition-colors"
                    >
                        💾 Save Today's Sheet
                    </button>
                </div>
            </div>

            {/* Table section */}
            {loading ? (
                <p className="text-gray-500">Loading...</p>
            ) : employees.length === 0 ? (
                <p className="text-gray-500">No employees added yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                        <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                            <th className="p-3">Matricule</th>
                            <th className="p-3">Name</th>
                            <th className="p-3 text-center">Present</th>
                            <th className="p-3 bg-blue-50 text-blue-900">1. Arrivée</th>
                            <th className="p-3 bg-blue-50 text-blue-900">2. Pause 1 Sortie</th>
                            <th className="p-3 bg-indigo-50 text-indigo-900">3. Pause 1 Entrée</th>
                            <th className="p-3 bg-indigo-50 text-indigo-900">4. Pause 2 Sortie</th>
                            <th className="p-3 bg-amber-50 text-amber-900">5. Pause 2 Entrée</th>
                            <th className="p-3 bg-amber-50 text-amber-900">6. Sortie Fin</th>
                            <th className="p-3">Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {employees.map((emp) => {
                            const rec = dailyRecords[emp.id] || {
                                employee_id: emp.id,
                                block1_in: '',
                                block1_out: '',
                                block2_in: '',
                                block2_out: '',
                                block3_in: '',
                                block3_out: '',
                                is_present: false
                            };

                            return (
                                <tr
                                    key={emp.id}
                                    className={`border-t text-sm ${
                                        !rec.is_present ? 'bg-red-50/40 text-gray-400' : 'hover:bg-gray-50 text-gray-800'
                                    }`}
                                >
                                    <td className="p-3 font-medium">{emp.matricule}</td>
                                    <td className="p-3 font-semibold">{emp.name}</td>

                                    {/* Presence Checkbox */}
                                    <td className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={rec.is_present}
                                            onChange={(e) => onTimeChange(emp.id, 'is_present', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                        />
                                    </td>

                                    {/* Block 1 In */}
                                    <td className="p-3 bg-blue-50/50">
                                        <input
                                            type="time" /* FIXED: type="time" */
                                            disabled={!rec.is_present}
                                            value={rec.block1_in}
                                            onChange={(e) => onTimeChange(emp.id, 'block1_in', e.target.value)}
                                            className={`px-2.5 py-1.5 border rounded-lg text-gray-900 bg-white w-28 ${
                                                !rec.is_present ? 'opacity-40 cursor-not-allowed' : ''
                                            }`}
                                        />
                                    </td>

                                    {/* Block 1 Out */}
                                    <td className="p-3 bg-blue-50/50">
                                        <input
                                            type="time" /* FIXED: type="time" */
                                            disabled={!rec.is_present}
                                            value={rec.block1_out}
                                            onChange={(e) => onTimeChange(emp.id, 'block1_out', e.target.value)}
                                            className={`px-2.5 py-1.5 border rounded-lg text-gray-900 bg-white w-28 ${
                                                !rec.is_present ? 'opacity-40 cursor-not-allowed' : ''
                                            }`}
                                        />
                                    </td>

                                    {/* Block 2 In */}
                                    <td className="p-3 bg-indigo-50/50">
                                        <input
                                            type="time" /* FIXED: type="time" */
                                            disabled={!rec.is_present}
                                            value={rec.block2_in}
                                            onChange={(e) => onTimeChange(emp.id, 'block2_in', e.target.value)}
                                            className={`px-2.5 py-1.5 border rounded-lg text-gray-900 bg-white w-28 ${
                                                !rec.is_present ? 'opacity-40 cursor-not-allowed' : ''
                                            }`}
                                        />
                                    </td>

                                    {/* Block 2 Out */}
                                    <td className="p-3 bg-indigo-50/50">
                                        <input
                                            type="time" /* FIXED: type="time" */
                                            disabled={!rec.is_present}
                                            value={rec.block2_out}
                                            onChange={(e) => onTimeChange(emp.id, 'block2_out', e.target.value)}
                                            className={`px-2.5 py-1.5 border rounded-lg text-gray-900 bg-white w-28 ${
                                                !rec.is_present ? 'opacity-40 cursor-not-allowed' : ''
                                            }`}
                                        />
                                    </td>

                                    {/* Block 3 In */}
                                    <td className="p-3 bg-amber-50/50">
                                        <input
                                            type="time" /* FIXED: type="time" */
                                            disabled={!rec.is_present}
                                            value={rec.block3_in}
                                            onChange={(e) => onTimeChange(emp.id, 'block3_in', e.target.value)}
                                            className={`px-2.5 py-1.5 border rounded-lg text-gray-900 bg-white w-28 ${
                                                !rec.is_present ? 'opacity-40 cursor-not-allowed' : ''
                                            }`}
                                        />
                                    </td>

                                    {/* Block 3 Out */}
                                    <td className="p-3 bg-amber-50/50">
                                        <input
                                            type="time" /* FIXED: type="time" */
                                            disabled={!rec.is_present}
                                            value={rec.block3_out}
                                            onChange={(e) => onTimeChange(emp.id, 'block3_out', e.target.value)}
                                            className={`px-2.5 py-1.5 border rounded-lg text-gray-900 bg-white w-28 ${
                                                !rec.is_present ? 'opacity-40 cursor-not-allowed' : ''
                                            }`}
                                        />
                                    </td>

                                    {/* Status Badge */}
                                    <td className="p-3 text-xs font-bold">
                                        {rec.is_present ? (
                                            <span className="text-green-600">Present</span>
                                        ) : (
                                            <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded">Absent</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}