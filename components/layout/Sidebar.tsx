import React from 'react';
import { View } from '../../types';
import { NAV_ITEMS } from '../../constants';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';

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
    <nav className="order-2 md:order-1 shrink-0 bg-gray-900/80 glassmorphism 
                   flex md:flex-col md:justify-start
                   h-20 md:h-screen w-full md:w-64
                   border-t md:border-t-0 md:border-r border-gray-700/50">
      
      <div className="hidden md:flex items-center gap-3 p-4 border-b border-gray-700/50 shrink-0">
        <Logo className="h-8 w-8" />
        <h1 className="text-lg font-semibold text-white">Nayra AI Editor</h1>
      </div>

      <ul className="flex md:flex-col justify-evenly md:justify-start w-full md:p-2 md:gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.view} className="flex-1 md:flex-initial flex justify-center">
            <button
              onClick={() => setCurrentView(item.view)}
              className="w-full h-16 md:h-auto flex items-center justify-center rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500
                         md:justify-start"
              aria-current={currentView === item.view ? 'page' : undefined}
            >
              {/* Mobile View */}
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

              {/* Desktop View */}
              <div className={`hidden md:flex items-center w-full p-3 gap-4 rounded-lg
                             ${currentView === item.view ? 'bg-purple-600/50' : 'group-hover:bg-gray-700/50'}`}>
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

export default Sidebar;
