'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ML_TIERS, ALL_ML_LESSONS } from '@/data/mlCurriculumData';
import { ML_QUIZ_QUESTIONS } from '@/data/mlQuizData';
import { MlLesson, MlTier } from '@/types/ml';
import toast from 'react-hot-toast';

const STORAGE_COMPLETED_KEY = 'studyquest_ml_completed_lessons_v1';
const STORAGE_BOOKMARKS_KEY = 'studyquest_ml_bookmarked_lessons_v1';
const STORAGE_QUIZ_ANSWERS_KEY = 'studyquest_ml_quiz_answers_v1';
const STORAGE_NOTES_KEY = 'studyquest_ml_lesson_notes_v1';

export function useMlCurriculum() {
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [bookmarkedLessonIds, setBookmarkedLessonIds] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedCompleted = localStorage.getItem(STORAGE_COMPLETED_KEY);
      if (savedCompleted) setCompletedLessonIds(JSON.parse(savedCompleted));

      const savedBookmarks = localStorage.getItem(STORAGE_BOOKMARKS_KEY);
      if (savedBookmarks) setBookmarkedLessonIds(JSON.parse(savedBookmarks));

      const savedQuiz = localStorage.getItem(STORAGE_QUIZ_ANSWERS_KEY);
      if (savedQuiz) setQuizAnswers(JSON.parse(savedQuiz));

      const savedNotes = localStorage.getItem(STORAGE_NOTES_KEY);
      if (savedNotes) setLessonNotes(JSON.parse(savedNotes));
    } catch (e) {
      console.error('Failed to load ML curriculum state from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Persist completed lessons
  const toggleLessonComplete = useCallback((lessonId: string) => {
    setCompletedLessonIds((prev) => {
      const exists = prev.includes(lessonId);
      const updated = exists ? prev.filter((id) => id !== lessonId) : [...prev, lessonId];
      try {
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      if (!exists) {
        toast.success('🎯 Lesson marked as mastered! +50 XP', { icon: '✨' });
      }
      return updated;
    });
  }, []);

  // Persist bookmark
  const toggleBookmark = useCallback((lessonId: string) => {
    setBookmarkedLessonIds((prev) => {
      const exists = prev.includes(lessonId);
      const updated = exists ? prev.filter((id) => id !== lessonId) : [...prev, lessonId];
      try {
        localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      toast.success(exists ? 'Bookmark removed' : 'Saved to Bookmarks');
      return updated;
    });
  }, []);

  // Record quiz answer
  const recordQuizAnswer = useCallback((questionId: string, optionIndex: number) => {
    setQuizAnswers((prev) => {
      const updated = { ...prev, [questionId]: optionIndex };
      try {
        localStorage.setItem(STORAGE_QUIZ_ANSWERS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  }, []);

  // Save custom lesson note
  const saveLessonNote = useCallback((lessonId: string, noteText: string) => {
    setLessonNotes((prev) => {
      const updated = { ...prev, [lessonId]: noteText };
      try {
        localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  }, []);

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    return ALL_ML_LESSONS.filter((lesson: MlLesson) => {
      if (selectedTierId && lesson.tierId !== selectedTierId) return false;
      if (selectedCategory && lesson.category !== selectedCategory) return false;
      if (showBookmarksOnly && !bookmarkedLessonIds.includes(lesson.id)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = lesson.title.toLowerCase().includes(q);
        const matchesDesc = (lesson.description || lesson.shortSummary || '').toLowerCase().includes(q);
        const matchesFormula = lesson.keyFormulas?.some(
          (f: { name: string; formula: string }) =>
            f.name.toLowerCase().includes(q) || f.formula.toLowerCase().includes(q)
        );
        const matchesKeywords = lesson.tags?.some((t: string) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesFormula && !matchesKeywords) {
          return false;
        }
      }

      return true;
    });
  }, [selectedTierId, selectedCategory, showBookmarksOnly, searchQuery, bookmarkedLessonIds]);

  // Overall progress metrics
  const progressMetrics = useMemo(() => {
    const totalLessons = ALL_ML_LESSONS.length;
    const completedCount = completedLessonIds.length;
    const overallPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    // Per-tier breakdown
    const tierProgressMap: Record<string, { total: number; completed: number; percentage: number }> = {};

    ML_TIERS.forEach((tier: MlTier) => {
      const tierLessons = ALL_ML_LESSONS.filter((l: MlLesson) => l.tierId === tier.id);
      const tierCompleted = tierLessons.filter((l: MlLesson) => completedLessonIds.includes(l.id)).length;
      tierProgressMap[tier.id] = {
        total: tierLessons.length,
        completed: tierCompleted,
        percentage: tierLessons.length > 0 ? Math.round((tierCompleted / tierLessons.length) * 100) : 0,
      };
    });

    return {
      totalLessons,
      completedCount,
      overallPercentage,
      tierProgressMap,
    };
  }, [completedLessonIds]);

  // Quiz statistics
  const quizMetrics = useMemo(() => {
    const totalQuestions = ML_QUIZ_QUESTIONS.length;
    let correctCount = 0;
    let answeredCount = 0;

    ML_QUIZ_QUESTIONS.forEach((q) => {
      const userAns = quizAnswers[q.id];
      if (userAns !== undefined) {
        answeredCount++;
        if (userAns === q.correctIndex) {
          correctCount++;
        }
      }
    });

    return {
      totalQuestions,
      answeredCount,
      correctCount,
      scorePercentage: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
    };
  }, [quizAnswers]);

  return {
    isLoaded,
    tiers: ML_TIERS,
    allLessons: ALL_ML_LESSONS,
    filteredLessons,
    quizQuestions: ML_QUIZ_QUESTIONS,
    completedLessonIds,
    bookmarkedLessonIds,
    quizAnswers,
    lessonNotes,
    toggleLessonComplete,
    toggleBookmark,
    recordQuizAnswer,
    saveLessonNote,
    progressMetrics,
    quizMetrics,
    // Filters
    searchQuery,
    setSearchQuery,
    selectedTierId,
    setSelectedTierId,
    selectedCategory,
    setSelectedCategory,
    showBookmarksOnly,
    setShowBookmarksOnly,
  };
}
