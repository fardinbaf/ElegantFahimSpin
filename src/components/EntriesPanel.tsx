import React, { useState, useRef, useEffect } from 'react';
import { ShuffleIcon, SortIcon, ImageIcon, ChevronDownIcon, ChevronUpIcon } from './icons';

interface EntriesPanelProps {
  namesInput: string;
  onNamesInputChange: (value: string) => void;
  onShuffle: () => void;
  onSort: () => void;
  onAddBackgroundImage: (file: File) => void;
  onAddCenterImage: (file: File) => void;
  onAddImageAsEntry: (file: File) => void;
}

const EntriesPanel: React.FC<EntriesPanelProps> = ({
  namesInput,
  onNamesInputChange,
  onShuffle,
  onSort,
  onAddBackgroundImage,
  onAddCenterImage,
  onAddImageAsEntry,
}) => {
  const [isImageDropdownOpen, setIsImageDropdownOpen] = useState(false);
  const backgroundImageInputRef = useRef<HTMLInputElement>(null);
  const centerImageInputRef = useRef<HTMLInputElement>(null);
  const entryImageInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleImageDropdown = () => setIsImageDropdownOpen(!isImageDropdownOpen);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, handler: (file: File) => void) => {
    if (event.target.files && event.target.files[0]) {
      handler(event.target.files[0]);
    }
    event.target.value = ''; // Reset file input
    setIsImageDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsImageDropdownOpen(false);
      }
    };
    if (isImageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isImageDropdownOpen]);


  return (
    <div className="p-1 md:p-2 space-y-3 h-full flex flex-col">
      <div className="grid grid-cols-3 gap-1 mb-2">
        <button
          onClick={onShuffle}
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-3 rounded-md transition-colors text-xs sm:text-sm flex items-center justify-center"
          aria-label="Shuffle entries"
        >
          <ShuffleIcon className="w-4 h-4 mr-1 sm:mr-1.5" /> Shuffle
        </button>
        <button
          onClick={onSort}
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-3 rounded-md transition-colors text-xs sm:text-sm flex items-center justify-center"
          aria-label="Sort entries alphabetically"
        >
          <SortIcon className="w-4 h-4 mr-1 sm:mr-1.5" /> Sort
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleImageDropdown}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-3 rounded-md transition-colors text-xs sm:text-sm flex items-center justify-center"
            aria-label="Add image options"
            aria-haspopup="true"
            aria-expanded={isImageDropdownOpen}
          >
            <ImageIcon className="w-4 h-4 mr-1 sm:mr-1.5" /> Add Image
            {isImageDropdownOpen ? <ChevronUpIcon className="w-3 h-3 ml-1" /> : <ChevronDownIcon className="w-3 h-3 ml-1" />}
          </button>
          {isImageDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-600 rounded-md shadow-lg z-20 py-1">
              <button
                onClick={() => backgroundImageInputRef.current?.click()}
                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-200 hover:bg-slate-500 transition-colors"
              >
                Add background image
              </button>
              <button
                onClick={() => centerImageInputRef.current?.click()}
                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-200 hover:bg-slate-500 transition-colors"
              >
                Add center image
              </button>
              <button
                onClick={() => entryImageInputRef.current?.click()}
                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-200 hover:bg-slate-500 transition-colors"
              >
                Add image as entry
              </button>
            </div>
          )}
        </div>
      </div>
      <input type="file" accept="image/*" ref={backgroundImageInputRef} onChange={(e) => handleFileSelect(e, onAddBackgroundImage)} className="hidden" />
      <input type="file" accept="image/*" ref={centerImageInputRef} onChange={(e) => handleFileSelect(e, onAddCenterImage)} className="hidden" />
      <input type="file" accept="image/*" ref={entryImageInputRef} onChange={(e) => handleFileSelect(e, onAddImageAsEntry)} className="hidden" />
      
      <textarea
        value={namesInput}
        onChange={(e) => onNamesInputChange(e.target.value)}
        rows={10}
        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-50 custom-scrollbar flex-grow"
        placeholder="Enter names here, one per line or comma-separated... Image entries look like [Image: filename.png]"
        aria-label="Name entries input"
      />
    </div>
  );
};

export default EntriesPanel;
