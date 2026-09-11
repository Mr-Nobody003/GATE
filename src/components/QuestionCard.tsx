"use client";

import { useState, useEffect } from "react";
import 'katex/dist/katex.min.css';
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { ParsedQuestion, AnswerNAT } from "@/lib/data";

export default function QuestionCard({ question }: { question: ParsedQuestion }) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [natInput, setNatInput] = useState<string>("");
  const [descInput, setDescInput] = useState<string>("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem(`q_state_${question.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setIsRevealed(parsed.isRevealed);
      setSelectedOptions(parsed.selectedOptions || []);
      setNatInput(parsed.natInput || "");
      setDescInput(parsed.descInput || "");
    }
  }, [question.id]);

  const saveState = (newState: any) => {
    localStorage.setItem(`q_state_${question.id}`, JSON.stringify({
      isRevealed: newState.isRevealed !== undefined ? newState.isRevealed : isRevealed,
      selectedOptions: newState.selectedOptions !== undefined ? newState.selectedOptions : selectedOptions,
      natInput: newState.natInput !== undefined ? newState.natInput : natInput,
      descInput: newState.descInput !== undefined ? newState.descInput : descInput,
    }));
  };

  const toggleOption = (optIndex: number) => {
    if (isRevealed) return;
    const letter = String.fromCharCode(65 + optIndex);
    
    let newSelected: string[];
    if (question.qtype === "MSQ") {
      newSelected = selectedOptions.includes(letter)
        ? selectedOptions.filter(o => o !== letter)
        : [...selectedOptions, letter].sort();
    } else {
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
    if (question.qtype === "descriptive") {
      // Descriptive answers cannot be automatically evaluated.
      // Returning false for now, but we will hide the Correct/Incorrect badge for descriptive types.
      return false; 
    }

    if (!question.answer) return false;
    
    if (question.qtype === "NAT") {
      const ans = question.answer as AnswerNAT;
      const val = parseFloat(natInput);
      if (isNaN(val)) return false;
      return val >= ans.low && val <= ans.high;
    }
    
    if (question.qtype === "MSQ") {
      const ans = question.answer as string[];
      if (!ans || !Array.isArray(ans)) return false;
      if (selectedOptions.length !== ans.length) return false;
      return selectedOptions.every(opt => ans.includes(opt));
    }
    
    // MCQ
    const ansStr = typeof question.answer === 'string' ? question.answer : String(question.answer);
    const correctOpts = ansStr.split(";").map(s => s.trim());
    return selectedOptions.length > 0 && selectedOptions.every(opt => correctOpts.includes(opt));
  };

  if (!isClient) return <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 animate-pulse h-64"></div>;

  const isCorrect = isRevealed && checkCorrectness();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(question.question_text.substring(0, 150))}`;

  let borderColor = "border-neutral-200 dark:border-neutral-800";
  if (isRevealed) {
    borderColor = isCorrect ? "border-emerald-500/50 dark:border-emerald-500/40 shadow-lg shadow-emerald-500/10" : "border-rose-500/50 dark:border-rose-500/40 shadow-lg shadow-rose-500/10";
  }

  const isMSQ = question.qtype === "MSQ";
  const isNAT = question.qtype === "NAT";

  return (
    <div className={`p-6 sm:p-8 rounded-3xl border ${borderColor} bg-white/70 dark:bg-neutral-900/40 backdrop-blur-xl shadow-sm space-y-6 transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm border border-indigo-200 dark:border-indigo-500/30">
          Q. {question.id}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold tracking-wider uppercase bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
          {question.qtype}
        </span>
      </div>
      
      <div className="text-lg text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
        <ReactMarkdown 
          remarkPlugins={[remarkMath]} 
          rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
          components={{
            img: ({node, ...props}) => <img style={{maxWidth: '100%', height: 'auto', display: 'block', margin: '1.5rem auto', borderRadius: '0.5rem'}} {...props} />
          }}
        >
          {question.question_text}
        </ReactMarkdown>
      </div>

      {!isNAT && question.options && question.options.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedOptions.includes(letter);
            
            let btnClass = "text-left p-4 border rounded-2xl transition-all duration-200 group relative overflow-hidden ";
            
            if (!isRevealed) {
              btnClass += isSelected 
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 shadow-sm" 
                : "border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50 text-neutral-700 dark:text-neutral-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-neutral-50 dark:hover:bg-neutral-900";
            } else {
              let isCorrectOpt = false;
              if (question.qtype === "MSQ") {
                isCorrectOpt = Array.isArray(question.answer) && question.answer.includes(letter);
              } else {
                const ansStr = typeof question.answer === 'string' ? question.answer : String(question.answer);
                isCorrectOpt = ansStr.split(";").map(s => s.trim()).includes(letter);
              }

              if (isCorrectOpt) {
                btnClass += "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-medium shadow-sm"; 
              } else if (isSelected && !isCorrectOpt) {
                btnClass += "border-rose-500 bg-rose-50 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200"; 
              } else {
                btnClass += "border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-950/20 text-neutral-400 dark:text-neutral-600 opacity-60";
              }
            }

            return (
              <button 
                key={i} 
                className={btnClass}
                onClick={() => toggleOption(i)}
                disabled={isRevealed}
              >
                <div className="flex items-start">
                  <div className={`flex items-center justify-center w-6 h-6 mr-3 mt-0.5 rounded-md border text-xs font-bold transition-colors ${
                    isSelected && !isRevealed ? "bg-indigo-500 border-indigo-500 text-white" : 
                    isRevealed && (Array.isArray(question.answer) ? question.answer.includes(letter) : String(question.answer).split(";").map(s => s.trim()).includes(letter)) ? "bg-emerald-500 border-emerald-500 text-white" :
                    isRevealed && isSelected ? "bg-rose-500 border-rose-500 text-white" :
                    "border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 group-hover:border-indigo-400"
                  } ${isMSQ ? "rounded-md" : "rounded-full"}`}>
                    {letter}
                  </div>
                  <div className="flex-1 text-[0.95rem]">
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]} 
                      rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
                    >
                      {opt}
                    </ReactMarkdown>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isNAT && (
        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Enter your numerical answer:
          </label>
          <input 
            type="number"
            step="any"
            className={`w-full max-w-md px-4 py-3 bg-white dark:bg-neutral-950 border rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 ${
              !isRevealed 
                ? "border-neutral-300 dark:border-neutral-700 focus:border-indigo-500 focus:ring-indigo-500/20 text-neutral-900 dark:text-neutral-100" 
                : isCorrect 
                  ? "border-emerald-500 text-emerald-700 dark:text-emerald-400 focus:ring-0 bg-emerald-50 dark:bg-emerald-950/30" 
                  : "border-rose-500 text-rose-700 dark:text-rose-400 focus:ring-0 bg-rose-50 dark:bg-rose-950/30"
            }`}
            placeholder="e.g. -42.5"
            value={natInput}
            onChange={(e) => {
              setNatInput(e.target.value);
              saveState({ natInput: e.target.value });
            }}
            disabled={isRevealed}
          />
        </div>
      )}

      {question.qtype === "descriptive" && (
        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Draft your answer here:
          </label>
          <textarea 
            rows={5}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 text-neutral-900 dark:text-neutral-100 disabled:opacity-75"
            placeholder="Type your descriptive answer..."
            value={descInput}
            onChange={(e) => {
              setDescInput(e.target.value);
              saveState({ descInput: e.target.value });
            }}
            disabled={isRevealed}
          />
        </div>
      )}

      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
        {!isRevealed ? (
          <button 
            onClick={submitAnswer}
            disabled={(!isNAT && question.qtype !== "descriptive" && selectedOptions.length === 0) || (isNAT && natInput === "")}
            className="px-6 py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-white transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            Check Answer
          </button>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col">
              {question.qtype !== "descriptive" && (
                <div className="flex items-center gap-2">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full ${isCorrect ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400'}`}>
                    {isCorrect ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </span>
                  <p className={`font-bold text-lg ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                </div>
              )}
              {question.qtype === "descriptive" && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">Review Solution</p>
                </div>
              )}
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1 font-medium">
                {question.answer ? (
                  question.qtype === "NAT" ? 
                    `Correct Answer: ${(question.answer as AnswerNAT).low === (question.answer as AnswerNAT).high ? (question.answer as AnswerNAT).low : `${(question.answer as AnswerNAT).low} to ${(question.answer as AnswerNAT).high}`}`
                  : question.qtype === "MSQ" ?
                    `Correct Answer: ${(question.answer as string[]).join(", ")}`
                  : question.qtype === "descriptive" ?
                    `Official Solution Reference:`
                  : `Correct Answer: ${question.answer}`
                ) : 'No Answer Available'}
              </p>
            </div>
            
            {question.solution ? (
              <div className="text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}>{question.solution}</ReactMarkdown>
              </div>
            ) : (
              <a 
                href={searchUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 text-sm font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg transition-colors flex items-center gap-2 border border-neutral-200 dark:border-neutral-700"
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
