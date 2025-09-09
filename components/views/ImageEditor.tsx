import React, { useState, useCallback, DragEvent, useContext } from 'react';
import { editImage } from '../../services/geminiService';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Spinner from '../ui/Spinner';
import { HistoryContext } from '../../context/HistoryContext';

interface ImageFile {
  file: File;
  base64: string;
}

const ImageEditor: React.FC = () => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [referenceImage, setReferenceImage] = useState<ImageFile | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const historyContext = useContext(HistoryContext);

  const clearState = useCallback(() => {
    // Keep the main image, but clear other fields for a new edit
    setReferenceImage(null);
    setPrompt('');
    setError(null);
  }, []);
  
  const resetAll = useCallback(() => {
      setImage(null);
      setReferenceImage(null);
      setPrompt('');
      setError(null);
  }, []);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      resetAll(); // Reset everything for a new main image
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage({ file, base64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage({ file, base64: reader.result as string });
      };
      reader.readAsDataURL(file);
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
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };
  
  const handleEdit = async () => {
    if (!prompt.trim() || !image) {
      setError('Please upload an image and enter an editing instruction.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const mainImagePayload = {
        base64Data: image.base64.split(',')[1],
        mimeType: image.file.type
      };
      
      const referenceImagePayload = referenceImage ? {
        base64Data: referenceImage.base64.split(',')[1],
        mimeType: referenceImage.file.type
      } : undefined;

      const result = await editImage(prompt, mainImagePayload, referenceImagePayload);

      if (historyContext) {
        historyContext.addHistoryItem({
          type: 'Edited',
          image: result.imageUrl,
          prompt: prompt,
        });
      }
      
      const newFileBlob = await (await fetch(result.imageUrl)).blob()
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage({ file: new File([newFileBlob], "edited_image.png", {type: newFileBlob.type}), base64: reader.result as string });
      };
      reader.readAsDataURL(newFileBlob);
      clearState();
      
      console.log("Model response:", result.text); // For debugging
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred during editing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image.base64;
    link.download = `nayra-ai-edited-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!image) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-4">
            <div
                onDragEnter={(e) => handleDragEvents(e, true)}
                onDragLeave={(e) => handleDragEvents(e, false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`w-full max-w-2xl border-4 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors p-10 ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600'}`}>
                <Icon name="upload_file" className="text-6xl text-gray-500" />
                <p className="mt-4 text-xl">Drag & drop your image here</p>
                <p className="text-gray-400">or</p>
                <label htmlFor="file-upload" className="mt-2">
                <span className="cursor-pointer px-4 py-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
                    Browse Files
                </span>
                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
                </label>
            </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-stretch gap-4">
      {/* Sub-header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 rounded-2xl glassmorphism">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600/80 to-blue-500/80 rounded-lg flex items-center justify-center">
                <Icon name="edit" />
            </div>
            <h2 className="text-xl font-semibold hidden sm:block">AI Image Editor</h2>
        </div>
        <div className="flex items-center gap-3">
            <label htmlFor="file-replace" className="w-12 h-12 flex items-center justify-center bg-gray-700/50 border border-gray-600 rounded-full hover:bg-gray-700 transition-colors cursor-pointer" title="Upload new image">
                <Icon name="image" className="text-2xl" />
                <input id="file-replace" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
            </label>
            <button onClick={handleDownload} className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-500 rounded-full hover:shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-0.5 transition-all" title="Download edited image">
                <Icon name="download" className="text-2xl" />
            </button>
        </div>
      </div>

      {/* Image Preview Area */}
      <div className="flex-1 flex items-center justify-center glassmorphism rounded-2xl p-4 relative min-h-0">
        {isLoading && <div className="absolute inset-0 bg-gray-900/80 z-20 flex items-center justify-center rounded-2xl"><Spinner message="Applying AI magic..." /></div>}
        <img src={image.base64} alt="User upload" className="max-w-full max-h-full object-contain rounded-lg" />
      </div>
      
      {/* Controls Area */}
      <div className="shrink-0 glassmorphism p-4 rounded-2xl flex flex-col items-center gap-3 shadow-lg animate-fade-in">
        <div className="w-full">
            {!referenceImage ? (
                <label htmlFor="ref-file-upload" className="w-full h-20 bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition-colors text-center p-2">
                    <Icon name="add_photo_alternate" className="text-3xl text-gray-400"/>
                    <span className="text-sm text-gray-400 mt-1">Add Reference Image (Optional)</span>
                    <input id="ref-file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleRefFileChange(e.target.files)} />
                </label>
            ) : (
                <div className="relative w-full h-20">
                    <img src={referenceImage.base64} alt="Reference" className="w-full h-full object-cover rounded-xl shadow-md" />
                    <button onClick={() => setReferenceImage(null)} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 transition-colors z-10" aria-label="Remove reference image">
                        <Icon name="close" className="text-sm" />
                    </button>
                </div>
            )}
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Change the background to a sunny beach..."
          className="w-full bg-gray-800/50 border border-gray-600 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors text-base"
        />
        <Button onClick={handleEdit} isLoading={isLoading} disabled={isLoading || !image} className="w-full py-3 text-base">
          <Icon name="auto_fix" />
          Apply Edit
        </Button>
      </div>

      {error && <p className="text-center text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
    </div>
  );
};

export default ImageEditor;
