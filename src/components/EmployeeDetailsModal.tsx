'use client';

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
}

export default function EmployeeDetailsModal({ employee, onClose }: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start border-b pb-3">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{employee.name}</h3>
                        <p className="text-xs text-gray-500">Matricule: {employee.matricule}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
                </div>

                <div className="space-y-3 text-sm">
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5">
                        <span className="block text-xs font-bold text-indigo-900 uppercase">Station & Skills</span>
                        <p className="text-xs text-gray-700"><strong>Primary:</strong> {employee.primary_station || '5yata'}</p>
                        <p className="text-xs text-gray-700"><strong>Secondary:</strong> {employee.secondary_stations?.length ? employee.secondary_stations.join(', ') : 'None'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="block text-xs text-gray-500">Age & DOB</span>
                            <span className="font-bold text-gray-900">{employee.age ? `${employee.age} years old` : '—'}</span>
                            {employee.birth_date && <span className="block text-xs text-gray-400">{employee.birth_date}</span>}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="block text-xs text-gray-500">Status</span>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${employee.is_student === 1 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {employee.is_student === 1 ? 'Étudiant' : 'Permanent'}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="text-gray-600 font-medium">CIN / ID Card:</span>
                        <span className="font-bold text-gray-900">{employee.cin || 'Not provided'}</span>
                    </div>

                    <div className="flex justify-between bg-blue-50 p-3 rounded-lg items-center">
                        <span className="text-blue-800 font-medium">Phone Number:</span>
                        {employee.phone ? (
                            <a href={`tel:${employee.phone}`} className="font-bold text-blue-600 hover:underline">
                                {employee.phone} 📞
                            </a>
                        ) : (
                            <span className="text-gray-400 italic">Not provided</span>
                        )}
                    </div>

                    <div className="flex justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="text-gray-600 font-medium">Address / Pickup:</span>
                        <span className="font-bold text-gray-900">{employee.address || 'Not provided'}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="p-3 border rounded-lg bg-gray-50">
                            <span className="block text-xs text-gray-500">Prime</span>
                            <span className="font-bold text-gray-800">{employee.prime || 0} DH</span>
                        </div>
                        <div className="p-3 border rounded-lg bg-orange-50">
                            <span className="block text-xs text-orange-600">Avance</span>
                            <span className="font-bold text-orange-600">{employee.advance || 0} DH</span>
                        </div>
                        <div className="p-3 border rounded-lg bg-red-50">
                            <span className="block text-xs text-red-600">Credit</span>
                            <span className="font-bold text-red-600">{employee.credit || 0} DH</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}