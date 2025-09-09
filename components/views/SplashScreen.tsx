
import React, { useState, useEffect } from 'react';
import Logo from '../ui/Logo';

interface SplashScreenProps {
  isReady: boolean;
  onEnter: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isReady, onEnter }) => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => setShowButton(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
      <div className={`transition-all duration-1000 ease-in-out ${isReady ? 'scale-100 opacity-100' : 'scale-125 opacity-0'}`}>
        <div className="flex flex-col items-center text-center">
            <Logo className="w-24 h-24" />
            <h1 className="text-6xl font-bold text-white mt-6">Nayra</h1>
            <p className="text-xl text-gray-400 mt-2">AI Editor</p>
        </div>
      </div>

      <div className={`absolute bottom-20 transition-opacity duration-700 ${showButton ? 'opacity-100' : 'opacity-0'}`}>
         <button 
            onClick={onEnter}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-purple-400/50 hover:shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-1"
          >
           Enter Editor
         </button>
      </div>
    </div>
  );
};

export default SplashScreen;