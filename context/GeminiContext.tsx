import React, { createContext, useState, useEffect, ReactNode, useMemo, useContext } from 'react';
import { GoogleGenAI } from "@google/genai";

interface GeminiContextType {
  ai: GoogleGenAI | null;
  apiKey: string | null;
  setApiKey: (key: string) => void;
  isKeyValid: boolean | null;
  checkApiKey: (key: string) => Promise<boolean>;
}

export const GeminiContext = createContext<GeminiContextType | undefined>(undefined);

export const GeminiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
      // We assume the key is valid if it's set and has been checked once before.
      // The modal forces the initial check.
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
  
  // A simple check function to verify the key can make a basic call.
  const checkApiKey = async (key: string): Promise<boolean> => {
    if (!key) return false;
    try {
        const testAi = new GoogleGenAI({ apiKey: key });
        // Use a simple, low-token model call for validation
        await testAi.models.generateContent({
            model: "gemini-2.5-flash",
            contents: 'hello',
        });
        return true;
    } catch (error) {
        console.error("API Key validation failed:", error);
        return false;
    }
  }

  const value = useMemo(() => ({ ai, apiKey, setApiKey, isKeyValid, checkApiKey }), [ai, apiKey, isKeyValid]);

  // Don't render children until we've checked localStorage for a key.
  if (isLoading) {
    return null;
  }

  return (
    <GeminiContext.Provider value={value}>
      {children}
    </GeminiContext.Provider>
  );
};