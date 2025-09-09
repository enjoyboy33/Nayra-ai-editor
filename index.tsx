
import React, { useState, useEffect, useCallback, useContext, createContext, useMemo, DragEvent, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// --- CONSOLIDATED CODE ---

// --- From types.ts ---
enum View {
  SPLASH = 'SPLASH',
  GENERATOR = 'GENERATOR',
  EDITOR = 'EDITOR',
  COMBINER = 'COMBINER',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
  AUTH = 'AUTH',
}

type HistoryItemType = 'Generated' | 'Edited' | 'Combined';

interface HistoryItem {
  id: string;
  type: HistoryItemType;
  image: string; // base64 data URL
  prompt: string;
  timestamp: number;
}

interface User {
  name: string;
  email: string;
}

interface ImageFile {
  id?: string;
  file: File;
  base64: string;
}


// --- From constants.ts ---
const NAV_ITEMS = [
  { view: View.GENERATOR, label: 'AI Image Generator', icon: 'auto_awesome' },
  { view: View.EDITOR, label: 'AI Image Editor', icon: 'edit' },
  { view: View.COMBINER, label: 'AI Combiner', icon: 'auto_fix' },
  { view: View.HISTORY, label: 'History', icon: 'history' },
  { view: View.SETTINGS, label: 'Settings', icon: 'settings' },
];


// --- From services/geminiService.ts ---
const generateImage = async (ai: GoogleGenAI, prompt: string): Promise<string> => {
  try {
    const enhancedPrompt = `Create a visually stunning, highly detailed, and photorealistic image. Pay meticulous attention to every word in the user's prompt to ensure the output is accurate and of the highest quality.\n\nUser Prompt: "${prompt}"`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image. Please check the prompt or API key.");
  }
};

const editImage = async (
  ai: GoogleGenAI,
  prompt: string,
  mainImage: { base64Data: string; mimeType: string },
  referenceImage?: { base64Data: string; mimeType: string }
): Promise<{ imageUrl: string; text: string }> => {
  try {
    const parts: any[] = [];
    
    parts.push({
      inlineData: {
        data: mainImage.base64Data,
        mimeType: mainImage.mimeType,
      },
    });

    let finalPrompt: string;

    if (referenceImage) {
      parts.push({
        inlineData: {
          data: referenceImage.base64Data,
          mimeType: referenceImage.mimeType,
        },
      });
      finalPrompt = `You are a professional AI photo editor. Using the two images provided, apply the following instruction to the first image. Use the second image as a style and content reference. Create a seamless, high-quality result.\n\nInstruction: "${prompt}"`;
    } else {
      finalPrompt = `You are a professional AI photo editor. Apply the following instruction to the image provided. Make the edit look as natural as possible while maintaining the original image's style, lighting, and quality.\n\nInstruction: "${prompt}"`;
    }
    
    parts.push({ text: finalPrompt });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: parts,
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let imageUrl = '';
    let text = 'No text response from model.';

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          text = part.text;
        } else if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    if (!imageUrl) {
        throw new Error("The model did not return an image.");
    }

    return { imageUrl, text };
  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("Failed to edit image. The model may not have been able to fulfill the request.");
  }
};

const combineImages = async (
    ai: GoogleGenAI,
    prompt: string, 
    images: {base64Data: string, mimeType: string}[]
): Promise<string> => {
  try {
    if (images.length === 0) {
        throw new Error("At least one image is required to combine.");
    }

    const imageParts = images.map(image => ({
        inlineData: {
            data: image.base64Data,
            mimeType: image.mimeType,
        },
    }));

    const fullPrompt = `You are a world-class AI photo compositor. Your task is to seamlessly blend the provided images into a single, cohesive, and photorealistic masterpiece. Pay meticulous attention to matching lighting, shadows, perspective, color grading, and scale to ensure the final image is believable and visually stunning. Follow the user's instructions with absolute precision.\n\nUser's Combination Instructions: "${prompt}"`;
    const textPart = { text: fullPrompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [...imageParts, textPart],
      },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let imageUrl = '';
    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                break;
            }
        }
    }
    
    if (!imageUrl) {
        throw new Error("The model did not return a combined image.");
    }

    return imageUrl;
  } catch (error) {
    console.error("Error combining images:", error);
    throw new Error("Failed to combine images. Please check your images and prompt.");
  }
};


