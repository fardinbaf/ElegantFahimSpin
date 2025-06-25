import React from 'react';
import { CustomTrophyIcon } from './icons'; // Changed TrophyIcon to CustomTrophyIcon

interface WinnersListProps {
  winners: string[];
  onClearWinners: () => void;
}

const WinnersList: React.FC<WinnersListProps> = ({ winners, onClearWinners }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-xl max-w-2xl mx-auto custom-shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-700 flex items-center">
          <CustomTrophyIcon className="w-7 h-7 mr-2 text-yellow-500" /> {/* Changed here */}
          Winners History
        </h2>
        {winners.length > 0 && (
           <button
           onClick={onClearWinners}
           className="bg-red-500 text-white font-medium py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors text-sm"
         >
           Clear History
         </button>
        )}
      </div>
      {winners.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No winners yet. Spin the wheel to select one!</p>
      ) : (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {winners.map((winner, index) => (
            <li
              key={index}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-slate-700 font-medium text-lg break-all">{winner}</span>
              <span className="text-sm text-slate-400">Winner #{winners.length - index}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WinnersList;
