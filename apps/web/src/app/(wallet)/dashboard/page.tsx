'use client';

import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const monthlyData = [
    { day: '1', income: 500, prev: 200 },
    { day: '7', income: 5200, prev: 3800 },
    { day: '14', income: 6100, prev: 4200 },
    { day: '21', income: 7800, prev: 5100 },
    { day: '30', income: 8200, prev: 4800 },
];

const spendingData = [
    { name: 'Shopping', value: 780, color: '#8b5cf6' },
    { name: 'Subscriptions', value: 550, color: '#3b82f6' },
    { name: 'Food & Dining', value: 430, color: '#06b6d4' },
    { name: 'Travel', value: 320, color: '#f59e0b' },
];

const transactions = [
    { name: 'Spotify Subscription', amount: -12.99, icon: '🎵' },
    { name: 'Grocery Store', amount: -85.20, icon: '🛒' },
    { name: 'Freelance Payment', amount: 1200.00, icon: '💼' },
    { name: 'Coffee Shop', amount: -8.50, icon: '☕' },
];

export default function DashboardPage() {
    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Wallet Dashboard</h1>
                <div className="hidden sm:flex items-center gap-4 text-sm text-slate-400">
                    <button className="hover:text-white transition-colors">Cuentas</button>
                    <button className="hover:text-white transition-colors">Tarjetas</button>
                    <button className="hover:text-white transition-colors">Analytics</button>
                    <button className="hover:text-white transition-colors">Ajustes</button>
                </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Total Balance */}
                <div className="bg-gradient-to-br from-blue-900/60 to-blue-800/30 rounded-2xl p-6 border border-blue-700/30">
                    <p className="text-slate-400 text-sm font-medium">Total Balance</p>
                    <p className="text-4xl font-bold text-white mt-2">
                        $12,850<span className="text-2xl text-slate-400">.75</span>
                    </p>
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                Income
                            </span>
                            <span className="text-emerald-400 font-medium">+$5,200</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-300">
                                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                                Expenses
                            </span>
                            <span className="text-rose-400 font-medium">-$2,150</span>
                        </div>
                    </div>
                </div>

                {/* Monthly Overview */}
                <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-white font-semibold">Monthly Overview</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Income</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Previous Month</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={monthlyData}>
                            <XAxis dataKey="day" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Line type="monotone" dataKey="income" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa', r: 4 }} />
                            <Line type="monotone" dataKey="prev" stroke="#fb7185" strokeWidth={2} dot={{ fill: '#fb7185', r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Spending Breakdown */}
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                    <p className="text-white font-semibold mb-4">Spending Breakdown</p>
                    <div className="flex justify-center">
                        <PieChart width={160} height={160}>
                            <Pie data={spendingData} cx={75} cy={75} innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={0}>
                                {spendingData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </div>
                    <div className="space-y-2 mt-2">
                        {spendingData.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="flex items-center gap-2 text-slate-300">
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                                    {item.name}
                                </span>
                                <span className="text-slate-400">${item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                    <p className="text-white font-semibold mb-4">Recent Transactions</p>
                    <div className="space-y-4">
                        {transactions.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{tx.icon}</span>
                                    <span className="text-sm text-slate-300">{tx.name}</span>
                                </div>
                                <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-4">Today</p>
                </div>

                {/* Budget Goals */}
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                    <p className="text-white font-semibold mb-6">Budget Goals</p>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-300 font-medium">Monthly Budget</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '66%' }} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1 text-right">$2,000 / $3,000</p>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-300 font-medium">Savings Goal</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div className="bg-cyan-400 h-2 rounded-full" style={{ width: '85%' }} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1 text-right">$8,500 / $10,000</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}