// --- From components/ui/Logo.tsx ---
const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Nayra AI Editor Logo"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path 
        fill="url(#logoGradient)"
        d="M50 0 L61.2 38.8 L100 50 L61.2 61.2 L50 100 L38.8 61.2 L0 50 L38.8 38.8 Z" 
      />
      <circle cx="50" cy="50" r="25" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.8"/>
    </svg>
  );
};


// --- From components/ui/Icon.tsx ---
interface IconProps {
  name: string;
  className?: string;
}
const Icon: React.FC<IconProps> = ({ name, className }) => {
  return (
    <span className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
};


// --- From components/ui/Button.tsx ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  isLoading?: boolean;
}
const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', isLoading = false, ...props }) => {
  const baseClasses = 'px-6 py-2.5 font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center gap-2';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
    secondary: 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};


// --- From components/ui/Spinner.tsx ---
interface SpinnerProps {
    message?: string;
}
const defaultMessages = [
    "Applying AI magic...", "Analyzing pixels...", "Consulting with digital muses...", "Painting with algorithms...",
    "Reticulating splines...", "Unleashing creative AI...", "Crafting perfection...", "Just a moment, the AI is thinking...",
    "Brewing some digital creativity...", "Warming up the neural networks...",
];
const Spinner: React.FC<SpinnerProps> = ({ message }) => {
    const [messages, setMessages] = useState<string[]>([]);
    const [currentMessage, setCurrentMessage] = useState<string>('');

    useEffect(() => {
        let messageList: string[];
        if (message) {
            messageList = [message, ...defaultMessages.filter(m => m !== message)];
        } else {
            messageList = defaultMessages;
        }
        setMessages(messageList);
        setCurrentMessage(messageList[0]);
    }, [message]);
    
    useEffect(() => {
        if (messages.length === 0) return;
        let currentIndex = 0;
        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % messages.length;
            setCurrentMessage(messages[currentIndex]);
        }, 2500);
        return () => clearInterval(interval);
    }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center glassmorphism p-8 rounded-2xl">
      <div className="w-16 h-16 border-4 border-t-purple-500 border-r-purple-500 border-b-blue-500 border-l-blue-500 rounded-full animate-spin"></div>
      {currentMessage && <p className="text-lg font-medium text-gray-300 mt-4">{currentMessage}</p>}
    </div>
  );
};


// --- From components/ui/Modal.tsx ---
interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) {
    return null;
  }
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-2xl w-full max-w-lg flex flex-col overflow-hidden glassmorphism border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors" aria-label="Close modal">
              <Icon name="close" />
            </button>
          )}
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};


