'use client';
import { useState } from 'react';
import { printBulletins, printSignatureSheet, printAccountingSheet } from '@/utils/printPayroll';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import EmployeeDetailsModal from '@/components/EmployeeDetailsModal';

interface DailyRow {
    employee_id: number;
    is_present: boolean;
    declaration_status?: string;
}

interface Employee {
    id: number;
    matricule: string;
    name: string;
    cin?: string;
    phone?: string;
    address?: string;
    birth_date?: string;
    age?: number;
    is_student?: number;
    hourly_rate: number;
    weekly_hours: number;
    has_transport: number;
    transport_allowance: number;
    prime: number;
    gross_salary: number;
    advance: number;
    credit: number;
    net_salary: number;
    total_net: number;   // Required by print utility
    total_gross: number; // Required by print utility
    primary_station?: string;
    secondary_stations?: string[];
}

interface Props {
    employees: Employee[];
    dailyRecords: Record<number, DailyRow>;
    loading: boolean;
    onRefresh: () => void;
}

type FilterType = 'all' | 'present' | 'absent' | 'declared' | 'not_declared';

export default function PayrollSummary({ employees, dailyRecords, loading, onRefresh }: Props) {
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [statusFilter, setStatusFilter] = useState<FilterType>('all');

    const totalPresent = employees.filter(emp => Boolean(dailyRecords[emp.id]?.is_present)).length;
    const totalAbsent = employees.length - totalPresent;
    const totalDeclared = employees.filter(emp => dailyRecords[emp.id]?.declaration_status === 'declared').length;
    const totalNotDeclared = employees.length - totalDeclared;

    // Helper to compute salary dynamically if backend value is 0 or missing
    const calculateSalaries = (emp: Employee) => {
        const gross = emp.gross_salary || ((emp.hourly_rate || 0) * (emp.weekly_hours || 0) * 4) + (emp.prime || 0);
        const net = emp.net_salary || (gross + (emp.transport_allowance || 0) - (emp.advance || 0) - (emp.credit || 0));
        return { gross, net };
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.matricule.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        const record = dailyRecords[emp.id];
        const isPresent = Boolean(record?.is_present);
        const isDeclared = record?.declaration_status === 'declared';

        if (statusFilter === 'present') return isPresent;
        if (statusFilter === 'absent') return !isPresent;
        if (statusFilter === 'declared') return isDeclared;
        if (statusFilter === 'not_declared') return !isDeclared;

        return true;
    });

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredEmployees.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEmployees.map(e => e.id));
        }
    };

    const toggleSelectOne = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} employee(s)?`)) return;

        try {
            const res = await fetch('/api/employees', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            const data = await res.json() as { success?: boolean; error?: string };

            if (data.success) {
                setSelectedIds([]);
                onRefresh();
            } else {
                alert(data.error || 'Failed to delete selected employees');
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    const getTargetEmployees = () => {
        const rawList = selectedIds.length > 0
            ? employees.filter(e => selectedIds.includes(e.id))
            : filteredEmployees;

        return rawList.map(e => {
            const { gross, net } = calculateSalaries(e);
            return {
                ...e,
                gross_salary: gross,
                net_salary: net,
                total_net: net,
                total_gross: gross
            };
        });
    };

    const handleFilterClick = (filter: FilterType) => {
        setStatusFilter(prev => prev === filter ? 'all' : filter);
    };

    return (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto relative">
            <div className="p-6 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-700">Cumulative Payroll Summary</h2>
                        {statusFilter !== 'all' && (
                            <button
                                onClick={() => setStatusFilter('all')}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                            >
                                Clear Filter ({statusFilter})
                            </button>
                        )}
                    </div>
                    <div className="flex items-center flex-wrap gap-2">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-all ${
                                statusFilter === 'all'
                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                    : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                            }`}
                        >
                            Total: {employees.length}
                        </button>
                        <button
                            onClick={() => handleFilterClick('present')}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-all ${
                                statusFilter === 'present'
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            }`}
                        >
                            Present: {totalPresent}
                        </button>
                        <button
                            onClick={() => handleFilterClick('absent')}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-all ${
                                statusFilter === 'absent'
                                    ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                        >
                            Absent: {totalAbsent}
                        </button>
                        <button
                            onClick={() => handleFilterClick('declared')}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-all ${
                                statusFilter === 'declared'
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                        >
                            Declared: {totalDeclared}
                        </button>
                        <button
                            onClick={() => handleFilterClick('not_declared')}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-all ${
                                statusFilter === 'not_declared'
                                    ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                        >
                            Not Declared: {totalNotDeclared}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <button
                        onClick={() => printBulletins(getTargetEmployees())}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                        📄 Bulletins de Paie {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>
                    <button
                        onClick={() => printSignatureSheet(getTargetEmployees())}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                        ✍️ Fiche de Signature
                    </button>
                    <button
                        onClick={() => printAccountingSheet(getTargetEmployees())}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                        📊 État Comptable
                    </button>

                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                        >
                            🗑️ Delete ({selectedIds.length})
                        </button>
                    )}

                    <div className="relative w-full md:w-60">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 text-xs">
                            🔍
                        </span>
                        <input
                            type="text"
                            placeholder="Search by name or matricule..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {loading ? <p className="p-6 text-gray-500">Loading...</p> : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                        <th className="p-4 w-12 text-center">
                            <input
                                type="checkbox"
                                checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                            />
                        </th>
                        <th className="p-4">Matricule</th>
                        <th className="p-4">Name</th>
                        <th className="p-4 text-center">Station</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4">Rate</th>
                        <th className="p-4">Weekly Hours (Plan)</th>
                        <th className="p-4">Transport</th>
                        <th className="p-4 bg-blue-50 text-blue-800 font-bold">Gross Salary</th>
                        <th className="p-4 bg-green-50 text-green-800 font-bold">Total Net</th>
                        <th className="p-4">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredEmployees.length === 0 ? (
                        <tr>
                            <td colSpan={11} className="text-center py-8 text-gray-400">No employees found matching your filter/search.</td>
                        </tr>
                    ) : (
                        filteredEmployees.map((emp) => {
                            const isSelected = selectedIds.includes(emp.id);
                            const { gross, net } = calculateSalaries(emp);

                            return (
                                <tr
                                    key={emp.id}
                                    className={`border-t hover:bg-gray-50 text-gray-800 text-sm cursor-pointer ${isSelected ? 'bg-indigo-50/60' : ''}`}
                                    onClick={() => setSelectedEmployee(emp)}
                                >
                                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectOne(emp.id)}
                                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                                        />
                                    </td>
                                    <td className="p-4 font-medium">{emp.matricule}</td>
                                    <td className="p-4 font-semibold text-blue-600 hover:underline">{emp.name}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold border border-indigo-200">
                                            {emp.primary_station || '5yata'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${emp.is_student === 1 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {emp.is_student === 1 ? 'Étudiant' : 'Permanent'}
                                        </span>
                                    </td>
                                    <td className="p-4">{emp.hourly_rate} DH</td>
                                    <td className="p-4 font-semibold text-blue-600">{emp.weekly_hours || 0} hrs</td>
                                    <td className="p-4 font-medium text-gray-700">{emp.transport_allowance || 0} DH</td>
                                    <td className="p-4 bg-blue-50 font-bold text-blue-700">{gross} DH</td>
                                    <td className="p-4 bg-green-50 font-bold text-green-700">{net} DH</td>
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => setEditingEmployee(emp)} className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            )}

            {selectedEmployee && (
                <EmployeeDetailsModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
            )}

            {editingEmployee && (
                <EditEmployeeModal employee={editingEmployee} onClose={() => setEditingEmployee(null)} onRefresh={onRefresh} />
            )}
        </div>
    );
}