'use client';
import { useState, FormEvent } from 'react';

export default function EmployeeForm({ onEmployeeAdded }: { onEmployeeAdded: () => void }) {
    const [matricule, setMatricule] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [hourlyRate, setHourlyRate] = useState<string>('');
    const [hasTransport, setHasTransport] = useState<boolean>(true);
    const [prime, setPrime] = useState<string>('');
    const [advance, setAdvance] = useState<string>('');
    const [credit, setCredit] = useState<string>('');

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const finalTransport = hasTransport ? 80 : 0;
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matricule, name,
                    hourly_rate: parseFloat(hourlyRate) || 0,
                    has_transport: hasTransport,
                    transport_allowance: finalTransport,
                    prime: parseFloat(prime) || 0,
                    advance: parseFloat(advance) || 0,
                    credit: parseFloat(credit) || 0,
                })
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.success) {
                setMatricule(''); setName(''); setHourlyRate(''); setPrime(''); setAdvance(''); setCredit('');
                setHasTransport(true);
                onEmployeeAdded();
            } else {
                alert(data.error);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Add New Employee</h2>
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
                <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-bold">
                    Save Employee
                </button>
            </form>
        </div>
    );
}