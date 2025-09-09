
import React from 'react';
import Icon from '../ui/Icon';

interface PlaceholderViewProps {
  title: string;
  message: string;
  icon: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title, message, icon }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8">
      <div className="glassmorphism p-12 rounded-3xl flex flex-col items-center">
        <Icon name={icon} className="text-7xl text-purple-400" />
        <h2 className="text-4xl font-bold text-white mt-6">{title}</h2>
        <p className="mt-4 max-w-md text-lg text-gray-400">{message}</p>
        <div className="mt-8 h-1 w-24 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"></div>
      </div>
    </div>
  );
};

export default PlaceholderView;
