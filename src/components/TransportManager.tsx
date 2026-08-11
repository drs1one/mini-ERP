'use client';
import { useState, useEffect, type SyntheticEvent } from 'react';

interface Driver {
    id: number;
    name: string;
    phone: string;
}

interface Employee {
    id: number;
    matricule: string;
    name: string;
    has_transport: number;
    driver_id: number | null;
}

interface DriverLogState {
    driver_id: number;
    arrival_done: boolean;
    departure_done: boolean;
    is_fault: boolean;
}

export default function TransportManager() {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [dailyLogs, setDailyLogs] = useState<Record<number, DriverLogState>>({});

    const [activeTab, setActiveTab] = useState<'daily' | 'roster' | 'drivers'>('daily');

    const [newDriverName, setNewDriverName] = useState<string>('');
    const [newDriverPhone, setNewDriverPhone] = useState<string>('');
    const [selectedEmpToAdd, setSelectedEmpToAdd] = useState<Record<number, string>>({});

    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [savedMessage, setSavedMessage] = useState<boolean>(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/transport?date=${selectedDate}`);
            const data = (await res.json()) as any;
            if (data.success) {
                const fetchedDrivers: Driver[] = data.drivers || [];
                // Only include employees who have active transport (has_transport === 1)
                const fetchedEmployees: Employee[] = (data.employees || []).filter(
                    (emp: any) => Number(emp.has_transport) === 1
                );
                const fetchedLogs: any[] = data.logs || [];

                setDrivers(fetchedDrivers);
                setEmployees(fetchedEmployees);

                const logsMap: Record<number, DriverLogState> = {};
                fetchedDrivers.forEach((d: Driver) => {
                    const existing = fetchedLogs.find((l: any) => l.driver_id === d.id);
                    logsMap[d.id] = {
                        driver_id: d.id,
                        arrival_done: existing ? existing.arrival_done === 1 : true,
                        departure_done: existing ? existing.departure_done === 1 : true,
                        is_fault: existing ? existing.is_fault === 1 : false,
                    };
                });
                setDailyLogs(logsMap);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, [selectedDate]);

    const handleAddDriver = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!newDriverName.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/transport', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_driver',
                    name: newDriverName.trim(),
                    phone: newDriverPhone.trim()
                })
            });
            const data = (await res.json()) as any;
            if (data.success) {
                setNewDriverName('');
                setNewDriverPhone('');
                await fetchData();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDriver = async (driverId: number) => {
        if (!confirm('Are you sure you want to delete this driver?')) return;
        try {
            const res = await fetch('/api/transport', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_driver', driver_id: driverId })
            });
            const data = (await res.json()) as any;
            if (data.success) {
                await fetchData();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    const handleSaveRoster = async () => {
        setSaving(true);
        try {
            const assignments = employees.map(e => ({ id: e.id, driver_id: e.driver_id }));
            const res = await fetch('/api/transport', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_roster', assignments })
            });
            const data = (await res.json()) as any;
            if (data.success) {
                setSavedMessage(true);
                setTimeout(() => setSavedMessage(false), 3000);
                await fetchData();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDaily = async (e: SyntheticEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const logsArray = drivers.map(d => {
                const log = dailyLogs[d.id] || { arrival_done: true, departure_done: true, is_fault: false };
                return {
                    driver_id: d.id,
                    arrival_done: log.arrival_done,
                    departure_done: log.departure_done,
                    is_fault: log.is_fault,
                    cost: 0 // No payout tracking anymore
                };
            });

            const res = await fetch('/api/transport', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_logs',
                    date: selectedDate,
                    logs: logsArray
                })
            });
            const data = (await res.json()) as any;
            if (data.success) {
                setSavedMessage(true);
                setTimeout(() => setSavedMessage(false), 3000);
                await fetchData();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setSaving(false);
        }
    };

    const totalCompanyTransport = employees.length;
    const totalDriversCarrying = employees.filter(e => e.driver_id !== null).length;
    const totalEmployeeMonthlyCollection = totalCompanyTransport * 80;

    return (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Transport & Driver Management</h2>
                    <p className="text-xs text-gray-500">Daily Driver Trip & Fault Tracking | Monthly Employee Collection (80 DH)</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('daily')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'daily' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600'}`}
                        >
                            📅 Daily Sheet
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('roster')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'roster' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600'}`}
                        >
                            👥 Assign Employees ({totalDriversCarrying}/{totalCompanyTransport})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('drivers')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'drivers' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600'}`}
                        >
                            🚗 Manage Drivers ({drivers.length})
                        </button>
                    </div>
                    {activeTab === 'daily' && (
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 border rounded-xl text-sm font-bold text-gray-900 bg-gray-50"
                        />
                    )}
                </div>
            </div>

            {/* TAB 1: DAILY DRIVER SHEET */}
            {activeTab === 'daily' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <span className="block text-xs font-bold text-indigo-700 uppercase">Total Company Transport</span>
                            <span className="text-2xl font-black text-indigo-900">{totalCompanyTransport} <span className="text-xs font-normal">employees</span></span>
                            <span className="block text-[10px] text-indigo-500 mt-1">Total registered with transport</span>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <span className="block text-xs font-bold text-blue-700 uppercase">Total Drivers Carry</span>
                            <span className="text-2xl font-black text-blue-900">{totalDriversCarrying} <span className="text-xs font-normal">assigned</span></span>
                            <span className="block text-[10px] text-blue-600 mt-1">Sum of passengers across all drivers</span>
                        </div>
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <span className="block text-xs font-bold text-amber-700 uppercase">Monthly Collection</span>
                            <span className="text-2xl font-black text-amber-900">{totalEmployeeMonthlyCollection} DH</span>
                            <span className="block text-[10px] text-amber-600 mt-1">{totalCompanyTransport} employees × 80 DH / month</span>
                        </div>
                    </div>

                    <form onSubmit={handleSaveDaily} className="space-y-4">
                        <div className="overflow-x-auto border rounded-xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                                    <th className="p-3">Driver & Assigned Passengers</th>
                                    <th className="p-3 text-center">Group Count</th>
                                    <th className="p-3 text-center">📥 Arrival (7:30)</th>
                                    <th className="p-3 text-center">📤 Departure (16:30)</th>
                                    <th className="p-3 text-center text-red-600">❌ Driver Fault</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">Loading driver logs...</td></tr>
                                ) : drivers.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">No drivers found. Go to "Manage Drivers" tab!</td></tr>
                                ) : (
                                    drivers.map((d) => {
                                        const groupEmps = employees.filter(emp => emp.driver_id === d.id);
                                        const count = groupEmps.length;
                                        const log = dailyLogs[d.id] || { arrival_done: true, departure_done: true, is_fault: false };

                                        return (
                                            <tr key={d.id} className="border-t hover:bg-gray-50 text-sm text-gray-800">
                                                <td className="p-3">
                                                    <span className="font-bold text-gray-900">{d.name}</span>
                                                    {d.phone && <span className="text-xs text-gray-400 ml-2">({d.phone})</span>}
                                                    <div className="text-xs text-gray-500 flex flex-wrap gap-1 mt-1">
                                                        {groupEmps.length === 0 ? (
                                                            <span className="text-amber-600 italic">No employees assigned.</span>
                                                        ) : (
                                                            groupEmps.map(emp => (
                                                                <span key={emp.id} className="bg-gray-200 px-2 py-0.5 rounded text-[11px] text-gray-700">
                                                                    {emp.name}
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center font-black text-indigo-600 text-base">{count}</td>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={log.arrival_done}
                                                        onChange={(e) => setDailyLogs(prev => ({ ...prev, [d.id]: { ...log, arrival_done: e.target.checked } }))}
                                                        className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={log.departure_done}
                                                        onChange={(e) => setDailyLogs(prev => ({ ...prev, [d.id]: { ...log, departure_done: e.target.checked } }))}
                                                        className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={log.is_fault}
                                                        onChange={(e) => setDailyLogs(prev => ({ ...prev, [d.id]: { ...log, is_fault: e.target.checked } }))}
                                                        className="w-5 h-5 text-red-600 rounded cursor-pointer"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            {savedMessage && (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                                    ✔ Driver transport sheet saved successfully!
                                </span>
                            )}
                            <div className="ml-auto">
                                <button
                                    type="submit"
                                    disabled={saving || drivers.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors shadow disabled:opacity-50"
                                >
                                    {saving ? 'Saving Sheet...' : '💾 Save Driver Transport Sheet'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB 2: ASSIGN EMPLOYEES (DRIVER BLOCKS) */}
            {activeTab === 'roster' && (
                <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex justify-between items-center">
                        <div>
                            <span className="font-bold">Driver-Centric Roster:</span> Total Drivers Carry ({totalDriversCarrying}) should match Total Company Transport ({totalCompanyTransport}).
                            <div className="mt-1 font-semibold text-amber-900">Total Monthly Collection: {totalEmployeeMonthlyCollection} DH</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {drivers.length === 0 ? (
                            <div className="col-span-2 text-center py-10 text-gray-400 bg-gray-50 rounded-xl border">
                                No drivers found. Please add a driver in the "Manage Drivers" tab first.
                            </div>
                        ) : (
                            drivers.map(d => {
                                const assignedEmps = employees.filter(emp => emp.driver_id === d.id);
                                const unassignedEmps = employees.filter(emp => !emp.driver_id || emp.driver_id !== d.id);

                                return (
                                    <div key={d.id} className="bg-white border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start border-b pb-3">
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900">🚗 {d.name}</h3>
                                                    {d.phone && <span className="text-xs text-gray-400">📞 {d.phone}</span>}
                                                </div>
                                                <span className="bg-indigo-50 text-indigo-700 font-black text-xs px-2.5 py-1 rounded-full">
                                                    {assignedEmps.length} Passengers ({assignedEmps.length * 80} DH/mo)
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Employees Driven By {d.name}:</span>
                                                {assignedEmps.length === 0 ? (
                                                    <p className="text-xs text-amber-600 italic bg-amber-50 p-3 rounded-xl border border-amber-100">
                                                        No employees assigned to this driver yet.
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {assignedEmps.map(emp => (
                                                            <div key={emp.id} className="flex items-center gap-1 bg-gray-100 border px-3 py-1.5 rounded-xl text-xs font-bold text-gray-800">
                                                                <span>{emp.name}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">({emp.matricule})</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEmployees(prev => prev.map(item => item.id === emp.id ? { ...item, driver_id: null } : item));
                                                                    }}
                                                                    className="ml-1.5 text-red-500 hover:text-red-700 font-bold px-1"
                                                                    title="Remove from driver"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t flex items-center gap-2">
                                            <select
                                                value={selectedEmpToAdd[d.id] || ''}
                                                onChange={(e) => setSelectedEmpToAdd(prev => ({ ...prev, [d.id]: e.target.value }))}
                                                className="flex-1 px-3 py-2 border rounded-xl text-xs font-bold bg-gray-50 text-gray-900"
                                            >
                                                <option value="">-- Add employee to {d.name} --</option>
                                                {unassignedEmps.map(emp => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.name} {emp.driver_id ? `(Currently with another driver)` : '(Unassigned)'}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const empIdStr = selectedEmpToAdd[d.id];
                                                    if (!empIdStr) return;
                                                    const empId = parseInt(empIdStr);
                                                    setEmployees(prev => prev.map(item => item.id === empId ? { ...item, driver_id: d.id } : item));
                                                    setSelectedEmpToAdd(prev => ({ ...prev, [d.id]: '' }));
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                                            >
                                                ➕ Add
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        {savedMessage && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                                ✔ Employee roster saved successfully!
                            </span>
                        )}
                        <div className="ml-auto">
                            <button
                                type="button"
                                onClick={handleSaveRoster}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors shadow disabled:opacity-50"
                            >
                                {saving ? 'Saving Roster...' : '💾 Save Driver Roster'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: MANAGE DRIVERS */}
            {activeTab === 'drivers' && (
                <div className="space-y-6">
                    <form onSubmit={handleAddDriver} className="bg-gray-50 border p-5 rounded-xl space-y-4">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">➕ Add New Driver</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Driver Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Youssef"
                                    value={newDriverName}
                                    onChange={(e) => setNewDriverName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white text-gray-900 font-bold"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 0600000000"
                                    value={newDriverPhone}
                                    onChange={(e) => setNewDriverPhone(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white text-gray-900"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={saving || !newDriverName.trim()}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors shadow disabled:opacity-50"
                                >
                                    {saving ? 'Adding...' : '➕ Add Driver'}
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="overflow-x-auto border rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                                <th className="p-3">Driver Name</th>
                                <th className="p-3">Phone</th>
                                <th className="p-3 text-center">Assigned Passengers</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {drivers.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-6 text-gray-400">No drivers added yet.</td></tr>
                            ) : (
                                drivers.map((d) => {
                                    const assignedCount = employees.filter(emp => emp.driver_id === d.id).length;
                                    return (
                                        <tr key={d.id} className="border-t hover:bg-gray-50 text-sm text-gray-800">
                                            <td className="p-3 font-bold">{d.name}</td>
                                            <td className="p-3 text-gray-500">{d.phone || 'N/A'}</td>
                                            <td className="p-3 text-center font-black text-indigo-600">{assignedCount} employees ({assignedCount * 80} DH/mo)</td>
                                            <td className="p-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDriver(d.id)}
                                                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}