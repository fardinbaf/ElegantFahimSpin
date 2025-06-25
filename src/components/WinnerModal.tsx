import React from 'react';
import { CustomTrophyIcon, XMarkIcon, ArrowPathIcon as RegenerateIcon } from './icons'; // Changed TrophyIcon to CustomTrophyIcon

interface WinnerModalProps {
  winnerName: string | null;
  onClose: () => void;
  onRemoveWinnerAndSpinAgain: () => void;
  canRemoveWinner: boolean;
  aiStory: string | null;
  isGeneratingStory: boolean;
  storyError: string | null;
  onRegenerateStory?: () => void;
  apiKeyAvailable: boolean;
}

const WinnerModal: React.FC<WinnerModalProps> = ({
  winnerName,
  onClose,
  onRemoveWinnerAndSpinAgain,
  canRemoveWinner,
  aiStory,
  isGeneratingStory,
  storyError,
  onRegenerateStory,
  apiKeyAvailable,
}) => {
  if (!winnerName) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 sm:p-8 rounded-xl shadow-2xl text-center max-w-md w-full transform transition-all duration-300 ease-in-out scale-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-purple-200 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <XMarkIcon className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <CustomTrophyIcon className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 text-yellow-400" />
        <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">Congratulations!</h2>
        <p className="text-4xl sm:text-5xl font-bold mb-4 sm:mb-6 break-words px-2">{winnerName}</p>

        {apiKeyAvailable && (
          <div className="my-4 sm:my-6 p-3 bg-purple-700 bg-opacity-50 rounded-lg min-h-[60px] flex flex-col justify-center items-center">
            {isGeneratingStory && (
              <div className="flex items-center text-purple-200">
                <RegenerateIcon className="w-5 h-5 mr-2 animate-spin" />
                <span>Generating a special message...</span>
              </div>
            )}
            {storyError && !isGeneratingStory && (
              <p className="text-red-300 text-sm">{storyError}</p>
            )}
            {aiStory && !isGeneratingStory && !storyError && (
              <p className="text-purple-100 italic text-sm sm:text-base leading-relaxed">"{aiStory}"</p>
            )}
            {(!aiStory && !isGeneratingStory && !storyError && onRegenerateStory) && (
                 <button
                    onClick={onRegenerateStory}
                    disabled={isGeneratingStory}
                    className="mt-2 bg-yellow-400 text-purple-700 font-semibold py-1.5 px-3 rounded-md hover:bg-yellow-300 text-xs sm:text-sm flex items-center"
                >
                    <RegenerateIcon className={`w-4 h-4 mr-1.5 ${isGeneratingStory ? 'animate-spin' : ''}`} />
                    Get AI Celebration!
                </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full bg-yellow-400 text-purple-700 font-semibold py-2.5 sm:py-3 px-6 rounded-lg hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-600 focus:ring-yellow-400 transition-colors text-md sm:text-lg"
          >
            Awesome!
          </button>
          {canRemoveWinner && (
            <button
              onClick={onRemoveWinnerAndSpinAgain}
              className="w-full bg-transparent border-2 border-purple-300 text-purple-200 font-semibold py-2.5 sm:py-3 px-6 rounded-lg hover:bg-purple-300 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-600 focus:ring-purple-300 transition-colors text-md sm:text-lg"
            >
              Spin Again
            </button>
          )}
           {apiKeyAvailable && aiStory && !isGeneratingStory && onRegenerateStory && (
             <button
                onClick={onRegenerateStory}
                disabled={isGeneratingStory}
                className="w-full bg-purple-400 bg-opacity-50 text-white font-medium py-2 sm:py-2.5 px-4 rounded-lg hover:bg-purple-500 hover:bg-opacity-60 transition-colors text-xs sm:text-sm flex items-center justify-center"
                aria-label="Regenerate AI story"
            >
                <RegenerateIcon className={`w-4 h-4 mr-1.5 ${isGeneratingStory ? 'animate-spin' : ''}`} />
                Try another message
            </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;
