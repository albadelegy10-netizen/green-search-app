import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, QuizConfig } from '../types';
import { CheckIcon, XIcon, ArrowRightIcon, BrainIcon, TimerIcon, RefreshIcon, DownloadIcon, FileCheckIcon, FileTextIcon } from './Icons';

interface QuizGameProps {
  questions: QuizQuestion[];
  config: QuizConfig;
  onExit: () => void;
  onComplete?: (score: number, userAnswers: (number | null)[]) => void;
  initialUserAnswers?: (number | null)[];
}

// Utility to clean LaTeX math to Unicode and remove dollar signs
const cleanMathAndFormat = (text: string): string => {
    let s = text || "";
    // Remove dollar signs (display and inline math delimiters)
    s = s.replace(/\$/g, '');

    // Fractions: \frac{a}{b} -> (a)/(b)
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');
    
    // Superscripts (digits, common chars)
    const supers: {[key: string]: string} = {
        '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
        '+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ','x':'ˣ','y':'ʸ','z':'ᶻ'
    };
    // Handle ^{...}
    s = s.replace(/\^\{([^{}]+)\}/g, (_, match) => match.split('').map((c: string) => supers[c] || c).join(''));
    // Handle ^Char (single digit/char)
    s = s.replace(/\^([0-9+\-()nxyz])/g, (_, match) => match.split('').map((c: string) => supers[c] || c).join(''));

    // Subscripts
    const subs: {[key: string]: string} = {
        '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
        '+':'₊','-':'₋','=':'₌','(':'₍',')':'₎','a':'ₐ','e':'ₑ','x':'ₓ'
    };
    s = s.replace(/_\{([^{}]+)\}/g, (_, match) => match.split('').map((c: string) => subs[c] || c).join(''));
    s = s.replace(/_([0-9+\-()aex])/g, (_, match) => match.split('').map((c: string) => subs[c] || c).join(''));

    // Text formatting commands cleanup
    s = s.replace(/\\text\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathit\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
    
    // Common Symbols Map
    const replacements: [RegExp, string][] = [
        [/\\times/g, '×'], [/\\div/g, '÷'], [/\\cdot/g, '·'], [/\\pm/g, '±'], [/\\mp/g, '∓'],
        [/\\approx/g, '≈'], [/\\neq/g, '≠'], [/\\leq/g, '≤'], [/\\geq/g, '≥'], [/\\infty/g, '∞'],
        [/\\rightarrow/g, '→'], [/\\leftarrow/g, '←'], [/\\leftrightarrow/g, '↔'], [/\\Rightarrow/g, '⇒'],
        [/\\forall/g, '∀'], [/\\exists/g, '∃'], [/\\in/g, '∈'], [/\\notin/g, '∉'],
        [/\\subset/g, '⊂'], [/\\subseteq/g, '⊆'], [/\\cup/g, '∪'], [/\\cap/g, '∩'],
        [/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\\gamma/g, 'γ'], [/\\delta/g, 'δ'], [/\\epsilon/g, 'ε'],
        [/\\zeta/g, 'ζ'], [/\\eta/g, 'η'], [/\\theta/g, 'θ'], [/\\lambda/g, 'λ'], [/\\mu/g, 'μ'],
        [/\\nu/g, 'ν'], [/\\xi/g, 'ξ'], [/\\pi/g, 'π'], [/\\rho/g, 'ρ'], [/\\sigma/g, 'σ'],
        [/\\tau/g, 'τ'], [/\\phi/g, 'φ'], [/\\chi/g, 'χ'], [/\\psi/g, 'ψ'], [/\\omega/g, 'ω'],
        [/\\Delta/g, 'Δ'], [/\\Sigma/g, 'Σ'], [/\\Omega/g, 'Ω'],
        [/\\sqrt/g, '√'], [/\\circ/g, '°'], [/\\angle/g, '∠']
    ];

    replacements.forEach(([regex, sub]) => {
        s = s.replace(regex, sub);
    });

    return s;
};

export const QuizGame: React.FC<QuizGameProps> = ({ 
  questions: initialQuestions, 
  config, 
  onExit,
  onComplete,
  initialUserAnswers 
}) => {
  // We use local state for questions to handle "Retake Wrong" which filters the array
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Initialize state based on whether we are restoring a session or starting new
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(
    initialUserAnswers || new Array(initialQuestions.length).fill(null)
  );
  
  const [submittedStatus, setSubmittedStatus] = useState<boolean[]>(
    initialUserAnswers 
      ? new Array(initialQuestions.length).fill(true) 
      : new Array(initialQuestions.length).fill(false)
  );
  
  const [timeLeft, setTimeLeft] = useState(initialQuestions.length * 90);
  const [isFinished, setIsFinished] = useState(!!initialUserAnswers);
  
  // Ref to prevent double saving
  const hasSavedRef = useRef(!!initialUserAnswers);

  // Sync activeQuestions if props change (e.g. new quiz generated from parent)
  // But ONLY if we aren't currently tracking a retake subset (lengths match)
  useEffect(() => {
     if (!isFinished && initialQuestions.length !== activeQuestions.length && initialQuestions.length > 0) {
         setActiveQuestions(initialQuestions);
         setUserAnswers(new Array(initialQuestions.length).fill(null));
         setSubmittedStatus(new Array(initialQuestions.length).fill(false));
         setTimeLeft(initialQuestions.length * 90);
     }
  }, [initialQuestions]);

  const currentQuestion = activeQuestions[currentIndex];
  const currentSelected = userAnswers[currentIndex];
  const isCurrentSubmitted = submittedStatus[currentIndex];

  const calculateScore = (answers: (number | null)[]) => {
    return answers.reduce((acc, answer, idx) => {
      if (answer === activeQuestions[idx].answerIndex) return (acc || 0) + 1;
      return acc || 0;
    }, 0) || 0;
  };

  // Timer logic
  useEffect(() => {
    if (isFinished || !config.timerEnabled) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, config.timerEnabled]);

  // Handle saving when finished
  useEffect(() => {
    // We only save to history if it's a full quiz run, not a partial retake
    const isFullRun = activeQuestions.length === initialQuestions.length;
    if (isFinished && !hasSavedRef.current && onComplete && isFullRun) {
      hasSavedRef.current = true;
      const score = calculateScore(userAnswers);
      onComplete(score, userAnswers);
    }
  }, [isFinished, userAnswers, onComplete, activeQuestions.length, initialQuestions.length]);

  // Select an option (only if not submitted)
  const handleOptionSelect = (index: number) => {
    if (isCurrentSubmitted) return;
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = index;
    setUserAnswers(newAnswers);
  };

  // Submit the current question (Interactive Mode)
  const handleSubmitQuestion = () => {
    if (currentSelected === null) return;
    
    const newSubmitted = [...submittedStatus];
    newSubmitted[currentIndex] = true;
    setSubmittedStatus(newSubmitted);
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const jumpToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  const finishQuiz = () => {
    // If timed mode, now we lock everything to show results
    setSubmittedStatus(new Array(activeQuestions.length).fill(true));
    setIsFinished(true);
  };

  // --- RETAKE LOGIC ---
  const handleRetakeAll = () => {
      setActiveQuestions(initialQuestions);
      setUserAnswers(new Array(initialQuestions.length).fill(null));
      setSubmittedStatus(new Array(initialQuestions.length).fill(false));
      setTimeLeft(initialQuestions.length * 90);
      setCurrentIndex(0);
      setIsFinished(false);
      hasSavedRef.current = false; // Reset save ref for new attempt
  };

  const handleRetakeWrong = () => {
      const wrongIndices = userAnswers
        .map((ans, idx) => (ans !== activeQuestions[idx].answerIndex ? idx : -1))
        .filter(idx => idx !== -1);
      
      if (wrongIndices.length === 0) return;

      const wrongQuestions = wrongIndices.map(idx => activeQuestions[idx]);
      
      setActiveQuestions(wrongQuestions);
      setUserAnswers(new Array(wrongQuestions.length).fill(null));
      setSubmittedStatus(new Array(wrongQuestions.length).fill(false));
      setTimeLeft(wrongQuestions.length * 90);
      setCurrentIndex(0);
      setIsFinished(false);
      // We generally don't save partial retakes to history to avoid duplicate stats spam
      hasSavedRef.current = true; 
  };

  // --- DOWNLOAD LOGIC ---
  const handlePrint = (withSolutions: boolean) => {
      const title = withSolutions ? `${config.topic} - Solution Key` : `${config.topic} - Quiz`;
      const date = new Date().toLocaleDateString();
      
      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { size: A4; margin: 2cm; }
              body { 
                font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                color: #1a202c; 
                line-height: 1.5;
                max-width: 800px;
                margin: 0 auto;
              }
              .header { 
                border-bottom: 2px solid #e2e8f0; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
              }
              h1 { color: #166534; margin: 0 0 10px 0; font-size: 24px; }
              .meta { color: #64748b; font-size: 14px; display: flex; gap: 20px; margin-bottom: 5px; }
              .question-card { 
                margin-bottom: 25px; 
                page-break-inside: avoid;
                border: 1px solid #f1f5f9;
                border-radius: 8px;
                padding: 15px;
              }
              .q-text { font-weight: 600; font-size: 16px; margin-bottom: 12px; }
              .options { margin-left: 15px; }
              .option { margin-bottom: 8px; font-size: 14px; }
              .explanation { 
                  margin-top: 15px; 
                  padding: 12px; 
                  background: #f0fdf4; 
                  border-left: 4px solid #22c55e;
                  font-size: 14px;
                  color: #166534;
              }
              .correct-badge {
                  display: inline-block;
                  background: #22c55e;
                  color: white;
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  margin-bottom: 4px;
                  font-weight: bold;
              }
              .footer { 
                margin-top: 50px; 
                text-align: center; 
                color: #94a3b8; 
                font-size: 12px; 
                border-top: 1px solid #e2e8f0; 
                padding-top: 20px; 
              }
              @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .question-card { border: none; padding: 0; margin-bottom: 30px; }
              }
            </style>
          </head>
          <body>
            <div class="header">
                <h1>${title}</h1>
                <div class="meta">
                    <span><strong>Date:</strong> ${date}</span>
                    <span><strong>Topic:</strong> ${config.topic}</span>
                </div>
                <div class="meta">
                    <span><strong>Style:</strong> ${config.examStyle}</span>
                    <span><strong>Difficulty:</strong> ${config.difficulty}</span>
                </div>
            </div>
            
            ${activeQuestions.map((q, i) => `
              <div class="question-card">
                <div class="q-text">${i + 1}. ${cleanMathAndFormat(q.question)}</div>
                <div class="options">
                  ${q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.answerIndex;
                    // If solutions enabled and this is correct, style it
                    const style = withSolutions && isCorrect ? 'color: #15803d; font-weight: 700;' : '';
                    const marker = withSolutions && isCorrect ? '✓ ' : '';
                    return `
                    <div class="option" style="${style}">
                      ${marker}${String.fromCharCode(65 + optIdx)}. ${cleanMathAndFormat(opt)}
                    </div>
                    `;
                  }).join('')}
                </div>
                ${withSolutions ? `
                    <div class="explanation">
                        <div class="correct-badge">EXPLANATION</div>
                        <div>${cleanMathAndFormat(q.explanation)}</div>
                    </div>
                ` : ''}
              </div>
            `).join('')}
            
            <div class="footer">
                Generated by Green Search AI
            </div>
            <script>
                window.onload = () => { setTimeout(() => window.print(), 500); };
            </script>
          </body>
        </html>
      `;
      
      const win = window.open('', '_blank');
      if (win) {
          win.document.write(content);
          win.document.close();
      } else {
          alert("Please allow popups to download the PDF.");
      }
  };

  // Styles helpers
  const getOptionStyle = (qIndex: number, optionIndex: number) => {
    const isSubmitted = submittedStatus[qIndex];
    const selected = userAnswers[qIndex];
    const correct = activeQuestions[qIndex].answerIndex;

    if (!isSubmitted) {
      // In Timed mode (playing), shows selection. 
      return selected === optionIndex
        ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50';
    }

    // After submission logic (Interactive check or Review mode)
    if (optionIndex === correct) {
      return 'border-green-500 bg-green-50 text-green-700';
    }
    if (selected === optionIndex && selected !== correct) {
      return 'border-red-500 bg-red-50 text-red-700';
    }
    return 'border-gray-200 opacity-50';
  };

  const getNavDotStyle = (idx: number) => {
    const isCurrent = idx === currentIndex;
    const isSubmitted = submittedStatus[idx];
    const hasAnswer = userAnswers[idx] !== null;

    let baseClasses = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all border-2 cursor-pointer ";
    
    if (isCurrent) {
        return baseClasses + "border-green-600 bg-green-600 text-white scale-110 shadow-md";
    }
    
    if (isSubmitted) {
        // If submitted, show if correct or wrong (mini feedback)
        const isCorrect = userAnswers[idx] === activeQuestions[idx].answerIndex;
        return baseClasses + (isCorrect 
            ? "border-green-500 bg-green-100 text-green-700" 
            : "border-red-500 bg-red-100 text-red-700");
    }

    if (hasAnswer) {
        // In timed mode playing, show we have answered but don't reveal correctness
        return baseClasses + "border-green-300 bg-green-50 text-green-700";
    }

    return baseClasses + "border-gray-200 text-gray-400 hover:border-gray-300";
  };

  // --- RESULTS SCREEN ---
  if (isFinished) {
    const score = calculateScore(userAnswers);
    const percentage = (score / activeQuestions.length) * 100;
    
    // Motivation Logic
    let title = "";
    let message = "";
    let emoji = "";

    if (percentage >= 85) {
        title = "Superstar Performance!";
        emoji = "🌟";
        message = "Incredible work! Eng Rabaa Farrag is very proud of you. You are my superstar student! Keep pushing the boundaries and aiming high!";
    } else if (percentage >= 60) {
        title = "Great Job!";
        emoji = "💪";
        message = "You're doing well and showing solid understanding. Keep practicing and reviewing your answers, and you'll master this topic in no time.";
    } else {
        title = "Good Effort!";
        emoji = "🌱";
        message = "Don't give up! Every mistake is a learning opportunity. Review the detailed explanations below, retake the quiz, and you'll see improvement.";
    }

    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in text-center pb-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 border border-gray-100 relative overflow-hidden">
          {/* Confetti / Decor Background if high score */}
          {percentage >= 85 && (
             <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-200 via-transparent to-transparent"></div>
          )}

          <div className="relative z-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">
                {emoji}
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
                {message}
            </p>
            
            <div className="flex justify-center items-center gap-4 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-2xl min-w-[120px] border border-gray-100">
                    <div className="text-3xl font-bold text-gray-900">{score} / {activeQuestions.length}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Score</div>
                </div>
                <div className={`text-center p-4 rounded-2xl min-w-[120px] border ${percentage >= 85 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`text-3xl font-bold ${percentage >= 85 ? 'text-green-600' : 'text-gray-900'}`}>{Math.round(percentage)}%</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Percentage</div>
                </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                 {/* Retake Options */}
                 <button
                   onClick={handleRetakeAll}
                   className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-green-200 transition-all"
                 >
                   <RefreshIcon className="w-4 h-4" />
                   Retake Full Quiz
                 </button>
                 
                 {percentage < 100 && (
                    <button
                        onClick={handleRetakeWrong}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-red-200 transition-all"
                    >
                        <RefreshIcon className="w-4 h-4 text-red-500" />
                        Retake Wrong Answers
                    </button>
                 )}

                 {/* Download Options */}
                 <button 
                    onClick={() => handlePrint(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-blue-200 transition-all"
                 >
                    <FileTextIcon className="w-4 h-4 text-blue-500" />
                    Download Questions (PDF)
                 </button>

                 <button 
                    onClick={() => handlePrint(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-green-200 transition-all"
                 >
                    <FileCheckIcon className="w-4 h-4 text-green-600" />
                    Download Solutions (PDF)
                 </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center border-t border-gray-100 pt-6">
                <button
                onClick={() => setIsFinished(false)}
                className="px-6 py-2.5 text-gray-500 hover:text-gray-900 font-medium transition-colors"
                >
                Review Answers Screen
                </button>
                <button 
                    onClick={onExit}
                    className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                >
                    Back to Home
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME UI ---
  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      
      {/* Top Bar: Timer & Finish */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2">
           <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600 shadow-sm">{config.examStyle}</span>
           <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600 shadow-sm capitalize">{config.difficulty}</span>
           {activeQuestions.length < initialQuestions.length && (
               <span className="px-3 py-1 rounded-full bg-red-50 border border-red-100 text-xs font-semibold text-red-600 shadow-sm">Retake Mode</span>
           )}
        </div>
        
        <div className="flex items-center gap-4">
             {config.timerEnabled && !initialUserAnswers && !isCurrentSubmitted && (
                <div className={`flex items-center gap-2 text-sm font-mono font-bold bg-white px-3 py-1 rounded-full border shadow-sm ${timeLeft < 30 ? 'text-red-500 border-red-100' : 'text-gray-700 border-gray-200'}`}>
                    <TimerIcon className="w-4 h-4" />
                    <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                </div>
            )}
            <button 
                onClick={finishQuiz}
                className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
            >
                {initialUserAnswers || isCurrentSubmitted ? 'Return to Summary' : 'End Quiz'}
            </button>
        </div>
      </div>

      {/* Navigation Bubbles */}
      <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex justify-center min-w-max gap-2 px-2">
            {activeQuestions.map((_, idx) => (
                <button 
                    key={idx} 
                    onClick={() => jumpToQuestion(idx)}
                    className={getNavDotStyle(idx)}
                >
                    {idx + 1}
                </button>
            ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative">
        <div className="p-6 sm:p-10">
            {/* Question Text */}
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-8 leading-relaxed">
                <span className="text-gray-400 mr-2 text-lg">#{currentIndex + 1}.</span>
                {cleanMathAndFormat(currentQuestion.question)}
            </h3>

            {/* Options */}
            <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx)}
                        disabled={isCurrentSubmitted}
                        className={`
                            w-full p-4 rounded-xl text-left border-2 transition-all duration-200 flex items-start gap-3 group relative
                            ${getOptionStyle(currentIndex, idx)}
                        `}
                    >
                        <div className={`
                            flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5
                            ${userAnswers[currentIndex] === idx || (isCurrentSubmitted && idx === currentQuestion.answerIndex) ? 'border-current' : 'border-gray-300 group-hover:border-gray-400'}
                        `}>
                            <span className="text-xs font-bold uppercase">{String.fromCharCode(65 + idx)}</span>
                        </div>
                        <span className="text-base sm:text-lg">{cleanMathAndFormat(option)}</span>
                        
                        {isCurrentSubmitted && idx === currentQuestion.answerIndex && (
                             <div className="absolute right-4 top-1/2 -translate-y-1/2"><CheckIcon className="w-6 h-6 text-green-600" /></div>
                        )}
                        {isCurrentSubmitted && userAnswers[currentIndex] === idx && idx !== currentQuestion.answerIndex && (
                             <div className="absolute right-4 top-1/2 -translate-y-1/2"><XIcon className="w-6 h-6 text-red-600" /></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="text-gray-500 hover:text-gray-900 font-medium px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    Previous
                </button>

                <div className="flex items-center gap-3">
                    {/* Control Flow: 
                        If Timed Mode & Not Submitted (Playing): Show Next/Finish, hide Check Answer.
                        If Untimed Mode & Not Submitted: Show Skip/Check Answer.
                        If Submitted (Reviewing/Done): Show Next/Finish.
                    */}
                    {!isCurrentSubmitted ? (
                        config.timerEnabled ? (
                            // Timed Mode Playing
                            <>
                                {currentIndex < activeQuestions.length - 1 ? (
                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                                    >
                                        Next <ArrowRightIcon className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={finishQuiz}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                                    >
                                        Finish Quiz
                                    </button>
                                )}
                            </>
                        ) : (
                            // Untimed Mode Playing
                            <>
                                <button
                                    onClick={handleNext}
                                    disabled={currentIndex === activeQuestions.length - 1} 
                                    className="px-5 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleSubmitQuestion}
                                    disabled={currentSelected === null}
                                    className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-500/20"
                                >
                                    Check Answer
                                </button>
                            </>
                        )
                    ) : (
                         <div className="flex-1">
                             {/* Submitted State (Untimed Check or Timed Review) */}
                             {currentIndex < activeQuestions.length - 1 ? (
                                 <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
                                 >
                                    Next Question <ArrowRightIcon className="w-4 h-4" />
                                 </button>
                             ) : (
                                <button
                                    onClick={finishQuiz}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                                 >
                                    Return to Summary
                                 </button>
                             )}
                         </div>
                    )}
                </div>
            </div>
            
            {/* Explanation Area - Shown only if current question is submitted (revealed) */}
            {isCurrentSubmitted && (
                 <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fade-in">
                    <div className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        <BrainIcon className="w-4 h-4 text-green-500" />
                        Explanation
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{cleanMathAndFormat(currentQuestion.explanation)}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};