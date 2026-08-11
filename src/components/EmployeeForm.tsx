'use client';
import { useState, FormEvent } from 'react';

interface Props {
    onEmployeeAdded: () => void;
    onClose?: () => void;
}

const WORKSHOP_STATIONS = [
    { key: 'tracage', label: 'Traçage (Marking/Cutting)' },
    { key: '5yata', label: '5yata (Main Sewing)' },
    { key: 'sourgi', label: 'Sourgi (Overlock)' },
    { key: 'finisio', label: 'Finisio (Inspection & Trimming)' },
    { key: 'control', label: 'Control (Quality Check)' },
    { key: 'planxa', label: 'Planxa (Ironing & Pressing)' },
];

export default function EmployeeForm({ onEmployeeAdded, onClose }: Props) {
    const [matricule, setMatricule] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [cin, setCin] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [birthDate, setBirthDate] = useState<string>('');
    const [isStudent, setIsStudent] = useState<boolean>(false);
    const [hourlyRate, setHourlyRate] = useState<string>('');
    const [hasTransport, setHasTransport] = useState<boolean>(true);
    const [prime, setPrime] = useState<string>('');
    const [advance, setAdvance] = useState<string>('');
    const [credit, setCredit] = useState<string>('');

    // New station selection state
    const [primaryStation, setPrimaryStation] = useState<string>('5yata');
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

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (phone && phone.length !== 10) {
            alert('Phone number must be exactly 10 digits.');
            return;
        }

        try {
            const finalTransport = hasTransport ? 80 : 0;
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matricule,
                    name,
                    cin,
                    phone,
                    address,
                    birth_date: birthDate,
                    age: currentAge,
                    is_student: isStudent,
                    hourly_rate: parseFloat(hourlyRate) || 0,
                    has_transport: hasTransport,
                    transport_allowance: finalTransport,
                    prime: parseFloat(prime) || 0,
                    advance: parseFloat(advance) || 0,
                    credit: parseFloat(credit) || 0,
                    primary_station: primaryStation,
                    secondary_stations: secondaryStations, // Sent to backend to save skills
                })
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.success) {
                setMatricule('');
                setName('');
                setCin('');
                setPhone('');
                setAddress('');
                setBirthDate('');
                setIsStudent(false);
                setHourlyRate('');
                setPrime('');
                setAdvance('');
                setCredit('');
                setHasTransport(true);
                setPrimaryStation('5yata');
                setSecondaryStations([]);
                onEmployeeAdded();
                if (onClose) onClose();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h2 className="text-xl font-bold text-gray-800">Add New Employee & Station</h2>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
                )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        <input type="text" placeholder="e.g. KB 10094" value={cin} onChange={(e) => setCin(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number</label>
                        <input
                            type="text"
                            placeholder="e.g. 06XXXXXXXX"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setPhone(val);
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-gray-900"
                        />
                    </div>
                </div>

                {/* WORKSHOP STATION ASSIGNMENT SECTION */}
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
                                if (station.key === primaryStation) return null; // Don't show primary as secondary option
                                const isSelected = secondaryStations.includes(station.key);
                                return (
                                    <button
                                        type="button"
                                        key={station.key}
                                        onClick={() => handleSecondaryToggle(station.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-colors border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        {isSelected ? '✓ ' : '+ '} {station.label.split(' ')[0]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Date of Birth (CIN Data)</label>
                        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Calculated Age</label>
                        <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-800 font-bold flex items-center justify-between">
                            <span>{birthDate ? `${currentAge} years old` : '—'}</span>
                            <span className="text-xs text-indigo-600 font-normal">Auto-calculated</span>
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
                        <label className="block text-xs font-bold text-gray-600 mb-1">Address / Pickup Location</label>
                        <input type="text" placeholder="e.g. Quartier M'sallah" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
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

                <div className="p-3 bg-gray-50 border rounded-lg flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-600">Transport Allowance:</span>
                    <span className={`font-bold ${hasTransport ? 'text-green-600' : 'text-gray-400'}`}>{hasTransport ? '80 DH / month' : '0 DH'}</span>
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
                    {onClose && (
                        <button type="button" onClick={onClose} className="w-1/2 bg-gray-200 text-gray-800 py-2.5 rounded-xl font-bold hover:bg-gray-300 transition-colors">
                            Cancel
                        </button>
                    )}
                    <button type="submit" className={`${onClose ? 'w-1/2' : 'w-full'} bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 font-bold shadow-md`}>
                        Save Employee
                    </button>
                </div>
            </form>
        </div>
    );
}