"use client";

import { useState, useEffect } from "react";
import 'katex/dist/katex.min.css';
import Latex from "react-latex-next";

type Question = {
  id: string;
  type: string;
  marks: string;
  question_text: string;
  options?: string[];
  explanation_url?: string | null;
};

export default function QuestionCard({ question, answer }: { question: Question; answer?: string }) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [natValue, setNatValue] = useState<string>("");
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
      setNatValue(parsed.natValue || "");
    }
  }, [question.id]);

  const saveState = (newState: any) => {
    localStorage.setItem(`q_state_${question.id}`, JSON.stringify({
      isRevealed: newState.isRevealed !== undefined ? newState.isRevealed : isRevealed,
      selectedOptions: newState.selectedOptions !== undefined ? newState.selectedOptions : selectedOptions,
      natValue: newState.natValue !== undefined ? newState.natValue : natValue,
    }));
  };

  const toggleOption = (optIndex: number) => {
    if (isRevealed) return;
    const letter = String.fromCharCode(65 + optIndex);
    
    let newSelected;
    if (question.type === "MSQ") {
      newSelected = selectedOptions.includes(letter)
        ? selectedOptions.filter(o => o !== letter)
        : [...selectedOptions, letter];
    } else {
      // MCQ
      newSelected = [letter];
    }
    
    setSelectedOptions(newSelected);
    saveState({ selectedOptions: newSelected });
  };

  const submitAnswer = () => {
    setIsRevealed(true);
    saveState({ isRevealed: true });
  };
  
  const checkCorrectness = () => {
    if (!answer) return false;
    
    if (question.type === "MCQ" || question.type === "MSQ") {
      const correctOpts = answer.split(";").map(s => s.trim());
      if (selectedOptions.length !== correctOpts.length) return false;
      return selectedOptions.every(opt => correctOpts.includes(opt));
    }
    if (question.type === "NAT") {
      const val = parseFloat(natValue);
      if (isNaN(val)) return false;
      
      if (answer.includes(":")) {
        const [low, high] = answer.split(":").map(parseFloat);
        return val >= low && val <= high;
      }
      return val === parseFloat(answer);
    }
    return false;
  };

  if (!isClient) return <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 animate-pulse h-64"></div>;

  const isCorrect = isRevealed && checkCorrectness();

  return (
    <div className={`p-6 rounded-xl border ${isRevealed ? (isCorrect ? 'border-green-500/50' : 'border-red-500/50') : 'border-neutral-800'} bg-neutral-900/50 space-y-6 transition-colors`}>
      <div className="flex items-center justify-between">
        <span className="bg-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded font-medium">
          {question.id}
        </span>
        <span className="text-xs text-neutral-500 font-medium tracking-wide uppercase">
          {question.type} • {question.marks} Mark(s)
        </span>
      </div>
      
      <div className="text-lg text-neutral-200 leading-relaxed">
        <Latex>{question.question_text}</Latex>
      </div>

      {(question.type === "MCQ" || question.type === "MSQ") && question.options && (
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
              const isCorrectOpt = answer?.split(";").map(s => s.trim()).includes(letter);
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

      {question.type === "NAT" && (
        <div className="space-y-3">
          <input 
            type="number"
            step="any"
            value={natValue}
            onChange={(e) => {
              setNatValue(e.target.value);
              saveState({ natValue: e.target.value });
            }}
            disabled={isRevealed}
            placeholder="Type your numerical answer..."
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </div>
      )}

      <div className="pt-4 border-t border-neutral-800 flex justify-between items-center">
        {!isRevealed ? (
          <button 
            onClick={submitAnswer}
            className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Submit Answer
          </button>
        ) : (
          <div className="flex-1 flex justify-between items-center">
            <p className={`font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? "Correct!" : `Incorrect. Answer: ${answer}`}
            </p>
            {question.explanation_url && (
              <a 
                href={question.explanation_url} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-md transition-colors"
              >
                View Discussion
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
