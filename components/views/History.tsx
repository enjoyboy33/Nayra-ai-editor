import React, { useContext, useState } from 'react';
import { HistoryContext } from '../../context/HistoryContext';
import { HistoryItem } from '../../types';
import Icon from '../ui/Icon';
import Button from '../ui/Button';

// Modal Component defined within the same file for a targeted implementation.
const Modal: React.FC<{ item: HistoryItem, onClose: () => void, onDelete: (id: string) => void }> = ({ item, onClose, onDelete }) => {
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
        <div className="flex-1 p-4 flex items-center justify-center min-h-0">
          <img src={item.image} alt={item.prompt} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
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

  if (!historyContext) {
    // This should not happen if the component is wrapped in HistoryProvider
    return <div className="text-center text-red-500">Error: History context not found.</div>;
  }

  const { history, clearHistory, deleteHistoryItem } = historyContext;
  
  const handleClearHistory = () => {
      if (window.confirm('Are you sure you want to clear your entire history? This action cannot be undone.')) {
          clearHistory();
      }
  };

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
        <Button onClick={handleClearHistory} variant="secondary" className="bg-red-900/50 border-red-700 text-red-300 hover:bg-red-800/50 hover:text-red-200">
          <Icon name="delete_forever" />
          Clear All History
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {history.map((item) => (
            <div 
              key={item.id}
              className="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer group relative shadow-lg transition-transform duration-200 hover:scale-105"
              onClick={() => setSelectedItem(item)}
              role="button"
              aria-label={`View details for ${item.type} image`}
            >
              <img src={item.image} alt={item.prompt} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 text-center text-white">
                <Icon name={getTypeIcon(item.type)} className="text-3xl" />
                <span className="text-sm font-semibold mt-1">{item.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedItem && <Modal item={selectedItem} onClose={() => setSelectedItem(null)} onDelete={deleteHistoryItem} />}
    </div>
  );
};

export default History;
