'use client';
import { useState, useEffect } from 'react';

interface ProductionRecord {
    id: number;
    model_name: string;
    garment_type: string;
    taille: string;
    quantity: number;
    unit_price: number;
    date: string;
}

interface ExpenseRecord {
    id: number;
    expense_name: string;
    category: string;
    amount: number;
    date: string;
}

interface Employee {
    id: number;
    employee_name: string;
    total_net?: number;
    gross_salary?: number;
    date: string;
}

export default function FinancialsManager() {
    const [production, setProduction] = useState<ProductionRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    // Form states for Production
    const [modelName, setModelName] = useState('');
    const [garmentType, setGarmentType] = useState('');
    const [taille, setTaille] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [prodDate, setProdDate] = useState(new Date().toISOString().split('T')[0]);

    // Form states for Expenses
    const [expenseName, setExpenseName] = useState('');
    const [category, setCategory] = useState('materials');
    const [amount, setAmount] = useState('');
    const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

    // Form states for Employees
    const [empName, setEmpName] = useState('');
    const [empSalary, setEmpSalary] = useState('');
    const [empDate, setEmpDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchData = async () => {
        try {
            const [prodRes, expRes, empRes] = await Promise.all([
                fetch('/api/production'),
                fetch('/api/expenses'),
                fetch('/api/employees')
            ]);

            const prodData = (await prodRes.json()) as { success: boolean; records?: ProductionRecord[] };
            const expData = (await expRes.json()) as { success: boolean; expenses?: ExpenseRecord[] };
            const empData = (await empRes.json()) as { success: boolean; employees?: Employee[] };

            if (prodData.success && prodData.records) setProduction(prodData.records);
            if (expData.success && expData.expenses) setExpenses(expData.expenses);
            if (empData.success && empData.employees) setEmployees(empData.employees);
        } catch (err) {
            console.error('Failed to load financial records', err);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const handleAddProduction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modelName || !quantity || !unitPrice || !prodDate) return;

        try {
            const res = await fetch('/api/production', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_name: modelName,
                    garment_type: garmentType,
                    taille,
                    quantity: Number(quantity),
                    unit_price: Number(unitPrice),
                    date: prodDate
                })
            });
            const data = (await res.json()) as { success: boolean; error?: string };
            if (data.success) {
                setModelName('');
                setGarmentType('');
                setTaille('');
                setQuantity('');
                setUnitPrice('');
                void fetchData();
            } else {
                alert(data.error || 'Failed to add production record');
            }
        } catch (err) {
            alert('Error adding production record');
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseName || !category || !amount || !expDate) return;

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expense_name: expenseName,
                    category,
                    amount: Number(amount),
                    date: expDate
                })
            });
            const data = (await res.json()) as { success: boolean; error?: string };
            if (data.success) {
                setExpenseName('');
                setAmount('');
                void fetchData();
            } else {
                alert(data.error || 'Failed to add expense');
            }
        } catch (err) {
            alert('Error adding expense');
        }
    };

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empName || !empSalary || !empDate) return;

        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_name: empName,
                    total_net: Number(empSalary),
                    date: empDate
                })
            });
            const data = (await res.json()) as { success: boolean; error?: string };
            if (data.success) {
                setEmpName('');
                setEmpSalary('');
                void fetchData();
            } else {
                alert(data.error || 'Failed to add employee payroll');
            }
        } catch (err) {
            alert('Error adding employee payroll');
        }
    };

    const totalRevenue = production.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalOperatingExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalPayrollNet = employees.reduce((sum, emp) => sum + (emp.total_net ?? emp.gross_salary ?? 0), 0);
    const totalExpenses = totalOperatingExpenses + totalPayrollNet;

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm">
                    <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Model Revenue</div>
                    <div className="text-2xl font-extrabold text-emerald-700 mt-2">{totalRevenue.toFixed(2)} DH</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm">
                    <div className="text-xs text-amber-600 font-bold uppercase tracking-wider">Total Employee Salaries</div>
                    <div className="text-2xl font-extrabold text-amber-700 mt-2">{totalPayrollNet.toFixed(2)} DH</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl shadow-sm">
                    <div className="text-xs text-orange-600 font-bold uppercase tracking-wider">Total Expenses (OpEx + Payroll)</div>
                    <div className="text-2xl font-extrabold text-orange-700 mt-2">{totalExpenses.toFixed(2)} DH</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl shadow-sm">
                    <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Gross Operating Balance</div>
                    <div className="text-2xl font-extrabold text-indigo-700 mt-2">{(totalRevenue - totalExpenses).toFixed(2)} DH</div>
                </div>
            </div>

            {/* Grid for Production and Expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Add Production / Models Form & List */}
                <div className="bg-white p-6 rounded-2xl shadow-md space-y-6">
                    <h2 className="text-xl font-bold text-gray-800">👗 Model Production & Winnings</h2>

                    <form onSubmit={handleAddProduction} className="space-y-4 bg-gray-50 p-4 rounded-xl border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Model Name / Number</label>
                                <input
                                    type="text"
                                    value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                    placeholder="e.g., Model A-123"
                                    required
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Type (e.g., Robe, Pantalon)</label>
                                <input
                                    type="text"
                                    value={garmentType}
                                    onChange={(e) => setGarmentType(e.target.value)}
                                    placeholder="e.g., Robe, Pantalon..."
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Taille (Size)</label>
                                <input
                                    type="text"
                                    value={taille}
                                    onChange={(e) => setTaille(e.target.value)}
                                    placeholder="e.g., S, M, L, XL or 38, 40"
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Quantity (Pieces / Qty)</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="e.g., 50"
                                    required
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Unit Price per Piece (DH)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                    placeholder="e.g., 120"
                                    required
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={prodDate}
                                    onChange={(e) => setProdDate(e.target.value)}
                                    required
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow transition-all">
                            Add Production Record
                        </button>
                    </form>

                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                            <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                                <th className="p-3">Model</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Taille</th>
                                <th className="p-3">Qty (ps)</th>
                                <th className="p-3">Price/ps</th>
                                <th className="p-3">Total Wining</th>
                            </tr>
                            </thead>
                            <tbody>
                            {production.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-4 text-gray-400">No production records found.</td></tr>
                            ) : (
                                production.map((p) => (
                                    <tr key={p.id} className="border-t hover:bg-gray-50">
                                        <td className="p-3 font-semibold text-gray-900">{p.model_name}</td>
                                        <td className="p-3 capitalize">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">{p.garment_type || '—'}</span>
                                        </td>
                                        <td className="p-3 font-medium text-gray-900">{p.taille || '—'}</td>
                                        <td className="p-3 text-gray-900">{p.quantity}</td>
                                        <td className="p-3 text-gray-900">{p.unit_price} DH</td>
                                        <td className="p-3 font-bold text-emerald-600">{(p.quantity * p.unit_price).toFixed(2)} DH</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Add Business Expenses Form & List */}
                <div className="bg-white p-6 rounded-2xl shadow-md space-y-6">
                    <h2 className="text-xl font-bold text-gray-800">📉 Operating Expenses (Rent, Electricity, Materials)</h2>

                    <form onSubmit={handleAddExpense} className="space-y-4 bg-gray-50 p-4 rounded-xl border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Expense Name / Description</label>
                                <input
                                    type="text"
                                    value={expenseName}
                                    onChange={(e) => setExpenseName(e.target.value)}
                                    placeholder="e.g., Monthly Rent / Thread & Needles"
                                    required
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                >
                                    <option value="materials">Mechanic Materials / Fabric</option>
                                    <option value="rent">Rent (Loyer)</option>
                                    <option value="electricity">Electricity</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Amount (DH)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g., 1500"
                                    required
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={expDate}
                                    onChange={(e) => setExpDate(e.target.value)}
                                    required
                                    className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl shadow transition-all">
                            Add Expense Record
                        </button>
                    </form>

                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                            <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                                <th className="p-3">Expense</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Date</th>
                            </tr>
                            </thead>
                            <tbody>
                            {expenses.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-400">No expense records found.</td></tr>
                            ) : (
                                expenses.map((e) => (
                                    <tr key={e.id} className="border-t hover:bg-gray-50">
                                        <td className="p-3 font-semibold text-gray-900">{e.expense_name}</td>
                                        <td className="p-3 capitalize">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded-md text-xs font-bold text-gray-800">{e.category}</span>
                                        </td>
                                        <td className="p-3 font-bold text-amber-600">{e.amount} DH</td>
                                        <td className="p-3 text-gray-500 text-xs">{e.date}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 3. Employee Salaries Card & Form */}
            <div className="bg-white p-6 rounded-2xl shadow-md space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800">👥 Employee Gross / Net Salaries & Payroll</h2>
                    <span className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-extrabold text-sm border border-amber-200">
                        Total Employee Salaries: {totalPayrollNet.toFixed(2)} DH
                    </span>
                </div>

                <form onSubmit={handleAddEmployee} className="space-y-4 bg-gray-50 p-4 rounded-xl border">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Employee Name</label>
                            <input
                                type="text"
                                value={empName}
                                onChange={(e) => setEmpName(e.target.value)}
                                placeholder="e.g., Ahmed / Fatima"
                                required
                                className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Salary Amount (DH)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={empSalary}
                                onChange={(e) => setEmpSalary(e.target.value)}
                                placeholder="e.g., 304"
                                required
                                className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Date</label>
                            <input
                                type="date"
                                value={empDate}
                                onChange={(e) => setEmpDate(e.target.value)}
                                required
                                className="w-full p-2.5 bg-white border rounded-xl text-sm text-gray-900"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl shadow transition-all">
                        Add Employee Salary Record
                    </button>
                </form>

                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                        <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                            <th className="p-3">Employee Name</th>
                            <th className="p-3">Salary</th>
                            <th className="p-3">Date</th>
                        </tr>
                        </thead>
                        <tbody>
                        {employees.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-4 text-gray-400">No employee salary records found.</td></tr>
                        ) : (
                            employees.map((emp) => (
                                <tr key={emp.id} className="border-t hover:bg-gray-50">
                                    <td className="p-3 font-semibold text-gray-900">{emp.employee_name}</td>
                                    <td className="p-3 font-bold text-amber-600">{(emp.total_net ?? emp.gross_salary ?? 0).toFixed(2)} DH</td>
                                    <td className="p-3 text-gray-500 text-xs">{emp.date || '—'}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}