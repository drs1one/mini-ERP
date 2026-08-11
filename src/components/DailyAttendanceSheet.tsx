'use client';
import { useState, useEffect } from 'react';

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
    declaration_status?: string;
}

interface TemplateRule {
    day_of_week?: string;
    day?: string;
    name?: string;
    block1_in?: string;
    block1_out?: string;
    block2_in?: string;
    block2_out?: string;
    block3_in?: string;
    block3_out?: string;
    matin_entree?: string;
    matin_sortie?: string;
    apres_midi_entree?: string;
    apres_midi_sortie?: string;
    soir_entree?: string;
    soir_sortie?: string;
    is_working_day?: number;
    [key: string]: any;
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

// Day mapping dictionary to match English, French, and abbreviations
const dayMapping: Record<string, string[]> = {
    sunday: ['sunday', 'dimanche', 'sun', 'dim', '0'],
    monday: ['monday', 'lundi', 'mon', 'lun', '1'],
    tuesday: ['tuesday', 'mardi', 'tue', 'mar', '2'],
    wednesday: ['wednesday', 'mercredi', 'wed', 'mer', '3'],
    thursday: ['thursday', 'jeudi', 'thu', 'jeu', '4'],
    friday: ['friday', 'vendredi', 'fri', 'ven', '5'],
    saturday: ['saturday', 'samedi', 'sat', 'sam', '6'],
};

const matchDay = (templateDay: string, targetDay: string) => {
    if (!templateDay || !targetDay) return false;
    const tLower = templateDay.toLowerCase().trim();
    const targetLower = targetDay.toLowerCase().trim();
    if (tLower === targetLower) return true;

    for (const [, aliases] of Object.entries(dayMapping)) {
        if (aliases.includes(targetLower) && aliases.includes(tLower)) {
            return true;
        }
    }
    return false;
};

// Exact time calculation logic matching TemplatePlanner
const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    let clean = String(timeStr).trim();
    let parts = clean.split(' ');
    let time = parts[0];
    let modifier = parts[1] ? parts[1].toUpperCase() : '';
    if (!time) return 0;

