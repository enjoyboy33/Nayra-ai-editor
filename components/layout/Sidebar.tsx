import React from 'react';
import { View } from '../../types';
import { NAV_ITEMS } from '../../constants';
import Icon from '../ui/Icon';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const getShortLabel = (label: string) => {
    if (label.startsWith('AI Image ')) {
      return label.substring(9);
    }
    if (label.startsWith('AI ')) {
      return label.substring(3);
    }
    return label;
  };

  return (
    <nav className="h-20 bg-gray-900/80 glassmorphism border-t border-gray-700/50 flex items-center justify-center shrink-0">
      <ul className="flex items-center justify-evenly w-full px-2 sm:px-4">
        {NAV_ITEMS.map((item) => (
          <li key={item.view} className="flex-1 flex justify-center">
            <button
              onClick={() => setCurrentView(item.view)}
              className={`flex items-center justify-center p-1 rounded-lg transition-all duration-200 w-full h-16 group focus:outline-none ${
                currentView === item.view
                  ? 'flex-row' // Active button has icon and text side-by-side
                  : 'flex-col gap-1.5' // Inactive button has icon above text
              }`}
              aria-current={currentView === item.view ? 'page' : undefined}
            >
              {currentView === item.view ? (
                <div className="flex items-center justify-center gap-2 bg-purple-600 rounded-full px-4 py-2 shadow-lg shadow-purple-500/40">
                  <Icon name={item.icon} className="text-xl text-white" />
                  <span className="text-sm font-semibold text-white whitespace-nowrap">{getShortLabel(item.label)}</span>
                </div>
              ) : (
                <>
                  <Icon name={item.icon} className="text-2xl text-gray-400 group-hover:text-white transition-colors" />
                  <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">{getShortLabel(item.label)}</span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;