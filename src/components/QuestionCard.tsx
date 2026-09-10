"use client";

import { useState, useEffect } from "react";
import 'katex/dist/katex.min.css';
import Latex from "react-latex-next";
import { ParsedQuestion } from "@/lib/data";

export default function QuestionCard({ question }: { question: ParsedQuestion }) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Load state from localStorage
    const saved = localStorage.getItem(`q_state_${question.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setIsRevealed(parsed.isRevealed);
      setSelectedOptions(parsed.selectedOptions || []);
    }
  }, [question.id]);

  const saveState = (newState: any) => {
    localStorage.setItem(`q_state_${question.id}`, JSON.stringify({
      isRevealed: newState.isRevealed !== undefined ? newState.isRevealed : isRevealed,
      selectedOptions: newState.selectedOptions !== undefined ? newState.selectedOptions : selectedOptions,
    }));
  };

  const toggleOption = (optIndex: number) => {
    if (isRevealed) return;
    const letter = String.fromCharCode(65 + optIndex);
    
    // Default to MCQ logic
    const newSelected = [letter];
    
    setSelectedOptions(newSelected);
    saveState({ selectedOptions: newSelected });
  };

  const submitAnswer = () => {
    setIsRevealed(true);
    saveState({ isRevealed: true });
  };
  
  const checkCorrectness = () => {
    if (!question.answer) return false;
    const answer = question.answer;
    
    const correctOpts = answer.split(";").map(s => s.trim());
    if (selectedOptions.length !== correctOpts.length) return false;
    return selectedOptions.every(opt => correctOpts.includes(opt));
  };

  if (!isClient) return <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 animate-pulse h-64"></div>;

  const isCorrect = isRevealed && checkCorrectness();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(question.question_text.substring(0, 150))}`;

  return (
    <div className={`p-6 rounded-xl border ${isRevealed ? (isCorrect ? 'border-green-500/50' : 'border-red-500/50') : 'border-neutral-800'} bg-neutral-900/50 space-y-6 transition-colors`}>
      <div className="flex items-center justify-between">
        <span className="bg-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded font-medium">
          {question.id}
        </span>
        <span className="text-xs text-neutral-500 font-medium tracking-wide uppercase">
          PYQ
        </span>
      </div>
      
      <div className="text-lg text-neutral-200 leading-relaxed">
        <Latex>{question.question_text}</Latex>
      </div>

      {question.options && question.options.length > 0 && (
        <div className="grid gap-3">
          {question.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedOptions.includes(letter);
            
            let btnClass = "text-left p-4 border rounded-lg transition-all ";
            
            if (!isRevealed) {
              btnClass += isSelected 
                ? "border-blue-500 bg-blue-500/10 text-blue-200" 
                : "border-neutral-700 bg-neutral-950/50 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800";
            } else {
              const isCorrectOpt = question.answer?.split(";").map(s => s.trim()).includes(letter);
              if (isCorrectOpt) {
                btnClass += "border-green-500 bg-green-500/20 text-green-200"; // Correct answer is always green
              } else if (isSelected && !isCorrectOpt) {
                btnClass += "border-red-500 bg-red-500/20 text-red-200"; // Wrong selected is red
              } else {
                btnClass += "border-neutral-800 bg-neutral-950/20 text-neutral-500 opacity-50";
              }
            }

            return (
              <button 
                key={i} 
                className={btnClass}
                onClick={() => toggleOption(i)}
                disabled={isRevealed}
              >
                <span className="font-semibold mr-3">{letter}.</span> 
                <Latex>{opt}</Latex>
              </button>
            );
          })}
        </div>
      )}

      <div className="pt-4 border-t border-neutral-800 flex justify-between items-center">
        {!isRevealed ? (
          <button 
            onClick={submitAnswer}
            className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Reveal Answer
          </button>
        ) : (
          <div className="flex-1 flex justify-between items-center">
            <p className={`font-medium ${isCorrect ? 'text-green-400' : 'text-neutral-400'}`}>
              {question.answer ? `Answer: ${question.answer}` : 'No Answer Available'}
            </p>
            {question.solution ? (
              <div className="text-sm text-neutral-300"><Latex>{question.solution}</Latex></div>
            ) : (
              <a 
                href={searchUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
                Search Web
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
