'use client';

interface Employee {
    id: number;
    matricule: string;
    name: string;
    hourly_rate: number;
    weekly_hours: number;
    transport_allowance: number;
    prime: number;
    gross_salary: number;
    advance: number;
    credit: number;
    total_net: number;
}

export default function PayrollSummary({ employees, loading, onDelete }: { employees: Employee[]; loading: boolean; onDelete: (id: number) => void }) {
    return (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
            <h2 className="text-xl font-bold p-6 bg-gray-50 border-b text-gray-700">Cumulative Payroll Summary</h2>
            {loading ? <p className="p-6 text-gray-500">Loading...</p> : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                        <th className="p-4">Matricule</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Rate</th>
                        <th className="p-4">Total Worked Hours</th>
                        <th className="p-4">Transport</th>
                        <th className="p-4">Prime</th>
                        <th className="p-4 bg-blue-50 text-blue-800 font-bold">Gross Salary</th>
                        <th className="p-4">Advance</th>
                        <th className="p-4">Credit</th>
                        <th className="p-4 bg-green-50 text-green-800 font-bold">Total Net</th>
                        <th className="p-4">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {employees.map((emp) => (
                        <tr key={emp.id} className="border-t hover:bg-gray-50 text-gray-800 text-sm">
                            <td className="p-4 font-medium">{emp.matricule}</td>
                            <td className="p-4">{emp.name}</td>
                            <td className="p-4">{emp.hourly_rate}</td>
                            <td className="p-4 font-semibold text-blue-600">{emp.weekly_hours} hrs</td>
                            <td className="p-4 font-medium text-gray-700">{emp.transport_allowance} DH</td>
                            <td className="p-4">{emp.prime}</td>
                            <td className="p-4 bg-blue-50 font-bold text-blue-700">{emp.gross_salary}</td>
                            <td className="p-4 text-orange-600">{emp.advance}</td>
                            <td className="p-4 text-red-600">{emp.credit}</td>
                            <td className="p-4 bg-green-50 font-bold text-green-700">{emp.total_net}</td>
                            <td className="p-4">
                                <button onClick={() => onDelete(emp.id)} className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}