    let [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;

    if (modifier) {
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
};

const getMinutesBetween = (start: string, end: string) => {
    const sMins = parseTimeToMinutes(start);
    const eMins = parseTimeToMinutes(end);
    const totalMins = eMins - sMins;
    return totalMins > 0 ? totalMins : 0;
};

// Helper to convert time format for <input type="time"> (24h format)
const convertTo24Hour = (timeStr: string) => {
    if (!timeStr) return '';
    let cleanStr = String(timeStr).trim();

    if (cleanStr.includes('AM') || cleanStr.includes('PM')) {
        let parts = cleanStr.split(' ');
        let time = parts[0];
        let modifier = parts[1] ? parts[1].toUpperCase() : '';

        let [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return '';

        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    return cleanStr.substring(0, 5);
};

// Helper to retrieve template values across different possible database column names
const getVal = (tmpl: TemplateRule | undefined, keys: string[]) => {
    if (!tmpl) return '';
    for (const k of keys) {
        if (tmpl[k] !== undefined && tmpl[k] !== null && tmpl[k] !== '') {
            return convertTo24Hour(tmpl[k]);
        }
    }
    return '';
};

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
    const [templates, setTemplates] = useState<TemplateRule[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        async function fetchTemplates() {
            try {
                const res = await fetch('/api/schedule/template');
                const text = await res.text(); // Read raw text to prevent JSON parse crashes
                if (!isMounted || !text) return;

                const data = JSON.parse(text);

                if (data && data.rules && Array.isArray(data.rules)) {
                    setTemplates(data.rules);
                } else if (Array.isArray(data)) {
                    setTemplates(data);
                } else if (data && data.data && Array.isArray(data.data)) {
                    setTemplates(data.data);
                }
            } catch (err) {
                console.warn('Failed to load templates for attendance sheet (using defaults)', err);
            }
        }
        fetchTemplates();
        return () => {
            isMounted = false;
        };
    }, []);

    // Find template rule matching selectedDay across multiple naming conventions
    const currentTemplate = templates.find(r =>
        matchDay(r.day_of_week || r.day || r.name || '', selectedDay)
    );

    // Filter employees based on search query
    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.matricule.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-700">Daily Attendance Sheet ({selectedDay})</h2>
                    <p className="text-xs text-gray-500 mt-1">Schedule loaded automatically from database templates. Adjust times, presence, and declaration status.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div>
                        <input
                            type="text"
                            placeholder="Search employee or matricule..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-gray-900 bg-white text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-gray-900 bg-white text-sm shadow-sm"
                        />
                    </div>
                    <button
                        onClick={onSave}
                        className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md transition-colors"
                    >
                        💾 Save Today's Sheet
                    </button>
                </div>
            </div>

            {/* Table section */}
            {loading ? (
                <p className="text-gray-500 py-8 text-center font-medium">Loading...</p>
            ) : employees.length === 0 ? (
                <p className="text-gray-500 py-8 text-center font-medium">No employees added yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                        <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                            <th className="p-3">Matricule</th>
                            <th className="p-3">Name</th>
                            <th className="p-3 text-center">Present</th>
                            <th className="p-3 text-center bg-purple-50 text-purple-900">Declaration</th>
                            <th className="p-3 bg-blue-50 text-blue-900">1. Arrivée</th>
                            <th className="p-3 bg-blue-50 text-blue-900">2. Pause 1 Sortie</th>
                            <th className="p-3 bg-indigo-50 text-indigo-900">3. Pause 1 Entrée</th>
                            <th className="p-3 bg-indigo-50 text-indigo-900">4. Pause 2 Sortie</th>
                            <th className="p-3 bg-amber-50 text-amber-900">5. Pause 2 Entrée</th>
                            <th className="p-3 bg-amber-50 text-amber-900">6. Sortie Fin</th>
                            <th className="p-3 bg-emerald-50 text-emerald-900">Total Worked Hours</th>
                            <th className="p-3">Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="text-center py-10 text-gray-400 font-medium">
                                    No employees found matching your search.
                                </td>
                            </tr>
                        ) : (
                            filteredEmployees.map((emp) => {
                                const existingRec = dailyRecords[emp.id];
                                const hasExisting = existingRec !== undefined;

                                const rec = {
                                    employee_id: emp.id,
                                    is_present: hasExisting && existingRec?.is_present !== undefined ? existingRec.is_present : (currentTemplate?.is_working_day !== 0),
                                    declaration_status: hasExisting && existingRec?.declaration_status !== undefined ? existingRec.declaration_status : 'declared',
                                    block1_in: hasExisting && existingRec?.block1_in !== undefined ? convertTo24Hour(existingRec.block1_in) : getVal(currentTemplate, ['block1_in', 'matin_entree', 'arrivee']),
                                    block1_out: hasExisting && existingRec?.block1_out !== undefined ? convertTo24Hour(existingRec.block1_out) : getVal(currentTemplate, ['block1_out', 'matin_sortie', 'pause1_sortie']),
                                    block2_in: hasExisting && existingRec?.block2_in !== undefined ? convertTo24Hour(existingRec.block2_in) : getVal(currentTemplate, ['block2_in', 'apres_midi_entree', 'pause1_entree']),
                                    block2_out: hasExisting && existingRec?.block2_out !== undefined ? convertTo24Hour(existingRec.block2_out) : getVal(currentTemplate, ['block2_out', 'apres_midi_sortie', 'pause2_sortie']),
                                    block3_in: hasExisting && existingRec?.block3_in !== undefined ? convertTo24Hour(existingRec.block3_in) : getVal(currentTemplate, ['block3_in', 'soir_entree', 'pause2_entree']),
                                    block3_out: hasExisting && existingRec?.block3_out !== undefined ? convertTo24Hour(existingRec.block3_out) : getVal(currentTemplate, ['block3_out', 'soir_sortie', 'sortie_fin']),
                                };

                                // Calculate total worked hours exactly like TemplatePlanner
                                const work1Mins = getMinutesBetween(rec.block1_in, rec.block1_out);
                                const work2Mins = getMinutesBetween(rec.block2_in, rec.block2_out);
                                const work3Mins = getMinutesBetween(rec.block3_in, rec.block3_out);
                                const totalWorkMins = rec.is_present ? (work1Mins + work2Mins + work3Mins) : 0;
                                const totalWorkedFormatted = `${Number((totalWorkMins / 60).toFixed(2))} hrs`;

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

                                        {/* Declaration Status Dropdown */}
                                        <td className="p-3 text-center bg-purple-50/30">
                                            <select
                                                value={rec.declaration_status || 'declared'}
                                                onChange={(e) => onTimeChange(emp.id, 'declaration_status', e.target.value)}
                                                className="px-2.5 py-1.5 border rounded-lg text-xs font-semibold bg-white text-gray-900 shadow-sm border-purple-300 text-purple-700 bg-purple-50/50"
                                            >
                                                <option value="declared">Declared (Déclaré)</option>
                                                <option value="not_declared">Not Declared (Non Déclaré)</option>
                                            </select>
                                        </td>

                                        {/* Block 1 In */}
                                        <td className="p-3 bg-blue-50/50">
                                            <input
                                                type="time"
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
                                                type="time"
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
                                                type="time"
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
                                                type="time"
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
                                                type="time"
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
                                                type="time"
                                                disabled={!rec.is_present}
                                                value={rec.block3_out}
                                                onChange={(e) => onTimeChange(emp.id, 'block3_out', e.target.value)}
                                                className={`px-2.5 py-1.5 border rounded-lg text-gray-900 bg-white w-28 ${
                                                    !rec.is_present ? 'opacity-40 cursor-not-allowed' : ''
                                                }`}
                                            />
                                        </td>

                                        {/* Total Worked Hours Column */}
                                        <td className="p-3 bg-emerald-50/50 font-bold text-emerald-700">
                                            {totalWorkedFormatted}
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
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}