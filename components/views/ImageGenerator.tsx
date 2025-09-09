
import React, { useState, useContext } from 'react';
import { generateImage } from '../../services/geminiService';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Spinner from '../ui/Spinner';
import { HistoryContext } from '../../context/HistoryContext';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const historyContext = useContext(HistoryContext);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageUrl = await generateImage(prompt);
      setGeneratedImage(imageUrl);
      
      if (historyContext) {
        historyContext.addHistoryItem({
          type: 'Generated',
          image: imageUrl,
          prompt: prompt,
        });
      }
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
    link.download = `nayra-ai-${prompt.substring(0, 20).replace(/\s/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col gap-8 items-center">
      <div className="w-full max-w-3xl glassmorphism p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-lg">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A majestic lion wearing a crown, cinematic lighting, detailed..."
          className="w-full h-24 md:h-auto md:flex-1 bg-gray-800/50 border border-gray-600 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-colors"
          rows={3}
        />
        <Button onClick={handleGenerate} isLoading={isLoading} disabled={isLoading}>
          <Icon name="auto_awesome" />
          Generate
        </Button>
      </div>

      {error && <p className="text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
      
      <div className="flex-1 w-full flex items-center justify-center">
        {isLoading && <Spinner message="Your vision is materializing..." />}

        {!isLoading && generatedImage && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
             <img src={generatedImage} alt={prompt} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl shadow-black/50" />
             <Button onClick={handleDownload} variant="secondary">
                <Icon name="download"/>
                Download Image
             </Button>
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

export default ImageGenerator;
