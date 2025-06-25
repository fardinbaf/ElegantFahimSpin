import React, { useState, useEffect, useRef, useCallback } from 'react';
import WheelCanvas from './components/WheelCanvas';
import EntriesPanel from './components/EntriesPanel'; 
import WinnerModal from './components/WinnerModal';
import WinnersList from './components/WinnersList';
import ConfettiCanvas from './components/ConfettiCanvas';
import { WheelSettings, ActiveTab, WheelEntry, TextEntry, ImageEntry, WheelBackgroundImage, WheelCenterImage } from './types'; 
import { DEFAULT_WHEEL_SETTINGS, MIN_NAMES_TO_SPIN, APP_TITLE, MAX_NAMES_DISPLAYED_ON_WHEEL } from './constants';
import { PlayIcon, StarLogoIcon } from './components/icons';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const generateId = () => Math.random().toString(36).substr(2, 9);

const initialDefaultNamesInput = 'Fahim\nMamun\nFardin\nJahangir\nRifat\nSharif\nRajib\nAl-Amin';
const parseNamesToEntries = (input: string, existingEntries: WheelEntry[]): WheelEntry[] => {
  const lines = input
    .split(/[\n,]+/)
    .map(name => name.trim())
    .filter(name => name.length > 0);

  const imageEntryPlaceholderRegex = /^\[Image: (.*)\]$/;

  return lines.map(lineValue => {
    const imageMatch = lineValue.match(imageEntryPlaceholderRegex);
    if (imageMatch) {
      const originalName = imageMatch[1];
      const existingImageEntry = existingEntries.find(
        e => e.type === 'image' && e.originalName === originalName
      ) as ImageEntry | undefined;
      if (existingImageEntry) {
        return existingImageEntry;
      }
      return { type: 'text', name: lineValue, id: generateId() } as TextEntry; // Fallback if image data not found
    } else {
      const existingTextEntry = existingEntries.find(
        e => e.type === 'text' && e.name === lineValue
      ) as TextEntry | undefined;
      return existingTextEntry || { type: 'text', name: lineValue, id: generateId() } as TextEntry;
    }
  });
};

