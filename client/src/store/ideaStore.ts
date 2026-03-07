import { create } from 'zustand'
import type { Idea, IdeaSummary } from '@/types/idea'

interface IdeaState {
  ideas: IdeaSummary[]
  currentIdea: Idea | null
  isProcessing: boolean
  processingStep: string

  setIdeas: (ideas: IdeaSummary[]) => void
  setCurrentIdea: (idea: Idea | null) => void
  setProcessing: (processing: boolean, step?: string) => void
  updateIdeaInList: (id: string, updates: Partial<IdeaSummary>) => void
  removeIdeaFromList: (id: string) => void
}

export const useIdeaStore = create<IdeaState>((set) => ({
  ideas: [],
  currentIdea: null,
  isProcessing: false,
  processingStep: '',

  setIdeas: (ideas) => set({ ideas }),

  setCurrentIdea: (currentIdea) => set({ currentIdea }),

  setProcessing: (isProcessing, step = '') =>
    set({ isProcessing, processingStep: step }),

  updateIdeaInList: (id, updates) =>
    set((state) => ({
      ideas: state.ideas.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    })),

  removeIdeaFromList: (id) =>
    set((state) => ({
      ideas: state.ideas.filter((i) => i.id !== id),
    })),
}))
