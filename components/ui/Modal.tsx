import React from 'react';
import Icon from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void; // Optional if you don't want a close button
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-2xl w-full max-w-lg flex flex-col overflow-hidden glassmorphism border border-gray-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold">{title}</h2>
          {onClose && (
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
            >
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

export default Modal;