const App: React.FC = () => {
  const [namesInput, setNamesInput] = useState<string>(initialDefaultNamesInput);
  const [parsedEntries, setParsedEntries] = useState<WheelEntry[]>(() => parseNamesToEntries(initialDefaultNamesInput, []));
  
  const [wheelSettings] = useState<WheelSettings>(DEFAULT_WHEEL_SETTINGS); 
  
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isSpinningTrigger, setIsSpinningTrigger] = useState<boolean>(false); 
  const [entriesForCurrentSpin, setEntriesForCurrentSpin] = useState<WheelEntry[]>([]);
  
  const [currentWinner, setCurrentWinner] = useState<string | null>(null);
  const [winnerHistory, setWinnerHistory] = useState<string[]>([]);
  
  const [showOptionsPanel, setShowOptionsPanel] = useState<boolean>(true); 
  const [activeTab, setActiveTab] = useState<ActiveTab>('entries'); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showConfetti, setShowConfetti] = useState<boolean>(false); 

  const [wheelBackgroundImage, setWheelBackgroundImage] = useState<WheelBackgroundImage>(null);
  const [wheelCenterImage, setWheelCenterImage] = useState<WheelCenterImage>(null);

  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const winnerAudioRef = useRef<HTMLAudioElement | null>(null);
  const parsedEntriesRef = useRef<WheelEntry[]>(parsedEntries);

  // Gemini API states
  const [aiStory, setAiStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState<boolean>(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const geminiAiRef = useRef<GoogleGenAI | null>(null);
  const apiKeyAvailableRef = useRef<boolean>(false);

  useEffect(() => {
    // Vite will replace process.env.API_KEY with the actual value at build time
    const apiKey = process.env.API_KEY; 
    if (apiKey) {
      geminiAiRef.current = new GoogleGenAI({ apiKey });
      apiKeyAvailableRef.current = true;
    } else {
      console.warn("Gemini API key not found. AI story feature will be disabled. Ensure API_KEY is set in your Netlify environment variables.");
      apiKeyAvailableRef.current = false;
    }
  }, []);

  useEffect(() => {
    parsedEntriesRef.current = parsedEntries;
  }, [parsedEntries]);

  useEffect(() => {
    const tickAudio = new Audio();
    tickAudioRef.current = tickAudio;

    const winnerAudio = new Audio();
    winnerAudioRef.current = winnerAudio;

    if (wheelSettings.tickSoundUrl && tickAudioRef.current) {
        tickAudioRef.current.src = wheelSettings.tickSoundUrl;
        tickAudioRef.current.load(); 
    }
    if (wheelSettings.winnerSoundUrl && winnerAudioRef.current) {
        winnerAudioRef.current.src = wheelSettings.winnerSoundUrl;
        winnerAudioRef.current.load();
    }

    const storedWinners = localStorage.getItem('wheelOfNamesWinners');
    if (storedWinners) {
      try {
        const parsedStoredWinners = JSON.parse(storedWinners);
        if (Array.isArray(parsedStoredWinners)) {
           setWinnerHistory(parsedStoredWinners);
        }
      } catch (error) {
        console.error("Failed to parse winner history from localStorage", error);
        localStorage.removeItem('wheelOfNamesWinners');
      }
    }
  }, [wheelSettings.tickSoundUrl, wheelSettings.winnerSoundUrl]); 


  useEffect(() => {
    const newParsedEntries = parseNamesToEntries(namesInput, parsedEntriesRef.current);
    setParsedEntries(newParsedEntries);

    if (newParsedEntries.length < MIN_NAMES_TO_SPIN) {
        setErrorMessage(`Please enter at least ${MIN_NAMES_TO_SPIN} ${MIN_NAMES_TO_SPIN === 1 ? 'entry' : 'entries'}.`);
    } else if (newParsedEntries.length > MAX_NAMES_DISPLAYED_ON_WHEEL) {
        setErrorMessage(`For best performance, use up to ${MAX_NAMES_DISPLAYED_ON_WHEEL} entries.`);
    } else {
        setErrorMessage(null);
    }
  }, [namesInput]);

  const updateNamesInputFromParsedEntries = useCallback(() => {
    const newNamesInputString = parsedEntriesRef.current.map(entry => {
      if (entry.type === 'image') {
        return `[Image: ${entry.originalName}]`;
      }
      return entry.name;
    }).join('\n');
    setNamesInput(newNamesInputString);
  }, []);


  useEffect(() => {
    localStorage.setItem('wheelOfNamesWinners', JSON.stringify(winnerHistory));
  }, [winnerHistory]);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 4500); 
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);


  const generateStoryForWinner = useCallback(async (winnerName: string) => {
    if (!geminiAiRef.current || !apiKeyAvailableRef.current) {
      setStoryError("AI story generation is unavailable.");
      return;
    }
    setIsGeneratingStory(true);
    setAiStory(null);
    setStoryError(null);
    try {
      const prompt = `You are a fun and enthusiastic announcer for 'Elegant Fahim's Star Giveaway'. The winner is ${winnerName}. Generate a very short (2-3 sentences), super exciting, and congratulatory message for ${winnerName}. Make it celebratory and perhaps a little whimsical, like they've just won something amazing!`;
      const response: GenerateContentResponse = await geminiAiRef.current.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
      });
      setAiStory(response.text);
    } catch (error) {
      console.error("Error generating story:", error);
      setStoryError("Oops! Couldn't generate a celebration message. Please try again.");
    } finally {
      setIsGeneratingStory(false);
    }
  }, []);


  const handlePlayTickSound = useCallback(() => {
    if (tickAudioRef.current && tickAudioRef.current.src && !tickAudioRef.current.paused) {
        tickAudioRef.current.pause();
        tickAudioRef.current.currentTime = 0;
    }
    if (tickAudioRef.current && tickAudioRef.current.src) {
      tickAudioRef.current.play().catch(e => {
        // console.error("Error playing tick sound:", e); 
      });
    }
  }, []);

  const handleSpinStartCallback = useCallback(() => { 
    setIsSpinning(true);
  }, []);

  const handleSpinEnd = useCallback((winnerName: string) => { 
    setIsSpinning(false);
    setIsSpinningTrigger(false); 
    
    if (tickAudioRef.current) {
        tickAudioRef.current.pause();
        tickAudioRef.current.currentTime = 0;
    }
    
    if (winnerName && winnerName !== "No entries!" && !winnerName.startsWith("Error:")) {
        setCurrentWinner(winnerName);
        setWinnerHistory(prev => [winnerName, ...prev]);
        setShowConfetti(true); 
        if (winnerAudioRef.current && winnerAudioRef.current.src) {
            winnerAudioRef.current.play().catch(e => {
                console.error("Error playing winner sound:", e);
            });
        }
        if (apiKeyAvailableRef.current) {
          generateStoryForWinner(winnerName);
        }
    } else {
        setErrorMessage(winnerName || "Error selecting winner."); 
        setAiStory(null); // Clear story if spin error
    }
  }, [generateStoryForWinner]);

  const startSpin = useCallback(() => {
    if (isSpinning || parsedEntriesRef.current.length < MIN_NAMES_TO_SPIN || parsedEntriesRef.current.length > MAX_NAMES_DISPLAYED_ON_WHEEL) {
      if (parsedEntriesRef.current.length < MIN_NAMES_TO_SPIN) {
        setErrorMessage(`Add at least ${MIN_NAMES_TO_SPIN} ${MIN_NAMES_TO_SPIN === 1 ? 'entry' : 'entries'} to spin!`);
      } else if (parsedEntriesRef.current.length > MAX_NAMES_DISPLAYED_ON_WHEEL) {
        setErrorMessage(`Too many entries! Max ${MAX_NAMES_DISPLAYED_ON_WHEEL} for smooth spinning.`);
      }
      return;
    }
    setErrorMessage(null);
    setCurrentWinner(null); 
    setAiStory(null); // Clear previous story
    setStoryError(null);
    
    setEntriesForCurrentSpin([...parsedEntriesRef.current]); 
    setIsSpinningTrigger(true); 
  }, [isSpinning]);


  const closeModal = useCallback(() => {
    setCurrentWinner(null);
    setAiStory(null);
    setStoryError(null);
    setIsGeneratingStory(false);
  }, []);
  
  const handleRemoveWinnerAndSpinAgain = useCallback(() => {
    if (currentWinner) {
      const updatedEntries = parsedEntriesRef.current.filter(entry => {
        if (entry.type === 'text') return entry.name !== currentWinner;
        if (entry.type === 'image') return entry.originalName !== currentWinner;
        return true;
      });
      setParsedEntries(updatedEntries); 
      
      const newNamesInput = updatedEntries.map(entry => 
        entry.type === 'image' ? `[Image: ${entry.originalName}]` : entry.name
      ).join('\n');
      setNamesInput(newNamesInput); 
    }
    closeModal();
    setTimeout(() => {
      if (parsedEntriesRef.current.length >= MIN_NAMES_TO_SPIN) {
        startSpin(); 
      } else if (parsedEntriesRef.current.length > 0) {
         setErrorMessage(`Add at least ${MIN_NAMES_TO_SPIN} ${MIN_NAMES_TO_SPIN === 1 ? 'entry' : 'entries'} to spin!`);
      } else {
        setErrorMessage('No entries left to spin!');
      }
    }, 150); 
  }, [currentWinner, closeModal, startSpin]);


  const clearWinnerHistory = useCallback(() => {
    setWinnerHistory([]);
  }, []);

  const handleShuffleNames = useCallback(() => {
    const shuffled = [...parsedEntriesRef.current].sort(() => Math.random() - 0.5);
    setParsedEntries(shuffled); 
    updateNamesInputFromParsedEntries();
  }, [updateNamesInputFromParsedEntries]);

  const handleSortNames = useCallback(() => {
    const sorted = [...parsedEntriesRef.current].sort((a, b) => {
        const nameA = a.type === 'text' ? a.name : a.originalName;
        const nameB = b.type === 'text' ? b.name : b.originalName;
        return nameA.localeCompare(nameB);
    });
    setParsedEntries(sorted);
    updateNamesInputFromParsedEntries();
  }, [updateNamesInputFromParsedEntries]);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleAddBackgroundImage = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataURL(file);
      setWheelBackgroundImage(dataUrl);
    } catch (error) {
      console.error("Error reading background image file:", error);
      setErrorMessage("Failed to load background image.");
    }
  };

  const handleAddCenterImage = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataURL(file);
      setWheelCenterImage(dataUrl);
    } catch (error) {
      console.error("Error reading center image file:", error);
      setErrorMessage("Failed to load center image.");
    }
  };

  const handleAddImageAsEntry = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataURL(file);
      const newImageEntry: ImageEntry = {
        id: generateId(),
        type: 'image',
        dataUrl,
        originalName: file.name,
      };
      const updatedParsedEntries = [...parsedEntriesRef.current, newImageEntry];
      setParsedEntries(updatedParsedEntries);
      
      const newNamesInputString = updatedParsedEntries.map(entry => {
        if (entry.type === 'image') {
          return `[Image: ${entry.originalName}]`;
        }
        return entry.name;
      }).join('\n');
      setNamesInput(newNamesInputString);

    } catch (error) {
      console.error("Error reading entry image file:", error);
      setErrorMessage("Failed to add image as entry.");
    }
  };

  const spinButtonDisabled = isSpinning || parsedEntries.length < MIN_NAMES_TO_SPIN || parsedEntries.length > MAX_NAMES_DISPLAYED_ON_WHEEL;
  
  const entriesToDisplayOnWheel = 
    (isSpinning || isSpinningTrigger) && entriesForCurrentSpin.length > 0 
    ? entriesForCurrentSpin 
    : parsedEntriesRef.current;


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-purple-700 to-pink-600 text-slate-100 p-2 sm:p-4 flex flex-col items-center overflow-hidden relative">
      {showConfetti && <ConfettiCanvas />}

      <header className="w-full max-w-5xl text-center my-4 md:my-6">
        <div className="flex items-center justify-center">
          <StarLogoIcon className="w-8 h-8 sm:w-10 md:w-12 sm:h-10 md:h-12 mr-2 sm:mr-3 text-yellow-400" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-orange-300">
            {APP_TITLE}
          </h1>
        </div>
        <p className="text-slate-300 mt-1 sm:mt-2 text-base sm:text-lg">Chance to get star ⭐ gift!</p>
      </header>

      <div className="w-full max-w-5xl flex-grow flex flex-col md:flex-row gap-4 md:gap-6">
        <div className={`flex flex-col items-center justify-start ${showOptionsPanel ? 'md:w-1/2 lg:w-3/5' : 'md:w-full'} transition-all duration-300`}>
          <div className="w-full bg-slate-800 bg-opacity-80 p-3 sm:p-4 md:p-6 rounded-xl shadow-2xl mb-4 sm:mb-6 relative custom-shadow backdrop-blur-sm">
            <div className="flex justify-center items-center mb-4 sm:mb-6 h-10 sm:h-12">
                <button
                    onClick={startSpin}
                    disabled={spinButtonDisabled}
                    aria-label="Spin the wheel"
                    className="bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-2 px-6 sm:py-3 sm:px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 ease-in-out transform hover:scale-105 flex items-center text-lg sm:text-xl focus:outline-none focus:ring-4 focus:ring-green-400 focus:ring-opacity-50"
                >
                    <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-1.5 sm:mr-2" />
                    SPIN!
                </button>
            </div>
             {errorMessage && (
                <div role="alert" className="text-center text-red-300 mb-3 sm:mb-4 bg-red-900 bg-opacity-70 p-2 sm:p-3 rounded-md text-sm sm:text-base">
                    {errorMessage}
                </div>
            )}
            
            <WheelCanvas
              entries={entriesToDisplayOnWheel}
              settings={wheelSettings} 
              onSpinStart={handleSpinStartCallback} 
              onSpinEnd={handleSpinEnd}
              onPlayTickSound={handlePlayTickSound}
              isSpinningTrigger={isSpinningTrigger}
              backgroundImageUrl={wheelBackgroundImage}
              centerImageUrl={wheelCenterImage}
            />
          </div>
        </div>

        {showOptionsPanel && (
          <div className="md:w-1/2 lg:w-2/5 bg-slate-800 text-slate-200 p-2 sm:p-3 md:p-4 rounded-lg shadow-xl flex flex-col custom-shadow backdrop-blur-sm">
            <div className="flex items-center border-b border-slate-700 mb-2 sm:mb-3">
              <button
                onClick={() => setActiveTab('entries')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${activeTab === 'entries' ? 'border-b-2 border-indigo-400 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
                aria-pressed={activeTab === 'entries'}
              >
                Entries <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{parsedEntries.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${activeTab === 'results' ? 'border-b-2 border-indigo-400 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
                aria-pressed={activeTab === 'results'}
              >
                Results <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{winnerHistory.length}</span>
              </button>
              <div className="ml-auto flex items-center">
                <input
                  type="checkbox"
                  id="hide-options"
                  checked={!showOptionsPanel} 
                  onChange={() => setShowOptionsPanel(prev => !prev)}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 bg-slate-700 border-slate-600 rounded focus:ring-indigo-400 focus:ring-offset-slate-800"
                />
                <label htmlFor="hide-options" className="ml-1 sm:ml-1.5 text-xs text-slate-400">Hide</label>
              </div>
            </div>

            <div className="flex-grow min-h-0">
              {activeTab === 'entries' && (
                <EntriesPanel
                  namesInput={namesInput}
                  onNamesInputChange={setNamesInput}
                  onShuffle={handleShuffleNames}
                  onSort={handleSortNames}
                  onAddBackgroundImage={handleAddBackgroundImage}
                  onAddCenterImage={handleAddCenterImage}
                  onAddImageAsEntry={handleAddImageAsEntry}
                />
              )}
              {activeTab === 'results' && (
                <div className="h-full overflow-y-auto custom-scrollbar">
                  <WinnersList winners={winnerHistory} onClearWinners={clearWinnerHistory} />
                </div>
              )}
            </div>
          </div>
        )}
         {!showOptionsPanel && (
            <button
                onClick={() => setShowOptionsPanel(true)}
                className="fixed top-16 sm:top-20 right-2 sm:right-4 bg-slate-700 text-slate-200 p-1.5 sm:p-2 rounded-md shadow-lg hover:bg-slate-600 transition-colors z-20 text-xs"
                aria-label="Show options panel"
            >
                Show Options
            </button>
        )}
      </div>

      <WinnerModal 
        winnerName={currentWinner} 
        onClose={closeModal} 
        onRemoveWinnerAndSpinAgain={handleRemoveWinnerAndSpinAgain}
        canRemoveWinner={currentWinner ? parsedEntriesRef.current.filter(entry => 
            entry.type === 'image' ? entry.originalName !== currentWinner : entry.name !== currentWinner
        ).length >= MIN_NAMES_TO_SPIN : false}
        aiStory={aiStory}
        isGeneratingStory={isGeneratingStory}
        storyError={storyError}
        onRegenerateStory={currentWinner && apiKeyAvailableRef.current ? () => generateStoryForWinner(currentWinner) : undefined}
        apiKeyAvailable={apiKeyAvailableRef.current}
      />
      
      <footer className="text-center text-slate-400 mt-6 sm:mt-8 py-3 sm:py-4 text-xs sm:text-sm">
        <p>A creation by Eligant Fahim. Spin responsibily!</p>
      </footer>
    </div>
  );
};

export default App;
