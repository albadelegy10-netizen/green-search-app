import React, { useState, useEffect } from 'react';
import { SearchInput } from './components/SearchInput';
import { ResultDisplay } from './components/ResultDisplay';
import { QuizSetup } from './components/QuizSetup';
import { QuizGame } from './components/QuizGame';
import { HistorySidebar } from './components/HistorySidebar';
import { performSearch, generateQuiz } from './services/geminiService';
import { SearchState, QuizConfig, QuizQuestion, HistoryItem, QuizHistoryItem, SearchHistoryItem, Attachment } from './types';
import { SparklesIcon, BrainIcon, SearchIcon, MenuIcon } from './components/Icons';

type AppMode = 'search' | 'quiz';
type QuizStep = 'setup' | 'playing';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('search');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  
  // Search State
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    attachments: [],
    isLoading: false,
    data: null,
    error: null,
    hasSearched: false,
  });

  // Quiz State
  const [quizStep, setQuizStep] = useState<QuizStep>('setup');
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  
  // Quiz Restoration State
  const [restoredUserAnswers, setRestoredUserAnswers] = useState<(number | null)[] | undefined>(undefined);

  // Initialize History from LocalStorage
  useEffect(() => {
    const loadHistory = () => {
        try {
            const savedHistory = localStorage.getItem('greenSearchHistory');
            if (savedHistory) {
                const parsed = JSON.parse(savedHistory);
                // Migration: Add type='search' to old items that don't have a type
                const migrated = parsed.map((item: any) => ({
                ...item,
                type: item.type || 'search'
                })) as HistoryItem[];
                setHistory(migrated);
            }
        } catch (e) {
            console.error("Failed to parse history from local storage", e);
        } finally {
            setIsHistoryLoading(false);
        }
    };
    
    // Small timeout to allow UI to settle and show loader if necessary, 
    // though usually localStorage is instant. helpful if we move to async DB later.
    loadHistory();
  }, []);

  // Save History Helper
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('greenSearchHistory', JSON.stringify(newHistory));
  };

  // Search Handlers
  const handleSearch = async (query: string, attachments: Attachment[] = []) => {
    setSearchState(prev => ({ 
        ...prev, 
        query, 
        attachments,
        isLoading: true, 
        error: null, 
        hasSearched: true 
    }));

    try {
      const result = await performSearch(query, attachments);
      setSearchState(prev => ({ ...prev, isLoading: false, data: result }));
      
      // Add to History
      const newItem: SearchHistoryItem = {
        id: Date.now().toString(),
        type: 'search',
        query: query || (attachments.length ? `Analyze ${attachments.length} file(s)` : 'Empty search'),
        timestamp: Date.now(),
        data: result
      };
      const updatedHistory = [newItem, ...history];
      saveHistory(updatedHistory);

    } catch (err: any) {
      setSearchState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "Something went wrong while searching. Please try again later." 
      }));
    }
  };

  const handleNewChat = () => {
    setSearchState({
        query: '',
        attachments: [],
        isLoading: false,
        data: null,
        error: null,
        hasSearched: false,
    });
    // Reset quiz state
    exitQuiz();
    setMode('search');
  }

  const handleSelectHistory = (item: HistoryItem) => {
    if (item.type === 'search') {
        setMode('search');
        setSearchState({
            query: item.query,
            attachments: [], // History doesn't currently store attachments blob, just text context
            isLoading: false,
            data: item.data,
            error: null,
            hasSearched: true,
        });
        // Reset quiz state to ensure clean switch
        setRestoredUserAnswers(undefined);
    } else if (item.type === 'quiz') {
        setMode('quiz');
        setQuizConfig(item.config);
        setQuestions(item.questions);
        setRestoredUserAnswers(item.userAnswers);
        setQuizStep('playing');
    }
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    saveHistory(updatedHistory);
  };

  // Quiz Handlers
  const handleStartQuiz = async (config: QuizConfig) => {
      setQuizLoading(true);
      setQuizConfig(config);
      setRestoredUserAnswers(undefined); // Ensure we are starting fresh
      try {
          const generatedQuestions = await generateQuiz(config);
          setQuestions(generatedQuestions);
          setQuizStep('playing');
      } catch (err) {
          alert("Failed to generate quiz. Please try again.");
      } finally {
          setQuizLoading(false);
      }
  };

  const handleQuizComplete = (score: number, userAnswers: (number | null)[]) => {
      if (!quizConfig) return;

      const newItem: QuizHistoryItem = {
          id: Date.now().toString(),
          type: 'quiz',
          timestamp: Date.now(),
          topic: quizConfig.topic,
          score,
          totalQuestions: questions.length,
          examStyle: quizConfig.examStyle,
          difficulty: quizConfig.difficulty,
          config: quizConfig,
          questions: questions,
          userAnswers: userAnswers
      };

      const updatedHistory = [newItem, ...history];
      saveHistory(updatedHistory);
  };

  const exitQuiz = () => {
      setQuizStep('setup');
      setQuestions([]);
      setQuizConfig(null);
      setRestoredUserAnswers(undefined);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      
      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        history={history}
        isLoading={isHistoryLoading}
        onSelect={handleSelectHistory}
        onNewChat={handleNewChat}
        onDelete={handleDeleteHistory}
      />

      {/* Global Header */}
      <header className={`
        fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 transition-all duration-300
        ${mode === 'search' && !searchState.hasSearched ? 'bg-transparent border-transparent' : ''}
      `}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo Area */}
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-all"
                >
                  <MenuIcon className="w-6 h-6" />
                </button>

                <button onClick={handleNewChat} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-gradient-to-tr from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xl text-gray-900 hidden sm:block">Green search</span>
                </button>

                {/* Navigation Pills */}
                <div className="hidden sm:flex bg-gray-100/80 p-1 rounded-full border border-gray-200/50 ml-6">
                    <button 
                        onClick={() => { setMode('search'); setRestoredUserAnswers(undefined); }}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mode === 'search' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <SearchIcon className="w-4 h-4" />
                        Search
                    </button>
                    <button 
                        onClick={() => { setMode('quiz'); exitQuiz(); }}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mode === 'quiz' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <BrainIcon className="w-4 h-4" />
                        Quiz
                    </button>
                </div>
            </div>

            {/* Compact Search Bar in Header (only when in search mode and has searched) */}
            {mode === 'search' && searchState.hasSearched && (
                <div className="flex-1 max-w-xl mx-4 sm:mx-8 animate-fade-in">
                    <SearchInput 
                        onSearch={handleSearch} 
                        isLoading={searchState.isLoading} 
                        initialValue={searchState.query}
                        compact={true}
                    />
                </div>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12 relative flex flex-col">
        
        {/* SEARCH MODE */}
        {mode === 'search' && (
            <>
                 {/* Initial Center View */}
                <div className={`
                    absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-500
                    ${searchState.hasSearched ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'}
                `}>
                    <div className="w-full max-w-2xl px-4 pointer-events-auto text-center">
                        <div className="mb-8">
                            <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-100 animate-fade-in shadow-sm">
                                ✨ Hello! Ready to learn something amazing?
                            </div>

                            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
                                What can I help<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">you learn today?</span>
                            </h1>
                            <p className="text-lg text-gray-500 max-w-md mx-auto">
                                Your AI companion for smart searching and interactive learning. Let's make today productive!
                            </p>
                        </div>
                        <SearchInput onSearch={handleSearch} isLoading={searchState.isLoading} />
                         {/* Mobile Nav Switch */}
                        <div className="mt-8 sm:hidden flex justify-center">
                            <button 
                                onClick={() => { setMode('quiz'); exitQuiz(); }}
                                className="flex items-center gap-2 px-5 py-2 bg-white rounded-full border border-gray-200 text-gray-600 font-medium shadow-sm active:scale-95 transition-transform"
                            >
                                <BrainIcon className="w-4 h-4" />
                                Try Interactive Quiz
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results View */}
                <div className={`
                    transition-all duration-500
                    ${searchState.hasSearched ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}
                `}>
                    {searchState.error && (
                        <div className="max-w-3xl mx-auto p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            {searchState.error}
                        </div>
                    )}

                    {!searchState.error && searchState.isLoading && (
                        <div className="max-w-4xl mx-auto pt-8">
                            <div className="space-y-4 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                <div className="h-32 bg-gray-100 rounded-2xl mt-8"></div>
                            </div>
                        </div>
                    )}

                    {!searchState.error && !searchState.isLoading && searchState.data && (
                        <ResultDisplay data={searchState.data} />
                    )}
                </div>
            </>
        )}

        {/* QUIZ MODE */}
        {mode === 'quiz' && (
            <div className="animate-fade-in w-full">
                {quizStep === 'setup' ? (
                    <QuizSetup onStart={handleStartQuiz} isLoading={quizLoading} />
                ) : (
                    <QuizGame 
                        questions={questions} 
                        config={quizConfig!} 
                        onExit={exitQuiz}
                        onComplete={handleQuizComplete}
                        initialUserAnswers={restoredUserAnswers}
                    />
                )}
            </div>
        )}

      </main>
      
      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-100">
        <p>created by Eng Rabaa Farrag</p>
      </footer>
    </div>
  );
};

export default App;