// --- From context/AuthContext.tsx ---
interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('nayra-ai-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userData: User) => {
    try {
      localStorage.setItem('nayra-ai-user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to save user to localStorage", error);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('nayra-ai-user');
      setUser(null);
    } catch (error) {
      console.error("Failed to remove user from localStorage", error);
    }
  }, []);
  
  if (isLoading) {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


// --- From context/HistoryContext.tsx ---
interface HistoryContextType {
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
}
const HistoryContext = createContext<HistoryContextType | undefined>(undefined);
const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('nayra-ai-history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
  }, []);

  const updateLocalStorage = (newHistory: HistoryItem[]) => {
    try {
      localStorage.setItem('nayra-ai-history', JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  };

  const addHistoryItem = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    setHistory(prevHistory => {
      const newHistoryItem: HistoryItem = { ...item, id: `hist-${Date.now()}`, timestamp: Date.now() };
      const updatedHistory = [newHistoryItem, ...prevHistory];
      updateLocalStorage(updatedHistory);
      return updatedHistory;
    });
  }, []);

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory(prevHistory => {
      const updatedHistory = prevHistory.filter(item => item.id !== id);
      updateLocalStorage(updatedHistory);
      return updatedHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    updateLocalStorage([]);
  }, []);

  return (
    <HistoryContext.Provider value={{ history, addHistoryItem, deleteHistoryItem, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};


// --- From context/GeminiContext.tsx ---
interface GeminiContextType {
  ai: GoogleGenAI | null;
  apiKey: string | null;
  setApiKey: (key: string) => void;
  isKeyValid: boolean | null;
  checkApiKey: (key: string) => Promise<boolean>;
}
const GeminiContext = createContext<GeminiContextType | undefined>(undefined);
const GeminiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('gemini-api-key');
      if (storedKey) {
        setApiKeyState(storedKey);
      } else {
        setIsKeyValid(false);
      }
    } catch (error) {
        console.error("Failed to load API key from localStorage", error);
        setIsKeyValid(false);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      const newAi = new GoogleGenAI({ apiKey });
      setAi(newAi);
      setIsKeyValid(true); 
    } else {
      setAi(null);
      setIsKeyValid(false);
    }
  }, [apiKey]);

  const setApiKey = (key: string) => {
    try {
      if (key) {
        localStorage.setItem('gemini-api-key', key);
        setApiKeyState(key);
      } else {
        localStorage.removeItem('gemini-api-key');
        setApiKeyState(null);
      }
    } catch (error) {
        console.error("Failed to save API key to localStorage", error);
    }
  };
  
  const checkApiKey = async (key: string): Promise<boolean> => {
    if (!key) return false;
    try {
        const testAi = new GoogleGenAI({ apiKey: key });
        await testAi.models.generateContent({ model: "gemini-2.5-flash", contents: 'hello' });
        return true;
    } catch (error) {
        console.error("API Key validation failed:", error);
        return false;
    }
  }

  const value = useMemo(() => ({ ai, apiKey, setApiKey, isKeyValid, checkApiKey }), [ai, apiKey, isKeyValid]);

  if (isLoading) {
    return null;
  }

  return (
    <GeminiContext.Provider value={value}>
      {children}
    </GeminiContext.Provider>
  );
};


// --- From components/layout/Topbar.tsx ---
const Topbar: React.FC = () => {
  const authContext = useContext(AuthContext);
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-gray-900 border-b border-gray-800/70 shrink-0">
      <div className="flex items-center gap-3 md:hidden">
        <Logo className="h-8 w-8" />
        <h1 className="text-xl font-semibold text-white">Nayra: AI Editor</h1>
      </div>
      <div className="flex-1"></div>
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


// --- From components/layout/Sidebar.tsx ---
interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}
const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const getShortLabel = (label: string) => {
    if (label.startsWith('AI Image ')) return label.substring(9);
    if (label.startsWith('AI ')) return label.substring(3);
    return label;
  };

  return (
    <nav className="order-2 md:order-1 shrink-0 bg-gray-900/80 glassmorphism flex md:flex-col md:justify-start h-20 md:h-screen w-full md:w-64 border-t md:border-t-0 md:border-r border-gray-700/50">
      <div className="hidden md:flex items-center gap-3 p-4 border-b border-gray-700/50 shrink-0">
        <Logo className="h-8 w-8" />
        <h1 className="text-lg font-semibold text-white">Nayra AI Editor</h1>
      </div>
      <ul className="flex md:flex-col justify-evenly md:justify-start w-full md:p-2 md:gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.view} className="flex-1 md:flex-initial flex justify-center">
            <button
              onClick={() => setCurrentView(item.view)}
              className="w-full h-16 md:h-auto flex items-center justify-center rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 md:justify-start"
              aria-current={currentView === item.view ? 'page' : undefined}
            >
              <div className="md:hidden">
                {currentView === item.view ? (
                  <div className="flex flex-row items-center justify-center gap-2 bg-purple-600 rounded-full px-4 py-2 shadow-lg shadow-purple-500/40">
                    <Icon name={item.icon} className="text-xl text-white" />
                    <span className="text-sm font-semibold text-white whitespace-nowrap">{getShortLabel(item.label)}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Icon name={item.icon} className="text-2xl text-gray-400 group-hover:text-white" />
                    <span className="text-xs font-medium text-gray-400 group-hover:text-white">{getShortLabel(item.label)}</span>
                  </div>
                )}
              </div>
              <div className={`hidden md:flex items-center w-full p-3 gap-4 rounded-lg ${currentView === item.view ? 'bg-purple-600/50' : 'group-hover:bg-gray-700/50'}`}>
                <Icon name={item.icon} className={`text-2xl ${currentView === item.view ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                <span className={`font-medium ${currentView === item.view ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{item.label}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};


// --- From components/views/SplashScreen.tsx ---
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
         <button onClick={onEnter} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-purple-400/50 hover:shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-1">
           Enter Editor
         </button>
      </div>
    </div>
  );
};


