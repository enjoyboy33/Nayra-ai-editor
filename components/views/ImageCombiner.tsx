import React, { useState, DragEvent, useContext } from 'react';
import { combineImages } from '../../services/geminiService';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Spinner from '../ui/Spinner';
import { HistoryContext } from '../../context/HistoryContext';
import { GeminiContext } from '../../context/GeminiContext';

interface ImageFile {
  id: string;
  file: File;
  base64: string;
}

const ImageCombiner: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [combinedImage, setCombinedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const historyContext = useContext(HistoryContext);
  const geminiContext = useContext(GeminiContext);

  const handleFiles = (files: FileList | null) => {
    if (files) {
      setError(null);
      setCombinedImage(null);
      const filePromises = Array.from(files).map(file => {
        return new Promise<ImageFile>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ 
              id: `${file.name}-${Date.now()}`,
              file, 
              base64: reader.result as string 
            });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises).then(readFiles => {
        setImages(prevImages => [...prevImages, ...readFiles]);
      });
    }
  };
  
  const handleDragEvents = (e: DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };
  
  const handleCombine = async () => {
    if (!geminiContext?.ai) {
      setError('Gemini AI client is not initialized. Please set your API key.');
      return;
    }
    if (images.length < 2) {
      setError('Please upload at least two images to combine.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt to describe how to combine the images.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCombinedImage(null);

    try {
      const imageData = images.map(img => ({
        base64Data: img.base64.split(',')[1],
        mimeType: img.file.type,
      }));
      const imageUrl = await combineImages(geminiContext.ai, prompt, imageData);
      setCombinedImage(imageUrl);

      if (historyContext) {
        historyContext.addHistoryItem({
          type: 'Combined',
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
    if (!combinedImage) return;
    const link = document.createElement('a');
    link.href = combinedImage;
    link.download = `nayra-ai-combined-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (images.length === 0) {
     return (
        <div className="h-full flex flex-col items-center justify-center gap-8 p-4">
            <div
                onDragEnter={(e) => handleDragEvents(e, true)}
                onDragLeave={(e) => handleDragEvents(e, false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`w-full max-w-2xl border-4 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors p-10 glassmorphism ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600'}`}>
                <Icon name="upload_file" className="text-6xl text-gray-500" />
                <p className="mt-4 text-xl">Drag & drop two or more images</p>
                <p className="text-gray-400">or</p>
                <label htmlFor="file-upload" className="mt-2">
                <span className="cursor-pointer px-4 py-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
                    Browse Files
                </span>
                <input id="file-upload" type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
                </label>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl glassmorphism p-6 rounded-2xl flex flex-col items-center gap-4 shadow-lg animate-fade-in">
        <div className="w-full">
          <h3 className="text-lg font-semibold mb-3 text-gray-200">Your Images ({images.length}):</h3>
          <div className="flex flex-wrap gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative w-28 h-28">
                <img src={image.base64} alt={image.file.name} className="w-full h-full object-cover rounded-md shadow-md" />
                <button onClick={() => removeImage(image.id)} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 transition-colors z-10" title="Remove image">
                  <Icon name="close" className="text-sm" />
                </button>
              </div>
            ))}
              <label htmlFor="file-upload-more" className="w-28 h-28 bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition-colors">
                <Icon name="add_photo_alternate" className="text-3xl text-gray-500"/>
                <span className="text-xs text-gray-400 mt-1">Add more</span>
                  <input id="file-upload-more" type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
            </label>
          </div>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Place the cat onto the sofa in the second image."
          className="w-full h-24 bg-gray-800/50 border border-gray-600 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-colors"
          rows={3}
        />
        <Button onClick={handleCombine} isLoading={isLoading} disabled={isLoading || images.length < 2 || !geminiContext?.ai}>
          <Icon name="auto_fix" />
          Combine Images
        </Button>
      </div>

      {error && <p className="text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}

      <div className="flex-1 w-full flex items-center justify-center">
        {isLoading && <Spinner message="Combining your images with AI..." />}
        
        {!isLoading && combinedImage && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
              <img src={combinedImage} alt="Combined result" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl shadow-black/50" />
              <Button onClick={handleDownload} variant="secondary">
                <Icon name="download"/>
                Download Image
              </Button>
          </div>
        )}

        {!isLoading && !combinedImage && (
            <div className="text-center text-gray-500">
                <Icon name="blender" className="text-6xl" />
                <p className="mt-4 text-xl">Your combined masterpiece will appear here.</p>
                <p>Describe your vision and hit 'Combine'!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageCombiner;