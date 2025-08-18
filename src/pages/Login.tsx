import React, { useState, useEffect } from 'react';
import { signIn, signUp, logOut, signInWithGoogle } from '../hooks/use-firebase-auth';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    // @ts-ignore
    const from = (location.state && location.state.from && location.state.from.pathname) || "/";

    useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, from, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isSignUp) {
                await signUp(email, password);
            } else {
                await signIn(email, password);
            }
            // Navigation will happen in useEffect when user is set
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
            // Navigation will happen in useEffect when user is set
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-2xl mb-4">Welcome, {user.email}</h2>
                <button
                    className="bg-red-500 text-white px-4 py-2 rounded"
                    onClick={() => logOut()}
                >
                    Log Out
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-80">
                <h2 className="text-xl mb-4">{isSignUp ? 'Sign Up' : 'Login'}</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full mb-2 p-2 border rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full mb-4 p-2 border rounded"
                    required
                />
                {error && <div className="text-red-500 mb-2">{error}</div>}
                <button
                    type="button"
                    className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded w-full mb-2 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors shadow-sm"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0_17_40)"><path d="M47.532 24.552c0-1.636-.146-3.2-.418-4.704H24.48v9.02h13.02c-.56 3.02-2.24 5.58-4.78 7.3v6.06h7.74c4.54-4.18 7.07-10.34 7.07-17.676z" fill="#4285F4" /><path d="M24.48 48c6.48 0 11.92-2.14 15.89-5.82l-7.74-6.06c-2.14 1.44-4.88 2.3-8.15 2.3-6.26 0-11.56-4.22-13.46-9.9H2.5v6.22C6.46 43.98 14.7 48 24.48 48z" fill="#34A853" /><path d="M11.02 28.52c-.48-1.44-.76-2.98-.76-4.52s.28-3.08.76-4.52v-6.22H2.5A23.98 23.98 0 000 24c0 3.98.96 7.76 2.5 11.22l8.52-6.7z" fill="#FBBC05" /><path d="M24.48 9.54c3.52 0 6.64 1.22 9.12 3.62l6.84-6.84C36.4 2.14 30.96 0 24.48 0 14.7 0 6.46 4.02 2.5 10.78l8.52 6.22c1.9-5.68 7.2-9.9 13.46-9.9z" fill="#EA4335" /></g><defs><clipPath id="clip0_17_40"><rect width="48" height="48" fill="white" /></clipPath></defs></svg>
                    Sign in with Google
                </button>
                <button
                    type="submit"
                    className="bg-white-500 text-black px-4 py-2 rounded w-full mb-2"
                    disabled={loading}
                >
                    {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Login'}
                </button>
                <button
                    type="button"
                    className="text-blue-500 underline w-full"
                    onClick={() => setIsSignUp(!isSignUp)}
                >
                    {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
            </form>
        </div>
    );
};

export default Login;