// --- From components/views/Auth.tsx ---
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
    if (!/\\S+@\\S+\\.\\S+/.test(email)) {
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
            <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-800/50 border border-gray-600 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors" aria-label="Your Name" />
          </div>
          <div className="relative">
             <Icon name="mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" placeholder="Your Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-800/50 border border-gray-600 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors" aria-label="Your Email" />
          </div>
          {error && <p className="text-red-400 text-center text-sm -my-2">{error}</p>}
          <Button type="submit" className="w-full py-3 text-base">Sign Up & Enter</Button>
        </form>
      </div>
    </div>
  );
};


// --- From components/views/ImageGenerator.tsx ---
const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const historyContext = useContext(HistoryContext);
  const geminiContext = useContext(GeminiContext);

  const handleGenerate = async () => {
    if (!geminiContext?.ai) {
        setError('Gemini AI client is not initialized. Please set your API key.');
        return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageUrl = await generateImage(geminiContext.ai, prompt);
      setGeneratedImage(imageUrl);
      historyContext?.addHistoryItem({ type: 'Generated', image: imageUrl, prompt: prompt });
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `nayra-ai-${prompt.substring(0, 20).replace(/\\s/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col gap-8 items-center">
      <div className="w-full max-w-3xl glassmorphism p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-lg">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A majestic lion wearing a crown, cinematic lighting, detailed..." className="w-full h-24 md:h-auto md:flex-1 bg-gray-800/50 border border-gray-600 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-colors" rows={3}/>
        <Button onClick={handleGenerate} isLoading={isLoading} disabled={isLoading || !geminiContext?.ai}><Icon name="auto_awesome" />Generate</Button>
      </div>
      {error && <p className="text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
      <div className="flex-1 w-full flex items-center justify-center">
        {isLoading && <Spinner message="Your vision is materializing..." />}
        {!isLoading && generatedImage && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
             <img src={generatedImage} alt={prompt} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl shadow-black/50" />
             <Button onClick={handleDownload} variant="secondary"><Icon name="download"/>Download Image</Button>
          </div>
        )}
        {!isLoading && !generatedImage && (
            <div className="text-center text-gray-500">
                <Icon name="image" className="text-6xl" />
                <p className="mt-4 text-xl">Your generated image will appear here.</p>
                <p>Let your creativity flow!</p>
            </div>
        )}
      </div>
    </div>
  );
};


// --- From components/views/ImageEditor.tsx ---
const ImageEditor: React.FC = () => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [referenceImage, setReferenceImage] = useState<ImageFile | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const historyContext = useContext(HistoryContext);
  const geminiContext = useContext(GeminiContext);

  const clearState = useCallback(() => { setReferenceImage(null); setPrompt(''); setError(null); }, []);
  const resetAll = useCallback(() => { setImage(null); setReferenceImage(null); setPrompt(''); setError(null); }, []);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      resetAll();
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => { setImage({ file, base64: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };

  const handleRefFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => { setReferenceImage({ file, base64: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };
  
  const handleDragEvents = (e: DragEvent<HTMLDivElement>, isEntering: boolean) => { e.preventDefault(); e.stopPropagation(); setIsDragging(isEntering); };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };
  
  const handleEdit = async () => {
    if (!geminiContext?.ai || !prompt.trim() || !image) {
      setError('Please upload an image, enter an instruction, and ensure your API key is set.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const mainImagePayload = { base64Data: image.base64.split(',')[1], mimeType: image.file.type };
      const referenceImagePayload = referenceImage ? { base64Data: referenceImage.base64.split(',')[1], mimeType: referenceImage.file.type } : undefined;
      const result = await editImage(geminiContext.ai, prompt, mainImagePayload, referenceImagePayload);
      historyContext?.addHistoryItem({ type: 'Edited', image: result.imageUrl, prompt: prompt });
      const newFileBlob = await (await fetch(result.imageUrl)).blob()
      const reader = new FileReader();
      reader.onloadend = () => { setImage({ file: new File([newFileBlob], "edited_image.png", {type: newFileBlob.type}), base64: reader.result as string }); };
      reader.readAsDataURL(newFileBlob);
      clearState();
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred during editing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image.base64;
    link.download = `nayra-ai-edited-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!image) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-4">
            <div onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className={`w-full max-w-2xl border-4 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors p-10 ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600'}`}>
                <Icon name="upload_file" className="text-6xl text-gray-500" />
                <p className="mt-4 text-xl">Drag & drop your image here</p>
                <p className="text-gray-400">or</p>
                <label htmlFor="file-upload" className="mt-2"><span className="cursor-pointer px-4 py-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">Browse Files</span><input id="file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} /></label>
            </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-stretch gap-4">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 rounded-2xl glassmorphism">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600/80 to-blue-500/80 rounded-lg flex items-center justify-center"><Icon name="edit" /></div>
            <h2 className="text-xl font-semibold hidden sm:block">AI Image Editor</h2>
        </div>
        <div className="flex items-center gap-3">
            <label htmlFor="file-replace" className="w-12 h-12 flex items-center justify-center bg-gray-700/50 border border-gray-600 rounded-full hover:bg-gray-700 transition-colors cursor-pointer" title="Upload new image"><Icon name="image" className="text-2xl" /><input id="file-replace" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} /></label>
            <button onClick={handleDownload} className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-500 rounded-full hover:shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-0.5 transition-all" title="Download edited image"><Icon name="download" className="text-2xl" /></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center glassmorphism rounded-2xl p-4 relative min-h-0">
        {isLoading && <div className="absolute inset-0 bg-gray-900/80 z-20 flex items-center justify-center rounded-2xl"><Spinner message="Applying AI magic..." /></div>}
        <img src={image.base64} alt="User upload" className="max-w-full max-h-full object-contain rounded-lg" />
      </div>
      <div className="shrink-0 glassmorphism p-4 rounded-2xl flex flex-col items-center gap-3 shadow-lg animate-fade-in">
        <div className="w-full">
            {!referenceImage ? (
                <label htmlFor="ref-file-upload" className="w-full h-20 bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition-colors text-center p-2"><Icon name="add_photo_alternate" className="text-3xl text-gray-400"/><span className="text-sm text-gray-400 mt-1">Add Reference Image (Optional)</span><input id="ref-file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleRefFileChange(e.target.files)} /></label>
            ) : (
                <div className="relative w-full h-20">
                    <img src={referenceImage.base64} alt="Reference" className="w-full h-full object-cover rounded-xl shadow-md" />
                    <button onClick={() => setReferenceImage(null)} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 transition-colors z-10" aria-label="Remove reference image"><Icon name="close" className="text-sm" /></button>
                </div>
            )}
        </div>
        <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Change the background to a sunny beach..." className="w-full bg-gray-800/50 border border-gray-600 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors text-base"/>
        <Button onClick={handleEdit} isLoading={isLoading} disabled={isLoading || !image || !geminiContext?.ai} className="w-full py-3 text-base"><Icon name="auto_fix" />Apply Edit</Button>
      </div>
      {error && <p className="text-center text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
    </div>
  );
};


