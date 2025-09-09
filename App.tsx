import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View } from './types';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import SplashScreen from './components/views/SplashScreen';
import ImageGenerator from './components/views/ImageGenerator';
import ImageEditor from './components/views/ImageEditor';
import ImageCombiner from './components/views/ImageCombiner';
import History from './components/views/History';
import Settings from './components/views/Settings';
import Auth from './components/views/Auth';
import { HistoryProvider } from './context/HistoryContext';
import { AuthProvider, AuthContext } from './context/AuthContext';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.SPLASH);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);
  const authContext = useContext(AuthContext);

  useEffect(() => {
    if (!authContext?.user) {
      // If user logs out, we want to reset the view state.
      setCurrentView(View.AUTH);
      return;
    }
    // Only run splash screen logic if the user is logged in.
    if (currentView === View.SPLASH || currentView === View.AUTH) {
      const timer = setTimeout(() => {
        setIsAppReady(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentView, authContext?.user]);
  
  const handleEnterApp = useCallback(() => {
    setCurrentView(View.EDITOR);
  }, []);

  if (!authContext?.user) {
    return <Auth />;
  }

  if (currentView === View.SPLASH || currentView === View.AUTH) {
    return <SplashScreen isReady={isAppReady} onEnter={handleEnterApp} />;
  }

  return (
    <HistoryProvider>
      <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-gray-200">
        <div className="flex flex-col flex-1 overflow-hidden md:order-2">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-800/50">
            <div className={`h-full ${currentView === View.GENERATOR ? 'block' : 'hidden'}`}>
                <ImageGenerator />
            </div>
            <div className={`h-full ${currentView === View.EDITOR ? 'block' : 'hidden'}`}>
                <ImageEditor />
            </div>
            <div className={`h-full ${currentView === View.COMBINER ? 'block' : 'hidden'}`}>
                <ImageCombiner />
            </div>
            <div className={`h-full ${currentView === View.HISTORY ? 'block' : 'hidden'}`}>
                <History />
            </div>
            <div className={`h-full ${currentView === View.SETTINGS ? 'block' : 'hidden'}`}>
                <Settings />
            </div>
            </main>
        </div>
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      </div>
    </HistoryProvider>
  );
}


const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
