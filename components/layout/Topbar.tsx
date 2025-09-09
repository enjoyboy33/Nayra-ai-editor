
import React, { useContext } from 'react';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';
import { AuthContext } from '../../context/AuthContext';

const Topbar: React.FC = () => {
  const authContext = useContext(AuthContext);

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-gray-900 border-b border-gray-800/70 shrink-0">
      <div className="flex items-center gap-3">
        <Logo className="h-8 w-8" />
        <h1 className="text-xl font-semibold text-white">Nayra: AI Editor</h1>
      </div>
      <div className="flex items-center gap-3">
        {authContext?.user && (
          <>
            <span className="text-gray-300 hidden sm:block">Welcome, {authContext.user.name}!</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center font-bold text-white">
              {authContext.user.name.charAt(0).toUpperCase()}
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Topbar;
