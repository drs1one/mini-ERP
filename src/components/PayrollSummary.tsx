'use client';
import { useState, FormEvent } from 'react';

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

interface Employee {
    id: number;
    matricule: string;
    name: string;
    cin?: string;
    phone?: string;
    address?: string;
    birth_date?: string;
    age?: number;
    is_student?: number; // 0 for Permanent, 1 for Student
    hourly_rate: number;
    weekly_hours: number;
    has_transport: number;
    transport_allowance: number;
    prime: number;
    gross_salary: number;
    advance: number;
    credit: number;
    total_net: number;
    cumulative_hours?: number;
    primary_station?: string;
    secondary_stations?: string[];
}

interface Props {
    employees: Employee[];
    dailyRecords: Record<number, DailyRow>;
    loading: boolean;
    onDelete: (id: number) => void;
    onRefresh: () => void;
}

const WORKSHOP_STATIONS = [
    { key: 'tracage', label: 'Traçage' },
    { key: '5yata', label: '5yata' },
    { key: 'sourgi', label: 'Sourgi' },
    { key: 'finisio', label: 'Finisio' },
    { key: 'control', label: 'Control' },
    { key: 'planxa', label: 'Planxa' },
];

export default function PayrollSummary({ employees, dailyRecords, loading, onDelete, onRefresh }: Props) {
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Edit form states
    const [matricule, setMatricule] = useState('');
    const [name, setName] = useState('');
    const [cin, setCin] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [isStudent, setIsStudent] = useState(false);
    const [hourlyRate, setHourlyRate] = useState('');
    const [hasTransport, setHasTransport] = useState(true);
    const [prime, setPrime] = useState('');
    const [advance, setAdvance] = useState('');
    const [credit, setCredit] = useState('');

    // Station edit states
    const [primaryStation, setPrimaryStation] = useState('5yata');
    const [secondaryStations, setSecondaryStations] = useState<string[]>([]);

    const calculateAge = (dob: string) => {
        if (!dob) return 0;
        const birthDateObj = new Date(dob);
        const todayObj = new Date();
        let age = todayObj.getFullYear() - birthDateObj.getFullYear();
        const m = todayObj.getMonth() - birthDateObj.getMonth();
        if (m < 0 || (m === 0 && todayObj.getDate() < birthDateObj.getDate())) {
            age--;
        }
        return age >= 0 ? age : 0;
    };

    const currentAge = calculateAge(birthDate);

    const handleSecondaryToggle = (stationKey: string) => {
        if (secondaryStations.includes(stationKey)) {
            setSecondaryStations(secondaryStations.filter(k => k !== stationKey));
        } else {
            setSecondaryStations([...secondaryStations, stationKey]);
        }
    };

    const openEditModal = (emp: Employee) => {
        setEditingEmployee(emp);
        setMatricule(emp.matricule || '');
        setName(emp.name || '');
        setCin(emp.cin || '');
        setPhone(emp.phone || '');
        setAddress(emp.address || '');
        setBirthDate(emp.birth_date || '');
        setIsStudent(emp.is_student === 1);
        setHourlyRate(emp.hourly_rate?.toString() || '');
        setHasTransport(emp.has_transport === 1);
        setPrime(emp.prime?.toString() || '');
        setAdvance(emp.advance?.toString() || '');
        setCredit(emp.credit?.toString() || '');
        setPrimaryStation(emp.primary_station || '5yata');
        setSecondaryStations(emp.secondary_stations || []);
    };

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) return;

        try {
            const finalTransport = hasTransport ? 80 : 0;
            const res = await fetch('/api/employees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingEmployee.id,
                    matricule,
                    name,
                    cin,
                    phone,
                    address,
                    birth_date: birthDate,
                    age: currentAge,
                    is_student: isStudent ? 1 : 0,
                    hourly_rate: parseFloat(hourlyRate) || 0,
                    has_transport: hasTransport ? 1 : 0,
                    transport_allowance: finalTransport,
                    prime: parseFloat(prime) || 0,
                    advance: parseFloat(advance) || 0,
                    credit: parseFloat(credit) || 0,
                    primary_station: primaryStation,
                    secondary_stations: secondaryStations,
                })
            });

            const data = await res.json() as { success?: boolean; error?: string };
            if (data.success) {
                setEditingEmployee(null);
                onRefresh();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.matricule.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Selection Handlers
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

    // --- PDF / PRINT GENERATORS ---
    const getTargetEmployees = () => {
        if (selectedIds.length > 0) {
            return employees.filter(e => selectedIds.includes(e.id));
        }
        return filteredEmployees;
    };

    const printBulletins = () => {
        const target = getTargetEmployees();
        if (target.length === 0) {
            alert('No employees selected.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bulletin de Paie</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; font-size: 13px; }
                    .page { page-break-after: always; height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border: 1px dashed #ccc; margin-bottom: 20px; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .title { font-size: 20px; font-weight: bold; text-transform: uppercase; color: #1e3a8a; }
                    .subtitle { font-size: 12px; color: #666; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                    .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
                    .box h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                    th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
                    .text-right { text-align: right; }
                    .totals-box { background: #eff6ff; border: 2px solid #bfdbfe; padding: 15px; border-radius: 8px; margin-top: auto; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
                    .net-row { font-size: 18px; font-weight: bold; color: #1e40af; border-top: 1px solid #93c5fd; padding-top: 8px; margin-top: 8px; }
                    @media print { .page { border: none; margin: 0; padding: 0; height: auto; } }
                </style>
            </head>
            <body>
                ${target.map(emp => {
            const workedHours = Number((emp.cumulative_hours ?? 0).toFixed(2));
            const hoursAmount = Number((workedHours * emp.hourly_rate).toFixed(2));
            const transport = emp.transport_allowance || 0;
            const prime = emp.prime || 0;
            const gross = Number((hoursAmount + transport + prime).toFixed(2));
            const advance = emp.advance || 0;
            const credit = emp.credit || 0;
            const totalDeductions = Number((advance + credit).toFixed(2));
            const net = Number((gross - totalDeductions).toFixed(2));

            return `
                        <div class="page">
                            <div>
                                <div class="header">
                                    <div>
                                        <div class="title">Bulletin de Paie</div>
                                        <div class="subtitle">Période : 01/08/2026 - 31/08/2026</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <strong>Atelier / Station:</strong> ${emp.primary_station || '5yata'}<br/>
                                        <strong>Statut:</strong> ${emp.is_student === 1 ? 'Étudiant' : 'Permanent'}
                                    </div>
                                </div>

                                <div class="grid">
                                    <div class="box">
                                        <h4>Informations Salarié</h4>
                                        <p><strong>Matricule :</strong> ${emp.matricule}</p>
                                        <p><strong>Nom & Prénom :</strong> ${emp.name}</p>
                                        <p><strong>CIN :</strong> ${emp.cin || '—'}</p>
                                    </div>
                                    <div class="box">
                                        <h4>Coordonnées & Paiement</h4>
                                        <p><strong>Téléphone :</strong> ${emp.phone || '—'}</p>
                                        <p><strong>Taux Horaire :</strong> ${emp.hourly_rate} DH</p>
                                        <p><strong>Adresse :</strong> ${emp.address || '—'}</p>
                                    </div>
                                </div>

                                <table>
                                    <thead>
                                        <tr>
                                            <th>Élément de Salaire</th>
                                            <th class="text-right">Base / Heures</th>
                                            <th class="text-right">Taux / Montant</th>
                                            <th class="text-right">Total Partiel</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Heures Travaillées</td>
                                            <td class="text-right">${workedHours} hrs</td>
                                            <td class="text-right">${emp.hourly_rate} DH</td>
                                            <td class="text-right">${hoursAmount} DH</td>
                                        </tr>
                                        <tr>
                                            <td>Prime</td>
                                            <td class="text-right">—</td>
                                            <td class="text-right">—</td>
                                            <td class="text-right">${prime} DH</td>
                                        </tr>
                                        <tr>
                                            <td>Transport</td>
                                            <td class="text-right">—</td>
                                            <td class="text-right">—</td>
                                            <td class="text-right">${transport} DH</td>
                                        </tr>
                                        <tr>
                                            <td>Avance sur Salaire</td>
                                            <td class="text-right">—</td>
                                            <td class="text-right">—</td>
                                            <td class="text-right" style="color: red;">-${advance} DH</td>
                                        </tr>
                                        <tr>
                                            <td>Crédit</td>
                                            <td class="text-right">—</td>
                                            <td class="text-right">—</td>
                                            <td class="text-right" style="color: red;">-${credit} DH</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div class="totals-box">
                                <div class="total-row">
                                    <span>Salaire Brut :</span>
                                    <strong>${gross} DH</strong>
                                </div>
                                <div class="total-row">
                                    <span>Total Déductions (Avance + Crédit) :</span>
                                    <strong style="color: red;">-${totalDeductions} DH</strong>
                                </div>
                                <div class="total-row net-row">
                                    <span>NET À PAYER :</span>
                                    <span>${net} DH</span>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const printSignatureSheet = () => {
        const target = getTargetEmployees();
        if (target.length === 0) {
            alert('No employees selected.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fiche de Signature - Paie</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
                    h2 { text-align: center; color: #1e3a8a; text-transform: uppercase; margin-bottom: 5px; }
                    .date-range { text-align: center; font-size: 14px; color: #666; margin-bottom: 25px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #333; padding: 10px; text-align: left; }
                    th { background: #f1f5f9; text-transform: uppercase; font-size: 12px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .sign-cell { height: 40px; }
                </style>
            </head>
            <body>
                <h2>État de Signature - Paiement des Salaires</h2>
                <div class="date-range">Période du 01/08/2026 au 31/08/2026</div>
                <table>
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 70px;">Matricule</th>
                            <th>Nom & Prénom</th>
                            <th class="text-center">Station</th>
                            <th class="text-right">Net à Payer</th>
                            <th class="text-center" style="width: 180px;">Signature / Emargement</th>
                        </tr>
                    </thead>
                    <tbody>
                        {target.map(emp => {
                            const workedHours = Number((emp.cumulative_hours ?? 0).toFixed(2));
                            const gross = (workedHours * emp.hourly_rate) + (emp.transport_allowance || 0) + (emp.prime || 0);
                            const net = gross - (emp.advance || 0) - (emp.credit || 0);
                            return \`
                                <tr>
                                    <td class="text-center">\${emp.matricule}</td>
                                    <td><strong>\${emp.name}</strong></td>
                                    <td class="text-center">\${emp.primary_station || '5yata'}</td>
                                    <td class="text-right"><strong>\${net.toFixed(2)} DH</strong></td>
                                    <td class="sign-cell"></td>
                                </tr>
                            \`;
                        }).join('')}
                    </tbody>
                </table>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const printAccountingSheet = () => {
        const target = getTargetEmployees();
        if (target.length === 0) {
            alert('No employees selected.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>État Comptable Global</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; padding: 20px; font-size: 12px; }
                    h2 { text-align: center; color: #1e3a8a; text-transform: uppercase; margin-bottom: 5px; }
                    .date-range { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
                    th { background: #f1f5f9; text-transform: uppercase; font-size: 11px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .total-bold { font-weight: bold; background: #f8fafc; }
                </style>
            </head>
            <body>
                <h2>État Comptable Global des Salaires</h2>
                <div class="date-range">Période du 01/08/2026 au 31/08/2026</div>
                <table>
                    <thead>
                        <tr>
                            <th>Matricule</th>
                            <th>Nom</th>
                            <th class="text-center">Heures</th>
                            <th class="text-right">Taux</th>
                            <th class="text-right">Transport</th>
                            <th class="text-right">Prime</th>
                            <th class="text-right">Brut</th>
                            <th class="text-right">Avance</th>
                            <th class="text-right">Crédit</th>
                            <th class="text-right">Net Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${target.map(emp => {
            const hours = Number((emp.cumulative_hours ?? 0).toFixed(2));
            const gross = Number(((hours * emp.hourly_rate) + (emp.transport_allowance || 0) + (emp.prime || 0)).toFixed(2));
            const net = Number((gross - (emp.advance || 0) - (emp.credit || 0)).toFixed(2));
            return `
                                <tr>
                                    <td>${emp.matricule}</td>
                                    <td><strong>${emp.name}</strong></td>
                                    <td class="text-center">${hours}</td>
                                    <td class="text-right">${emp.hourly_rate}</td>
                                    <td class="text-right">${emp.transport_allowance || 0}</td>
                                    <td class="text-right">${emp.prime || 0}</td>
                                    <td class="text-right"><strong>${gross}</strong></td>
                                    <td class="text-right" style="color: red;">${emp.advance || 0}</td>
                                    <td class="text-right" style="color: red;">${emp.credit || 0}</td>
                                    <td class="text-right" style="color: green;"><strong>${net}</strong></td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto relative">
            <div className="p-6 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-gray-700">Cumulative Payroll Summary</h2>
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        Total: {employees.length} Employees
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* PDF Action Buttons */}
                    <button
                        onClick={printBulletins}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                        title="Generate pay slips for selected or all employees"
                    >
                        📄 Bulletins de Paie {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>
                    <button
                        onClick={printSignatureSheet}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                        title="Generate employee sign-off sheet"
                    >
                        ✍️ Fiche de Signature
                    </button>
                    <button
                        onClick={printAccountingSheet}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                        title="Generate accounting summary sheet"
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
                        <th className="p-4">Total Worked Hours</th>
                        <th className="p-4">Transport</th>
                        <th className="p-4 bg-blue-50 text-blue-800 font-bold">Gross Salary</th>
                        <th className="p-4 bg-green-50 text-green-800 font-bold">Total Net</th>
                        <th className="p-4">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredEmployees.length === 0 ? (
                        <tr>
                            <td colSpan={11} className="text-center py-8 text-gray-400">No employees found matching your search.</td>
                        </tr>
                    ) : (
                        filteredEmployees.map((emp) => {
                            const isSelected = selectedIds.includes(emp.id);
                            const workedHours = Number((emp.cumulative_hours ?? 0).toFixed(2));
                            const grossSalary = Number(((workedHours * emp.hourly_rate) + (emp.transport_allowance || 0) + (emp.prime || 0)).toFixed(2));
                            const totalNet = Number((grossSalary - (emp.advance || 0) - (emp.credit || 0)).toFixed(2));

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
                                    <td className="p-4 font-semibold text-blue-600">{workedHours} hrs</td>
                                    <td className="p-4 font-medium text-gray-700">{emp.transport_allowance} DH</td>
                                    <td className="p-4 bg-blue-50 font-bold text-blue-700">{grossSalary} DH</td>
                                    <td className="p-4 bg-green-50 font-bold text-green-700">{totalNet} DH</td>
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => openEditModal(emp)} className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
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

            {/* Quick Info Popup Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEmployee(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start border-b pb-3">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedEmployee.name}</h3>
                                <p className="text-xs text-gray-500">Matricule: {selectedEmployee.matricule}</p>
                            </div>
                            <button onClick={() => setSelectedEmployee(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5">
                                <span className="block text-xs font-bold text-indigo-900 uppercase">Station & Skills</span>
                                <p className="text-xs text-gray-700"><strong>Primary:</strong> {selectedEmployee.primary_station || '5yata'}</p>
                                <p className="text-xs text-gray-700"><strong>Secondary:</strong> {selectedEmployee.secondary_stations?.length ? selectedEmployee.secondary_stations.join(', ') : 'None'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="block text-xs text-gray-500">Age & DOB</span>
                                    <span className="font-bold text-gray-900">{selectedEmployee.age ? `${selectedEmployee.age} years old` : '—'}</span>
                                    {selectedEmployee.birth_date && <span className="block text-xs text-gray-400">{selectedEmployee.birth_date}</span>}
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="block text-xs text-gray-500">Status</span>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${selectedEmployee.is_student === 1 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {selectedEmployee.is_student === 1 ? 'Étudiant' : 'Permanent'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between bg-gray-50 p-3 rounded-lg">
                                <span className="text-gray-600 font-medium">CIN / ID Card:</span>
                                <span className="font-bold text-gray-900">{selectedEmployee.cin || 'Not provided'}</span>
                            </div>

                            <div className="flex justify-between bg-blue-50 p-3 rounded-lg items-center">
                                <span className="text-blue-800 font-medium">Phone Number:</span>
                                {selectedEmployee.phone ? (
                                    <a href={`tel:${selectedEmployee.phone}`} className="font-bold text-blue-600 hover:underline">
                                        {selectedEmployee.phone} 📞
                                    </a>
                                ) : (
                                    <span className="text-gray-400 italic">Not provided</span>
                                )}
                            </div>

                            <div className="flex justify-between bg-gray-50 p-3 rounded-lg">
                                <span className="text-gray-600 font-medium">Address / Pickup:</span>
                                <span className="font-bold text-gray-900">{selectedEmployee.address || 'Not provided'}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2">
                                <div className="p-3 border rounded-lg bg-gray-50">
                                    <span className="block text-xs text-gray-500">Prime</span>
                                    <span className="font-bold text-gray-800">{selectedEmployee.prime || 0} DH</span>
                                </div>
                                <div className="p-3 border rounded-lg bg-orange-50">
                                    <span className="block text-xs text-orange-600">Avance</span>
                                    <span className="font-bold text-orange-600">{selectedEmployee.advance || 0} DH</span>
                                </div>
                                <div className="p-3 border rounded-lg bg-red-50">
                                    <span className="block text-xs text-red-600">Credit</span>
                                    <span className="font-bold text-red-600">{selectedEmployee.credit || 0} DH</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedEmployee(null)}
                            className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Employee Modal */}
            {editingEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setEditingEmployee(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start border-b pb-3">
                            <h3 className="text-xl font-bold text-gray-900">Edit Employee: {editingEmployee.name}</h3>
                            <button onClick={() => setEditingEmployee(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">CIN / ID Card</label>
                                    <input type="text" value={cin} onChange={(e) => setCin(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number</label>
                                    <input type="text" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Workshop Station Assignment</h3>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Primary Station (Main Role)</label>
                                    <select
                                        value={primaryStation}
                                        onChange={(e) => setPrimaryStation(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white font-medium"
                                    >
                                        {WORKSHOP_STATIONS.map((station) => (
                                            <option key={station.key} value={station.key}>{station.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Secondary Stations (Can also work on):</label>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        {WORKSHOP_STATIONS.map((station) => {
                                            if (station.key === primaryStation) return null;
                                            const isSelected = secondaryStations.includes(station.key);
                                            return (
                                                <button
                                                    type="button"
                                                    key={station.key}
                                                    onClick={() => handleSecondaryToggle(station.key)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-colors border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                                >
                                                    {isSelected ? '✓ ' : '+ '} {station.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Date of Birth</label>
                                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Calculated Age</label>
                                    <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-800 font-bold flex items-center justify-between">
                                        <span>{birthDate ? `${currentAge} yrs` : '—'}</span>
                                        <span className="text-xs text-indigo-600 font-normal">Auto</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Student Status</label>
                                    <select value={isStudent ? 'oui' : 'non'} onChange={(e) => setIsStudent(e.target.value === 'oui')} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white">
                                        <option value="non">Non (Permanent)</option>
                                        <option value="oui">Oui (Étudiant)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Address</label>
                                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Rate</label>
                                    <input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Transport</label>
                                    <select value={hasTransport ? 'oui' : 'non'} onChange={(e) => setHasTransport(e.target.value === 'oui')} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white">
                                        <option value="oui">Oui</option>
                                        <option value="non">Non</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Prime</label>
                                    <input type="number" step="0.01" value={prime} onChange={(e) => setPrime(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                                </div>
                            </div>

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

                            <div className="flex space-x-3 pt-2">
                                <button type="button" onClick={() => setEditingEmployee(null)} className="w-1/2 bg-gray-200 text-gray-800 py-2.5 rounded-xl font-bold hover:bg-gray-300 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="w-1/2 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}