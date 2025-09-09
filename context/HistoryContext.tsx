import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { HistoryItem } from '../types';

interface HistoryContextType {
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
}

export const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('nayra-ai-history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
      setHistory([]);
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
      const newHistoryItem: HistoryItem = {
        ...item,
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
      };
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
