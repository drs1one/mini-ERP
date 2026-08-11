'use client';

interface NavbarProps {
    activeTab: 'attendance' | 'payroll' | 'monthly' | 'transport';
    setActiveTab: (tab: 'attendance' | 'payroll' | 'monthly' | 'transport') => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
    return (
        <div className="flex flex-wrap space-x-2 mb-6 border-b border-gray-200 pb-3 gap-y-2">
            <button
                onClick={() => setActiveTab('attendance')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                    activeTab === 'attendance'
                        ? 'bg-indigo-600 text-white shadow-indigo-100'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
            >
                Daily Attendance Sheet
            </button>
            <button
                onClick={() => setActiveTab('payroll')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                    activeTab === 'payroll'
                        ? 'bg-indigo-600 text-white shadow-indigo-100'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
            >
                Cumulative Payroll Summary
            </button>
            <button
                onClick={() => setActiveTab('monthly')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                    activeTab === 'monthly'
                        ? 'bg-indigo-600 text-white shadow-indigo-100'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
            >
                Monthly Ledger & Report
            </button>
            <button
                onClick={() => setActiveTab('transport')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                    activeTab === 'transport'
                        ? 'bg-indigo-600 text-white shadow-indigo-100'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
            >
                Transport & Logistics
            </button>
        </div>
    );
}