// --- From components/views/ImageCombiner.tsx ---
const ImageCombiner: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [combinedImage, setCombinedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const historyContext = useContext(HistoryContext);
  const geminiContext = useContext(GeminiContext);

  const handleFiles = (files: FileList | null) => {
    if (files) {
      setError(null);
      setCombinedImage(null);
      const filePromises = Array.from(files).map(file => {
        return new Promise<ImageFile>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => { resolve({ id: `${file.name}-${Date.now()}`, file, base64: reader.result as string }); };
          reader.readAsDataURL(file);
        });
      });
      Promise.all(filePromises).then(readFiles => setImages(prev => [...prev, ...readFiles]));
    }
  };
  
  const handleDragEvents = (e: DragEvent<HTMLDivElement>, isEntering: boolean) => { e.preventDefault(); e.stopPropagation(); setIsDragging(isEntering); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const removeImage = (id: string) => { setImages(images.filter(img => img.id !== id)); };
  
  const handleCombine = async () => {
    if (!geminiContext?.ai || images.length < 2 || !prompt.trim()) {
      setError('Please upload at least two images, provide a prompt, and set your API key.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setCombinedImage(null);

    try {
      const imageData = images.map(img => ({ base64Data: img.base64.split(',')[1], mimeType: img.file.type }));
      const imageUrl = await combineImages(geminiContext.ai, prompt, imageData);
      setCombinedImage(imageUrl);
      historyContext?.addHistoryItem({ type: 'Combined', image: imageUrl, prompt: prompt });
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!combinedImage) return;
    const link = document.createElement('a');
    link.href = combinedImage;
    link.download = `nayra-ai-combined-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (images.length === 0) {
     return (
        <div className="h-full flex flex-col items-center justify-center gap-8 p-4">
            <div onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className={`w-full max-w-2xl border-4 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors p-10 glassmorphism ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600'}`}>
                <Icon name="upload_file" className="text-6xl text-gray-500" />
                <p className="mt-4 text-xl">Drag & drop two or more images</p>
                <p className="text-gray-400">or</p>
                <label htmlFor="file-upload" className="mt-2"><span className="cursor-pointer px-4 py-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">Browse Files</span><input id="file-upload" type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} /></label>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl glassmorphism p-6 rounded-2xl flex flex-col items-center gap-4 shadow-lg animate-fade-in">
        <div className="w-full">
          <h3 className="text-lg font-semibold mb-3 text-gray-200">Your Images ({images.length}):</h3>
          <div className="flex flex-wrap gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative w-28 h-28">
                <img src={image.base64} alt={image.file.name} className="w-full h-full object-cover rounded-md shadow-md" />
                <button onClick={() => removeImage(image.id!)} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 transition-colors z-10" title="Remove image"><Icon name="close" className="text-sm" /></button>
              </div>
            ))}
            <label htmlFor="file-upload-more" className="w-28 h-28 bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition-colors">
              <Icon name="add_photo_alternate" className="text-3xl text-gray-500"/><span className="text-xs text-gray-400 mt-1">Add more</span>
              <input id="file-upload-more" type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
            </label>
          </div>
        </div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Place the cat onto the sofa in the second image." className="w-full h-24 bg-gray-800/50 border border-gray-600 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-colors" rows={3}/>
        <Button onClick={handleCombine} isLoading={isLoading} disabled={isLoading || images.length < 2 || !geminiContext?.ai}><Icon name="auto_fix" />Combine Images</Button>
      </div>
      {error && <p className="text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
      <div className="flex-1 w-full flex items-center justify-center">
        {isLoading && <Spinner message="Combining your images with AI..." />}
        {!isLoading && combinedImage && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
              <img src={combinedImage} alt="Combined result" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl shadow-black/50" />
              <Button onClick={handleDownload} variant="secondary"><Icon name="download"/>Download Image</Button>
          </div>
        )}
        {!isLoading && !combinedImage && (
            <div className="text-center text-gray-500">
                <Icon name="blender" className="text-6xl" /><p className="mt-4 text-xl">Your combined masterpiece will appear here.</p><p>Describe your vision and hit 'Combine'!</p>
            </div>
        )}
      </div>
    </div>
  );
};


