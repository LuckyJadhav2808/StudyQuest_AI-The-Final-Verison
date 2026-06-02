import { useState, useCallback, useRef, useEffect } from 'react';
import { autocorrectWord, isMisspelled, getSpellingSuggestions, cleanWord, addToCustomDictionary } from '@/lib/spellcheck';

interface SpellingAssistantReturn {
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  handleSelect: (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  suggestions: string[];
  activeWord: string;
  replaceActiveWord: (replacement: string) => void;
  addActiveWordToDictionary: (word: string) => void;
}

export function useSpellingAssistant(
  value: string,
  onChange: (newValue: string) => void
): SpellingAssistantReturn {
  const [activeWord, setActiveWord] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeWordRange, setActiveWordRange] = useState<{ start: number; end: number } | null>(null);
  const elementRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Helper to find the word bounds around the cursor
  const getWordAtCursor = useCallback((text: string, cursorPos: number) => {
    if (!text || cursorPos < 0) return { word: '', start: 0, end: 0 };
    
    // Find start of word (backwards search for space/newline)
    let start = cursorPos;
    while (start > 0 && !/\s/.test(text[start - 1])) {
      start--;
    }
    
    // Find end of word (forwards search for space/newline)
    let end = cursorPos;
    while (end < text.length && !/\s/.test(text[end])) {
      end++;
    }
    
    const word = text.slice(start, end);
    return { word, start, end };
  }, []);

  // Update suggestions on value/cursor change
  const checkSpellingAtCursor = useCallback((element: HTMLTextAreaElement | HTMLInputElement) => {
    elementRef.current = element;
    const text = element.value;
    const pos = element.selectionStart ?? 0;
    
    const { word, start, end } = getWordAtCursor(text, pos);
    const clean = cleanWord(word);
    
    if (clean.base && isMisspelled(word)) {
      setActiveWord(word);
      setSuggestions(getSpellingSuggestions(word));
      setActiveWordRange({ start, end });
    } else {
      setActiveWord('');
      setSuggestions([]);
      setActiveWordRange(null);
    }
  }, [getWordAtCursor]);

  // Hook into select/cursor change events
  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    checkSpellingAtCursor(e.currentTarget);
  }, [checkSpellingAtCursor]);

  // Hook into key down to intercept Space or Punctuation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const el = e.currentTarget;
    elementRef.current = el;
    
    // Wait for the keystroke to be processed in the DOM
    setTimeout(() => {
      checkSpellingAtCursor(el);
    }, 0);

    // Triggers: Space, Period, Comma, Exclamation, Question, Semicolon, Colon, Enter
    const triggers = [' ', '.', ',', '!', '?', ';', ':', 'Enter'];
    if (!triggers.includes(e.key)) return;

    const text = el.value;
    const pos = el.selectionStart ?? 0;
    if (pos === 0) return;

    // Find the word right before the cursor
    let start = pos - 1;
    while (start > 0 && /\s/.test(text[start])) {
      start--;
    }
    while (start > 0 && !/\s/.test(text[start - 1])) {
      start--;
    }
    
    const end = pos;
    const wordWithPunc = text.slice(start, end);
    
    // Apply correction
    const corrected = autocorrectWord(wordWithPunc);
    if (corrected !== wordWithPunc) {
      const appendChar = e.key === 'Enter' ? '' : e.key;
      if (e.key !== 'Enter') {
        e.preventDefault();
      }
      
      const before = text.slice(0, start);
      const after = text.slice(end);
      const newText = before + corrected + appendChar + after;
      
      onChange(newText);
      
      const lengthDiff = (corrected.length + appendChar.length) - wordWithPunc.length;
      setTimeout(() => {
        el.value = newText;
        el.selectionStart = el.selectionEnd = pos + lengthDiff;
        checkSpellingAtCursor(el);
      }, 0);
    }
  }, [onChange, checkSpellingAtCursor]);

  // Expose function to replace misspelled word with selected suggestion
  const replaceActiveWord = useCallback((replacement: string) => {
    const el = elementRef.current;
    if (!el) return;

    let start = activeWordRange?.start;
    let end = activeWordRange?.end;

    if (start === undefined || end === undefined) {
      const text = el.value;
      const pos = el.selectionStart ?? 0;
      const range = getWordAtCursor(text, pos);
      start = range.start;
      end = range.end;
    }

    const text = el.value;
    const clean = cleanWord(text.slice(start, end));
    // Keep original leading & trailing punctuation
    const fullReplacement = clean.leading + replacement + clean.trailing;
    
    const before = text.slice(0, start);
    const after = text.slice(end);
    const newText = before + fullReplacement + after;
    
    onChange(newText);
    
    const newCursorPos = start + fullReplacement.length;
    setTimeout(() => {
      el.value = newText;
      el.focus();
      el.selectionStart = el.selectionEnd = newCursorPos;
      checkSpellingAtCursor(el);
    }, 0);
  }, [onChange, activeWordRange, getWordAtCursor, checkSpellingAtCursor]);

  // Add misspelled active word to custom dictionary
  const addActiveWordToDictionary = useCallback((word: string) => {
    addToCustomDictionary(word);
    setActiveWord('');
    setSuggestions([]);
    
    const el = elementRef.current;
    if (el) {
      setTimeout(() => {
        checkSpellingAtCursor(el);
      }, 0);
    }
  }, [checkSpellingAtCursor]);

  // Re-check spelling when the dictionary changes in other parts of the app
  useEffect(() => {
    const handleDictUpdate = () => {
      const el = elementRef.current;
      if (el) {
        checkSpellingAtCursor(el);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('studyquest_custom_dict_update', handleDictUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('studyquest_custom_dict_update', handleDictUpdate);
      }
    };
  }, [checkSpellingAtCursor]);

  return {
    handleKeyDown,
    handleSelect,
    suggestions,
    activeWord,
    replaceActiveWord,
    addActiveWordToDictionary,
  };
}
