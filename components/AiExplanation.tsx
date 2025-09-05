
import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { SparkleIcon } from './icons/SparkleIcon';

interface AiExplanationProps {
  explanation: string;
  onClear: () => void;
}

const AiExplanation: React.FC<AiExplanationProps> = ({ explanation, onClear }) => {
  // A simple markdown-like parser to add some basic formatting
  const renderContent = () => {
    // Split by one or more empty lines to create paragraphs/blocks
    const blocks = explanation.split(/\n\s*\n/); 
    
    return blocks.map((block, index) => {
      const trimmedBlock = block.trim();
      
      // Handle headings
      if (trimmedBlock.startsWith('# ')) {
        const content = trimmedBlock.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <h3 key={index} className="text-xl font-semibold text-white mt-4 mb-2" dangerouslySetInnerHTML={{ __html: content }}></h3>;
      }
      if (trimmedBlock.startsWith('## ')) {
        const content = trimmedBlock.substring(3).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <h4 key={index} className="text-lg font-semibold text-white mt-3 mb-1" dangerouslySetInnerHTML={{ __html: content }}></h4>;
      }
      
      // Handle list blocks
      if (trimmedBlock.startsWith('* ') || trimmedBlock.startsWith('- ')) {
        const items = trimmedBlock.split('\n').map((item, i) => {
          const content = item.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <li key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: content }}></li>;
        });
        return <ul key={index} className="list-disc pl-5 space-y-1 mb-3">{items}</ul>
      }
      
      // Handle paragraphs
      const content = trimmedBlock.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={index} className="mb-3" dangerouslySetInnerHTML={{ __html: content }}></p>;
    });
  };

  return (
    <div className="mt-6 bg-slate-800/60 p-6 rounded-lg border border-cyan-500/30 relative animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <SparkleIcon className="w-8 h-8 text-cyan-400 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-semibold text-white">AI-Powered Explanation</h3>
            <p className="text-slate-400 text-sm">Powered by Gemini</p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-slate-500 hover:text-red-400 transition-colors"
          aria-label="Clear explanation"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="text-slate-300 max-w-none">
        {renderContent()}
      </div>
    </div>
  );
};

export default AiExplanation;