// --- From components/views/History.tsx ---
const HistoryModal: React.FC<{ item: HistoryItem, onClose: () => void, onDelete: (id: string) => void }> = ({ item, onClose, onDelete }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = item.image;
    link.download = `nayra-ai-${item.type.toLowerCase()}-${item.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleDelete = () => {
    if(window.confirm('Are you sure you want to delete this item from your history?')) {
        onDelete(item.id);
        onClose();
    }
  };
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden glassmorphism" onClick={e => e.stopPropagation()}>
        <div className="flex-1 p-4 flex items-center justify-center min-h-0"><img src={item.image} alt={item.prompt} className="max-w-full max-h-full object-contain rounded-lg" /></div>
        <div className="p-6 bg-gray-900/50 border-t border-gray-700/50">
          <p className="text-gray-400 text-sm"><strong>Type:</strong> {item.type}</p>
          <p className="text-gray-400 text-sm mt-1"><strong>Date:</strong> {new Date(item.timestamp).toLocaleString()}</p>
          <p className="text-white mt-3 bg-gray-700/50 p-3 rounded-lg">{item.prompt}</p>
          <div className="flex items-center justify-end gap-4 mt-6">
            <Button onClick={handleDownload} variant="secondary"><Icon name="download" /> Download</Button>
            <Button onClick={handleDelete} className="bg-red-600/90 hover:bg-red-700/90 focus:ring-red-500 border border-red-500 text-white"><Icon name="delete" /> Delete</Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
const History: React.FC = () => {
  const historyContext = useContext(HistoryContext);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  if (!historyContext) return <div className="text-center text-red-500">Error: History context not found.</div>;
  const { history, clearHistory, deleteHistoryItem } = historyContext;
  
  const handleClearHistory = () => { if (window.confirm('Are you sure you want to clear your entire history? This action cannot be undone.')) { clearHistory(); } };

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8">
        <div className="glassmorphism p-12 rounded-3xl flex flex-col items-center">
          <Icon name="history_toggle_off" className="text-7xl text-purple-400" />
          <h2 className="text-4xl font-bold text-white mt-6">History is Empty</h2>
          <p className="mt-4 max-w-md text-lg text-gray-400">Your creative journey will be recorded here. Generate, edit, or combine images to start building your history.</p>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: HistoryItem['type']) => {
    switch(type) {
      case 'Generated': return 'auto_awesome';
      case 'Edited': return 'edit';
      case 'Combined': return 'auto_fix';
      default: return 'image';
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between p-4 mb-4 glassmorphism rounded-2xl">
        <h2 className="text-2xl font-bold text-white">Your Creations</h2>
        <Button onClick={handleClearHistory} variant="secondary" className="bg-red-900/50 border-red-700 text-red-300 hover:bg-red-800/50 hover:text-red-200"><Icon name="delete_forever" />Clear All History</Button>
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {history.map((item) => (
            <div key={item.id} className="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer group relative shadow-lg transition-transform duration-200 hover:scale-105" onClick={() => setSelectedItem(item)} role="button" aria-label={`View details for ${item.type} image`}>
              <img src={item.image} alt={item.prompt} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 text-center text-white">
                <Icon name={getTypeIcon(item.type)} className="text-3xl" /><span className="text-sm font-semibold mt-1">{item.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedItem && <HistoryModal item={selectedItem} onClose={() => setSelectedItem(null)} onDelete={deleteHistoryItem} />}
    </div>
  );
};


// --- From components/views/Settings.tsx ---
const Settings: React.FC = () => {
  const authContext = useContext(AuthContext);
  if (!authContext || !authContext.user) {
    return (<div className="h-full flex items-center justify-center"><p>You are not logged in.</p></div>);
  }
  const { user, logout } = authContext;
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="glassmorphism p-12 rounded-3xl flex flex-col items-center max-w-lg w-full">
        <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center font-bold text-white text-5xl">{user.name.charAt(0).toUpperCase()}</div>
        <h2 className="text-4xl font-bold text-white">{user.name}</h2>
        <p className="mt-2 text-lg text-gray-400">{user.email}</p>
        <div className="mt-8 h-1 w-24 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"></div>
        <Button onClick={logout} variant="secondary" className="mt-10 bg-red-900/50 border-red-700 text-red-300 hover:bg-red-800/50 hover:text-red-200"><Icon name="logout" />Log Out</Button>
      </div>
    </div>
  );
};


// --- From App.tsx ---
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
      setCurrentView(View.AUTH);
      return;
    }
    if (currentView === View.SPLASH || currentView === View.AUTH) {
      const timer = setTimeout(() => { setIsAppReady(true); }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentView, authContext?.user]);
  
  const handleEnterApp = useCallback(() => { setCurrentView(View.EDITOR); }, []);
  
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
  
  if (geminiContext?.isKeyValid === false) {
      return (
          <div className="h-screen w-screen bg-gray-900">
              <Modal isOpen={true} title="Set Up Gemini API Key">
                  <div className="flex flex-col gap-4">
                      <p className="text-gray-400">To use Nayra AI Editor, please provide your Google Gemini API key. Your key is stored securely in your browser and is never shared.</p>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-2">Get your API key from Google AI Studio <Icon name="open_in_new" className="text-sm" /></a>
                      <div className="relative">
                           <Icon name="key" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="password" placeholder="Enter your API Key" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors" aria-label="Gemini API Key"/>
                      </div>
                      {keyError && <p className="text-red-400 text-sm">{keyError}</p>}
                       <Button onClick={handleSaveApiKey} isLoading={isVerifying} disabled={isVerifying || !apiKeyInput}>Save and Continue</Button>
                  </div>
              </Modal>
          </div>
      );
  }

  if (!authContext?.user) { return <Auth />; }
  if (currentView === View.SPLASH || currentView === View.AUTH) { return <SplashScreen isReady={isAppReady} onEnter={handleEnterApp} />; }

  return (
    <HistoryProvider>
      <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-gray-200">
        <div className="flex flex-col flex-1 overflow-hidden md:order-2">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-800/50">
            <div className={`h-full ${currentView === View.GENERATOR ? 'block' : 'hidden'}`}><ImageGenerator /></div>
            <div className={`h-full ${currentView === View.EDITOR ? 'block' : 'hidden'}`}><ImageEditor /></div>
            <div className={`h-full ${currentView === View.COMBINER ? 'block' : 'hidden'}`}><ImageCombiner /></div>
            <div className={`h-full ${currentView === View.HISTORY ? 'block' : 'hidden'}`}><History /></div>
            <div className={`h-full ${currentView === View.SETTINGS ? 'block' : 'hidden'}`}><Settings /></div>
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

// --- From index.tsx (original) ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
