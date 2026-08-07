'use client';
import { useState, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const router = useRouter();

	const handleLogin = async (e: SyntheticEvent) => {
		e.preventDefault();
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});

		const data: any = await res.json();

		if (data.success) {
			router.push('/admin/dashboard');
		} else {
			setError(data.error);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100">
			<form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-96">
				<h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Tixtile Admin</h1>
				{error && <p className="mb-4 text-red-500 text-sm text-center">{error}</p>}
				<div className="mb-4">
					<label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
						required
					/>
				</div>
				<div className="mb-6">
					<label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
						required
					/>
				</div>
				<button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-bold">
					Login
				</button>
			</form>
		</div>
	);
}