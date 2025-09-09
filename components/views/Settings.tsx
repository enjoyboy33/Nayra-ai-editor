
import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

const Settings: React.FC = () => {
  const authContext = useContext(AuthContext);

  if (!authContext || !authContext.user) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>You are not logged in.</p>
      </div>
    );
  }

  const { user, logout } = authContext;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="glassmorphism p-12 rounded-3xl flex flex-col items-center max-w-lg w-full">
        <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center font-bold text-white text-5xl">
            {user.name.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-4xl font-bold text-white">{user.name}</h2>
        <p className="mt-2 text-lg text-gray-400">{user.email}</p>
        
        <div className="mt-8 h-1 w-24 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"></div>

        <Button 
          onClick={logout} 
          variant="secondary" 
          className="mt-10 bg-red-900/50 border-red-700 text-red-300 hover:bg-red-800/50 hover:text-red-200"
        >
          <Icon name="logout" />
          Log Out
        </Button>
      </div>
    </div>
  );
};

export default Settings;
