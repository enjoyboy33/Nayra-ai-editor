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
import { GeminiProvider, GeminiContext } from './context/GeminiContext';
import Modal from './components/ui/Modal';
import Icon from './components/ui/Icon';
import Button from './components/ui/Button';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.SPLASH);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);
  const authContext = useContext(AuthContext);
  const geminiContext = useContext(GeminiContext);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [keyError, setKeyError] = useState('');

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
  
  const handleSaveApiKey = async () => {
    if (!geminiContext) return;
    setIsVerifying(true);
    setKeyError('');
    const isValid = await geminiContext.checkApiKey(apiKeyInput);
    if (isValid) {
        geminiContext.setApiKey(apiKeyInput);
    } else {
        setKeyError('Invalid API Key. Please obtain a valid key from Google AI Studio.');
    }
    setIsVerifying(false);
  };
  
  // The main app needs a valid API key to function.
  if (geminiContext?.isKeyValid === false) {
      return (
          <div className="h-screen w-screen bg-gray-900">
              <Modal isOpen={true} title="Set Up Gemini API Key">
                  <div className="flex flex-col gap-4">
                      <p className="text-gray-400">
                          To use Nayra AI Editor, please provide your Google Gemini API key.
                          Your key is stored securely in your browser and is never shared.
                      </p>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-2">
                          Get your API key from Google AI Studio <Icon name="open_in_new" className="text-sm" />
                      </a>
                      <div className="relative">
                           <Icon name="key" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="password"
                            placeholder="Enter your API Key"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                            aria-label="Gemini API Key"
                          />
                      </div>
                      {keyError && <p className="text-red-400 text-sm">{keyError}</p>}
                       <Button onClick={handleSaveApiKey} isLoading={isVerifying} disabled={isVerifying || !apiKeyInput}>
                          Save and Continue
                      </Button>
                  </div>
              </Modal>
          </div>
      );
  }

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
      <GeminiProvider>
        <AppContent />
      </GeminiProvider>
    </AuthProvider>
  );
};

export default App;