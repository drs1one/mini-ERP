'use client';
import { useState, useEffect, FormEvent } from 'react';

interface TemplateRule {
    day_of_week?: string;
    dayOfWeek?: string;
    day?: string;
    block1_in?: string;
    block1In?: string;
    block1_out?: string;
    block1Out?: string;
    block2_in?: string;
    block2In?: string;
    block2_out?: string;
    block2Out?: string;
    block3_in?: string;
    block3In?: string;
    block3_out?: string;
    block3Out?: string;
    is_working_day?: number;
    isWorkingDay?: number;
}

interface Props {
    onRuleSaved?: () => void;
    onClose?: () => void;
}

export default function TemplatePlanner({ onRuleSaved, onClose }: Props) {
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [editDay, setEditDay] = useState<string>('Monday');
    const [rules, setRules] = useState<TemplateRule[]>([]);

    useEffect(() => {
        async function fetchTemplates() {
            try {
                const res = await fetch('/api/schedule/template');
                const data = (await res.json()) as any;

                const loaded = data.template || data.rules || data.templates || data.data || data.schedule || (Array.isArray(data) ? data : []);
                if (Array.isArray(loaded)) {
                    setRules(loaded);
                }
            } catch (err) {
                console.error('Failed to load templates', err);
            }
        }
        fetchTemplates();
    }, []);

    const [block1In, setBlock1In] = useState<string>('');
    const [block1Out, setBlock1Out] = useState<string>('');
    const [block2In, setBlock2In] = useState<string>('');
    const [block2Out, setBlock2Out] = useState<string>('');
    const [block3In, setBlock3In] = useState<string>('');
    const [block3Out, setBlock3Out] = useState<string>('');
    const [editIsWorking, setEditIsWorking] = useState<boolean>(true);

    useEffect(() => {
        const existing = rules.find(r => {
            const d = r.day_of_week || r.dayOfWeek || r.day;
            return d && d.toLowerCase() === editDay.toLowerCase();
        });

        if (existing) {
            setBlock1In(existing.block1_in || existing.block1In || '');
            setBlock1Out(existing.block1_out || existing.block1Out || '');
            setBlock2In(existing.block2_in || existing.block2In || '');
            setBlock2Out(existing.block2_out || existing.block2Out || '');
            setBlock3In(existing.block3_in || existing.block3In || '');
            setBlock3Out(existing.block3_out || existing.block3Out || '');

            const workingVal = existing.is_working_day !== undefined ? existing.is_working_day : existing.isWorkingDay;
            setEditIsWorking(workingVal !== undefined ? Boolean(workingVal) : (editDay !== 'Sunday'));
        } else {
            setBlock1In('');
            setBlock1Out('');
            setBlock2In('');
            setBlock2Out('');
            setBlock3In('');
            setBlock3Out('');
            setEditIsWorking(editDay !== 'Sunday');
        }
    }, [editDay, rules]);

    // Smart time parser that correctly handles afternoon/evening PM hours
    const parseTimeToMinutes = (timeStr: string, isAfternoonOrEvening = false) => {
        if (!timeStr) return 0;
        let clean = timeStr.trim().toLowerCase();
        let isPM = clean.includes('pm');
        let isAM = clean.includes('am');
        clean = clean.replace('am', '').replace('pm', '').trim();
        clean = clean.replace('h', ':').replace('.', ':');
        let [time] = clean.split(' ');
        if (!time) return 0;
        let parts = time.split(':');
        let hours = Number(parts[0]) || 0;
        let minutes = Number(parts[1]) || 0;

        if (isPM) {
            if (hours < 12) hours += 12;
        } else if (isAM) {
            if (hours === 12) hours = 0;
            // If mistakenly marked AM on an afternoon hour (1-7), correct it to PM
            else if (isAfternoonOrEvening && hours >= 1 && hours <= 7) {
                hours += 12;
            }
        } else {
            // Default hours 1-7 in afternoon/evening slots to PM (e.g. 2:30 -> 14:30)
            if (isAfternoonOrEvening && hours >= 1 && hours <= 7) {
                hours += 12;
            }
        }
        return hours * 60 + minutes;
    };

    const getMinutesBetween = (start: string, end: string, isAfternoon = false) => {
        const sMins = parseTimeToMinutes(start, isAfternoon);
        const eMins = parseTimeToMinutes(end, isAfternoon);
        const totalMins = eMins - sMins;
        return totalMins > 0 ? totalMins : 0;
    };

    const formatDecimalHours = (totalMins: number) => {
        if (totalMins <= 0) return '0h';
        const hours = totalMins / 60;
        return `${Number(hours.toFixed(2))}h`;
    };

    const pause1Mins = getMinutesBetween(block1Out, block2In, false);
    const pause2Mins = getMinutesBetween(block2Out, block3In, true);
    const totalPauseMins = pause1Mins + pause2Mins;

    const work1Mins = getMinutesBetween(block1In, block1Out, false);
    const work2Mins = getMinutesBetween(block2In, block2Out, true);
    const work3Mins = getMinutesBetween(block3In, block3Out, true);
    const totalWorkMins = work1Mins + work2Mins + work3Mins;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                day_of_week: editDay,
                block1_in: block1In,
                block1_out: block1Out,
                block2_in: block2In,
                block2_out: block2Out,
                block3_in: block3In,
                block3_out: block3Out,
                is_working_day: editIsWorking ? 1 : 0
            };

            const res = await fetch('/api/schedule/template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = (await res.json()) as { success?: boolean; message?: string; error?: string };

            if (data.success) {
                setRules(prev => {
                    const filtered = prev.filter(r => {
                        const d = r.day_of_week || r.dayOfWeek || r.day;
                        return d?.toLowerCase() !== editDay.toLowerCase();
                    });
                    return [...filtered, payload];
                });
                alert(data.message || `Template for ${editDay} saved successfully!`);
                if (onRuleSaved) onRuleSaved();
                if (onClose) onClose();
            } else {
                alert(data.error || 'Failed to save');
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h2 className="text-xl font-bold text-gray-800">Modèle de Planning Hebdomadaire (6 Blocs)</h2>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
                )}
            </div>

            {/* Day Selector Buttons */}
            <div className="mb-4 grid grid-cols-7 gap-1 text-center bg-gray-50 p-2 rounded-lg border text-xs">
                {allDays.map(d => {
                    const rule = rules.find(r => {
                        const dayVal = r.day_of_week || r.dayOfWeek || r.day;
                        return dayVal?.toLowerCase() === d.toLowerCase();
                    });
                    const workingVal = rule ? (rule.is_working_day !== undefined ? rule.is_working_day : rule.isWorkingDay) : (d !== 'Sunday');
                    const isWorking = Boolean(workingVal);
                    return (
                        <div
                            key={d}
                            onClick={() => setEditDay(d)}
                            className={`p-1.5 rounded cursor-pointer transition-all ${
                                editDay === d ? 'bg-indigo-600 text-white font-bold shadow' : 'bg-white text-gray-700 border hover:bg-gray-100'
                            }`}
                        >
                            <div className="font-semibold">{d.slice(0, 3)}</div>
                            <div className="text-[10px] opacity-90">{isWorking ? 'Travail' : 'Repos'}</div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Jour Sélectionné</label>
                        <select value={editDay} onChange={(e) => setEditDay(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white">
                            {allDays.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center pt-5">
                        <input type="checkbox" checked={editIsWorking} onChange={(e) => setEditIsWorking(e.target.checked)} id="workingDay" className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                        <label htmlFor="workingDay" className="ml-2 text-sm font-semibold text-gray-700 cursor-pointer">Jour Travaillé</label>
                    </div>
                </div>

                {/* Block 1 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">1. Matin Entrée (Arrivée)</label>
                        <input type="text" value={block1In} onChange={(e) => setBlock1In(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-blue-50/50" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">2. Matin Sortie (Pause 1)</label>
                        <input type="text" value={block1Out} onChange={(e) => setBlock1Out(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-blue-50/50" />
                    </div>
                </div>

                {/* Block 2 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-indigo-900 mb-1">3. Après-midi Entrée (Pause 1)</label>
                        <input type="text" value={block2In} onChange={(e) => setBlock2In(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-indigo-50/50" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-900 mb-1">4. Après-midi Sortie (Pause 2)</label>
                        <input type="text" value={block2Out} onChange={(e) => setBlock2Out(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-indigo-50/50" />
                    </div>
                </div>

                {/* Block 3 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">5. Soir Entrée (Pause 2)</label>
                        <input type="text" value={block3In} onChange={(e) => setBlock3In(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-amber-50/50" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">6. Soir Sortie (Fin)</label>
                        <input type="text" value={block3Out} onChange={(e) => setBlock3Out(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-amber-50/50" />
                    </div>
                </div>

                {/* Live Summary Card */}
                <div className="bg-gray-50 border rounded-lg p-3 text-xs grid grid-cols-3 gap-2 text-center">
                    <div>
                        <span className="block text-gray-500 font-medium">1ère Pause</span>
                        <span className="font-bold text-indigo-700">{formatDecimalHours(pause1Mins)}</span>
                    </div>
                    <div>
                        <span className="block text-gray-500 font-medium">2ème Pause</span>
                        <span className="font-bold text-indigo-700">{formatDecimalHours(pause2Mins)}</span>
                    </div>
                    <div>
                        <span className="block text-gray-500 font-medium">Total Pause / Travail</span>
                        <span className="font-bold text-emerald-700">{formatDecimalHours(totalPauseMins)} / {formatDecimalHours(totalWorkMins)}</span>
                    </div>
                </div>

                <div className="flex space-x-3 pt-2">
                    {onClose && (
                        <button type="button" onClick={onClose} className="w-1/2 bg-gray-200 text-gray-800 py-2.5 rounded-xl font-bold hover:bg-gray-300 transition-colors">
                            Cancel
                        </button>
                    )}
                    <button type="submit" className={`${onClose ? 'w-1/2' : 'w-full'} bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-md`}>
                        Enregistrer pour {editDay}
                    </button>
                </div>
            </form>
        </div>
    );
}