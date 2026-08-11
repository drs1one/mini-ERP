'use client';
import { useState, FormEvent, useEffect } from 'react';

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
    total_net: number;
    primary_station?: string;
    secondary_stations?: string[];
}

interface Props {
    employee: Employee;
    onClose: () => void;
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

export default function EditEmployeeModal({ employee, onClose, onRefresh }: Props) {
    const [matricule, setMatricule] = useState(employee.matricule || '');
    const [name, setName] = useState(employee.name || '');
    const [cin, setCin] = useState(employee.cin || '');
    const [phone, setPhone] = useState(employee.phone || '');
    const [address, setAddress] = useState(employee.address || '');
    const [birthDate, setBirthDate] = useState(employee.birth_date || '');
    const [isStudent, setIsStudent] = useState(employee.is_student === 1);
    const [hourlyRate, setHourlyRate] = useState(employee.hourly_rate?.toString() || '');
    const [hasTransport, setHasTransport] = useState(employee.has_transport === 1);
    const [prime, setPrime] = useState(employee.prime?.toString() || '');
    const [advance, setAdvance] = useState(employee.advance?.toString() || '');
    const [credit, setCredit] = useState(employee.credit?.toString() || '');

    const [primaryStation, setPrimaryStation] = useState(employee.primary_station || '5yata');
    const [secondaryStations, setSecondaryStations] = useState<string[]>(employee.secondary_stations || []);

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

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();

        try {
            const finalTransport = hasTransport ? 80 : 0;
            const res = await fetch('/api/employees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: employee.id,
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
                onClose();
                onRefresh();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start border-b pb-3">
                    <h3 className="text-xl font-bold text-gray-900">Edit Employee: {employee.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
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
                        <button type="button" onClick={onClose} className="w-1/2 bg-gray-200 text-gray-800 py-2.5 rounded-xl font-bold hover:bg-gray-300 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="w-1/2 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}