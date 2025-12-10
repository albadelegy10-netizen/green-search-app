import React, { useState, useEffect } from 'react';
import { SearchResponse } from '../types';
import { SparklesIcon, DownloadIcon, FileTextIcon, SpeakerIcon, StopIcon } from './Icons';

interface ResultDisplayProps {
  data: SearchResponse;
}

// Utility to clean LaTeX math to Unicode and remove dollar signs
const cleanMathAndFormat = (text: string): string => {
    let s = text;
    // Remove dollar signs (display and inline math delimiters)
    s = s.replace(/\$/g, '');

    // Fractions: \frac{a}{b} -> (a)/(b)
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');
    
    // Superscripts (digits, common chars)
    const supers: {[key: string]: string} = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','(':'⁽',')':'⁾','n':'ⁿ','x':'ˣ'};
    s = s.replace(/\^([0-9+\-()nx]+)/g, (_, match) => match.split('').map((c: string) => supers[c] || c).join(''));
    s = s.replace(/\^\{([0-9+\-()nx]+)\}/g, (_, match) => match.split('').map((c: string) => supers[c] || c).join(''));

    // Subscripts
    const subs: {[key: string]: string} = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'⁺','-':'⁻','(':'₍',')':'₎','a':'ₐ','e':'ₑ','o':'ₒ','x':'ₓ'};
    s = s.replace(/_([0-9+\-()aeox]+)/g, (_, match) => match.split('').map((c: string) => subs[c] || c).join(''));
    s = s.replace(/_\{([0-9+\-()aeox]+)\}/g, (_, match) => match.split('').map((c: string) => subs[c] || c).join(''));

    // Text formatting commands cleanup
    s = s.replace(/\\text\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathit\{([^}]+)\}/g, '$1');
    
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
        [/\\sqrt/g, '√']
    ];

    replacements.forEach(([regex, sub]) => {
        s = s.replace(regex, sub);
    });

    return s;
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ data }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speaking when component unmounts or data changes
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    return () => {
        window.speechSynthesis.cancel();
    };
  }, [data]);

  const parseInline = (text: string, keyPrefix: string) => {
    // Splits text by bold (**...**), italics (*...*), and citations ([1, 2]).
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[\d+(?:,\s*\d+)*\])/g);
    
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
             return <strong key={`${keyPrefix}-${idx}`} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
             return <em key={`${keyPrefix}-${idx}`} className="italic text-gray-800">{part.slice(1, -1)}</em>;
        }
        if (/^\[\d+(?:,\s*\d+)*\]$/.test(part)) {
            return (
                <sup key={`${keyPrefix}-${idx}`} className="text-green-600 font-bold text-xs ml-0.5 cursor-default select-none">
                    {part}
                </sup>
            );
        }
        return part;
    });
  };

  const renderContent = () => {
    // First clean the math and formatting
    const cleanText = cleanMathAndFormat(data.text).replace(/\r\n/g, '\n');
    const lines = cleanText.split('\n');
    const elements: React.ReactNode[] = [];
    
    let currentList: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;
    
    // Helper to flush current list items into a container
    const flushList = (idx: number) => {
        if (currentList.length > 0 && listType) {
            const ListTag = listType;
            elements.push(
                <ListTag key={`list-${idx}`} className={`pl-5 mb-4 space-y-1 ${listType === 'ul' ? 'list-disc' : 'list-decimal'}`}>
                    {currentList}
                </ListTag>
            );
            currentList = [];
            listType = null;
        }
    };

    lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();
        
        // Handle empty lines
        if (!trimmed) {
            flushList(lineIdx);
            // Only add visual break if not at extremes to avoid large gaps
            if (lineIdx > 0 && lineIdx < lines.length - 1) {
                elements.push(<br key={`br-${lineIdx}`} />);
            }
            return;
        }

        // Headers
        if (trimmed.startsWith('# ')) {
            flushList(lineIdx);
            elements.push(<h1 key={`h1-${lineIdx}`} className="text-2xl font-bold text-gray-900 mt-6 mb-3">{parseInline(trimmed.slice(2), `h1-${lineIdx}`)}</h1>);
            return;
        }
        if (trimmed.startsWith('## ')) {
            flushList(lineIdx);
            elements.push(<h2 key={`h2-${lineIdx}`} className="text-xl font-bold text-gray-900 mt-5 mb-2">{parseInline(trimmed.slice(3), `h2-${lineIdx}`)}</h2>);
            return;
        }
        if (trimmed.startsWith('### ')) {
            flushList(lineIdx);
            elements.push(<h3 key={`h3-${lineIdx}`} className="text-lg font-bold text-gray-900 mt-4 mb-2">{parseInline(trimmed.slice(4), `h3-${lineIdx}`)}</h3>);
            return;
        }

        // Lists (Unordered * or -, Ordered 1.)
        const isUl = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const isOl = /^\d+\.\s/.test(trimmed);

        if (isUl || isOl) {
            const currentLineType = isUl ? 'ul' : 'ol';
            
            // If list type changes (e.g. from ul to ol), flush previous
            if (listType && listType !== currentLineType) {
                flushList(lineIdx);
            }
            listType = currentLineType;
            
            // Remove marker
            const content = isUl ? trimmed.slice(2) : trimmed.replace(/^\d+\.\s/, '');
            currentList.push(
                <li key={`li-${lineIdx}`} className="text-gray-800 leading-relaxed pl-1">
                    {parseInline(content, `li-${lineIdx}`)}
                </li>
            );
        } else {
            // Regular paragraph
            flushList(lineIdx);
            elements.push(
                <p key={`p-${lineIdx}`} className="mb-4 leading-relaxed text-gray-800">
                    {parseInline(trimmed, `p-${lineIdx}`)}
                </p>
            );
        }
    });

    // Final flush
    flushList(lines.length);
    return elements;
  };

  const handleDownloadText = () => {
    const element = document.createElement("a");
    const file = new Blob([data.text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "gemini-search-result.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    } else {
        // Prepare text for speech by removing formatting symbols
        let speechText = cleanMathAndFormat(data.text);
        speechText = speechText
            .replace(/\*\*/g, '') 
            .replace(/\*/g, '')
            .replace(/#/g, '')
            .replace(/\[\d+(?:,\s*\d+)*\]/g, ''); // Remove citations for speech

        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'en-US';
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Answer Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 print-content">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <SparklesIcon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">AI Overview</h2>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 no-print">
                <button 
                    onClick={toggleSpeech}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                        isSpeaking 
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                    title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                >
                    {isSpeaking ? <StopIcon className="w-4 h-4" /> : <SpeakerIcon className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Listen'}</span>
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                <button 
                    onClick={handleDownloadText}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    title="Download as Text"
                >
                    <FileTextIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Text</span>
                </button>
                <button 
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    title="Print / Save as PDF"
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF</span>
                </button>
            </div>
          </div>
          
          <div className="prose prose-green max-w-none text-base sm:text-lg">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};