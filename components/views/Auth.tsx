
import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Button from '../ui/Button';
import Logo from '../ui/Logo';
import Icon from '../ui/Icon';

const Auth: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const authContext = useContext(AuthContext);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please fill out both fields.');
      return;
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    authContext?.login({ name, email });
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="w-20 h-20 mx-auto" />
          <h1 className="text-4xl font-bold text-white mt-4">Welcome to Nayra</h1>
          <p className="text-gray-400 mt-2">Create an account to begin your creative journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="glassmorphism p-8 rounded-2xl flex flex-col gap-6">
          <div className="relative">
            <Icon name="person" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
              aria-label="Your Name"
            />
          </div>
          <div className="relative">
             <Icon name="mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
              aria-label="Your Email"
            />
          </div>

          {error && <p className="text-red-400 text-center text-sm -my-2">{error}</p>}

          <Button type="submit" className="w-full py-3 text-base">
            Sign Up & Enter
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
