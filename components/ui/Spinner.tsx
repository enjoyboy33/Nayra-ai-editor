
import React, { useState, useEffect } from 'react';

interface SpinnerProps {
    message?: string;
}

const defaultMessages = [
    "Applying AI magic...",
    "Analyzing pixels...",
    "Consulting with digital muses...",
    "Painting with algorithms...",
    "Reticulating splines...",
    "Unleashing creative AI...",
    "Crafting perfection...",
    "Just a moment, the AI is thinking...",
    "Brewing some digital creativity...",
    "Warming up the neural networks...",
];


const Spinner: React.FC<SpinnerProps> = ({ message }) => {
    const [messages, setMessages] = useState<string[]>([]);
    const [currentMessage, setCurrentMessage] = useState<string>('');

    useEffect(() => {
        let messageList: string[];
        if (message) {
            // Ensure the custom message is first, and avoid duplicates.
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

export default Spinner;
