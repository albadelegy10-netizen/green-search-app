import React, { useState } from 'react';
import { QuizConfig, ExamStyle, Difficulty } from '../types';
import { BrainIcon, SparklesIcon, TimerIcon } from './Icons';

interface QuizSetupProps {
  onStart: (config: QuizConfig) => void;
  isLoading: boolean;
}

export const QuizSetup: React.FC<QuizSetupProps> = ({ onStart, isLoading }) => {
  const [topic, setTopic] = useState('');
  const [examStyle, setExamStyle] = useState<ExamStyle>('SAT1');
  const [difficulty, setDifficulty] = useState<Difficulty>('Mixed');
  const [questionCount, setQuestionCount] = useState(5);
  const [timerEnabled, setTimerEnabled] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If Custom style is selected, topic is mandatory. Otherwise use default if empty.
    const finalTopic = topic.trim();
    if (examStyle === 'Custom' && !finalTopic) {
        alert("Please enter a topic for your custom quiz.");
        return;
    }

    onStart({
      topic: finalTopic || `General ${examStyle} Practice`,
      examStyle,
      difficulty,
      questionCount,
      timerEnabled
    });
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-4">
              <BrainIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create Interactive Quiz</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Style</label>
                <select
                  value={examStyle}
                  onChange={(e) => setExamStyle(e.target.value as ExamStyle)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                >
                  <option value="SAT1">SAT 1</option>
                  <option value="EST1">EST 1</option>
                  <option value="ACT1">ACT 1</option>
                  <option value="EST2">EST 2</option>
                  <option value="ACT2">ACT 2</option>
                  <option value="Custom">Custom Topic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                >
                  <option value="Mixed">Mixed</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic {examStyle === 'Custom' ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={examStyle === 'Custom' ? "e.g. Quantum Physics, History of Rome..." : "e.g. Algebra, Reading Comprehension..."}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                required={examStyle === 'Custom'}
              />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={30}>30 Questions</option>
                </select>
            </div>

            <div 
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${timerEnabled ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setTimerEnabled(!timerEnabled)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${timerEnabled ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <TimerIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <span className={`block font-medium ${timerEnabled ? 'text-green-900' : 'text-gray-900'}`}>Timer Mode</span>
                        <span className={`text-xs ${timerEnabled ? 'text-green-600' : 'text-gray-500'}`}>90 seconds per question</span>
                    </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${timerEnabled ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                    {timerEnabled && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/40 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Quiz...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Start Quiz
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};