
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface AuthProps {
    onLogin: (email: string, password: string) => void;
    onRegister: (name: string, email: string, password: string) => void;
}

type UserType = 'learner' | 'teacher' | 'admin';
type AuthView = 'login' | 'register';

export const Auth: React.FC<AuthProps> = ({ onLogin, onRegister }) => {
    const [userType, setUserType] = useState<UserType>('learner');
    const [authView, setAuthView] = useState<AuthView>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleUserTypeChange = (type: UserType) => {
        setUserType(type);
        setAuthView('login'); // Reset to login when switching tabs
        setName('');
        setEmail('');
        setPassword('');
        setTermsAccepted(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (authView === 'login') {
            if (!email || !password) {
                toast.error('Please enter both email and password.');
                return;
            }
            onLogin(email, password);
        } else { // register
            if (!name || !email || !password) {
                toast.error('Please fill out all fields.');
                return;
            }
            if (!termsAccepted) {
                toast.error('You must accept the Terms of Use.');
                return;
            }
            onRegister(name, email, password);
        }
    };

    // Hint credentials helper - synced with sample_data.ts
    const getHintCredentials = () => {
        switch (userType) {
            case 'admin': return { email: 'admin@drivetime.com', label: 'Admin Test Account' };
            case 'teacher': return { email: 'john@drivetime.com', label: 'Teacher Test Account' };
            case 'learner': return { email: 'alex@drivetime.com', label: 'Learner Test Account' };
            default: return { email: '', label: '' };
        }
    };

    const hint = getHintCredentials();

    return (
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8">
            <h1 className="text-3xl font-bold text-center text-primary dark:text-white mb-2">
                DriveTime Scheduler
            </h1>
            <p className="text-center text-gray-600 dark:text-white mb-6">
                {authView === 'login' ? `Sign in as ${userType.charAt(0).toUpperCase() + userType.slice(1)}` : 'Create a new account'}
            </p>

            {/* Role Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                {(['learner', 'teacher', 'admin'] as UserType[]).map((type) => (
                     <button
                        key={type}
                        onClick={() => handleUserTypeChange(type)}
                        className={`flex-1 py-2 text-center font-semibold transition-colors duration-300 capitalize ${userType === type ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Hint Box */}
            {authView === 'login' && (
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-md text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-bold mb-1">💡 Hint: {hint.label}</p>
                    <div className="flex justify-between items-center">
                        <span>Email: <strong>{hint.email}</strong></span>
                        <button 
                            type="button"
                            onClick={() => { setEmail(hint.email); setPassword('password'); }}
                            className="text-xs bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                        >
                            Autofill
                        </button>
                    </div>
                    <p className="mt-1">Password: <strong>password</strong></p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {authView === 'register' && (
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white">Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)}
                               className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"/>
                    </div>
                )}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white">Email Address</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)}
                           className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"/>
                </div>
                <div>
                    <label htmlFor="password"
                           className="block text-sm font-medium text-gray-700 dark:text-white">Password</label>
                    <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)}
                           className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"/>
                </div>

                {authView === 'register' && userType === 'learner' && (
                    <div className="flex items-center space-x-2">
                         <input id="terms" name="terms" type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"/>
                        <div className="relative group">
                            <label htmlFor="terms" className="text-sm text-gray-600 dark:text-white">
                                I agree to the <span className="text-primary underline cursor-pointer">Terms of Use</span>
                            </label>
                            <div className="absolute bottom-full mb-2 w-72 bg-gray-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                By registering, you agree to our terms and conditions, including the responsible use of our vehicles and adherence to the instructor's guidelines. Full details are available on our website.
                                <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                            </div>
                        </div>
                    </div>
                )}
                
                <div>
                    <button type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
                            disabled={authView === 'register' && !termsAccepted}
                    >
                        {authView === 'login' ? 'Sign In' : 'Register'}
                    </button>
                </div>
                
                {authView === 'login' && userType === 'learner' && (
                    <div className="text-sm text-center">
                        <a href="#" className="font-medium text-primary hover:text-blue-500" onClick={(e) => {e.preventDefault(); toast.error("Feature not implemented.")}}>
                            Forgot your password?
                        </a>
                    </div>
                )}
            </form>
            <div className="mt-6 text-center text-sm">
                {/* Only show register option if not Admin */}
                {userType !== 'admin' && (
                    authView === 'login' ? (
                        <p className="text-gray-600 dark:text-white">
                            Don't have an account?{' '}
                            <button onClick={() => setAuthView('register')} className="font-medium text-primary hover:text-blue-500">
                                Register
                            </button>
                        </p>
                    ) : (
                        <p className="text-gray-600 dark:text-white">
                            Already have an account?{' '}
                            <button onClick={() => setAuthView('login')} className="font-medium text-primary hover:text-blue-500">
                                Sign In
                            </button>
                        </p>
                    )
                )}
                {userType === 'admin' && (
                     <p className="text-gray-500 dark:text-gray-400 italic text-xs">
                        Admin registration is disabled for this demo.
                    </p>
                )}
            </div>
        </div>
    );
};
