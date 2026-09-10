import { createContext, useContext, useState, type ReactNode } from 'react';

interface WorkoutState {
  activeSessionId: string | null;
  exerciseId: string | null;
  planId: string | null;
  reps: number;
  formScore: number;
  duration: number;
  isActive: boolean;
}

interface WorkoutContextType extends WorkoutState {
  startWorkout: (exerciseId: string, planId?: string) => void;
  updateReps: (reps: number, formScore: number) => void;
  updateDuration: (seconds: number) => void;
  endWorkout: () => WorkoutState;
  setSessionId: (id: string) => void;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

const initialState: WorkoutState = {
  activeSessionId: null,
  exerciseId: null,
  planId: null,
  reps: 0,
  formScore: 100,
  duration: 0,
  isActive: false,
};

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkoutState>(initialState);

  const startWorkout = (exerciseId: string, planId?: string) => {
    setState({
      ...initialState,
      exerciseId,
      planId: planId || null,
      isActive: true,
    });
  };

  const updateReps = (reps: number, formScore: number) => {
    setState(s => ({ ...s, reps, formScore }));
  };

  const updateDuration = (seconds: number) => {
    setState(s => ({ ...s, duration: seconds }));
  };

  const endWorkout = (): WorkoutState => {
    const final = { ...state, isActive: false };
    setState(initialState);
    return final;
  };

  const setSessionId = (id: string) => {
    setState(s => ({ ...s, activeSessionId: id }));
  };

  return (
    <WorkoutContext.Provider value={{ ...state, startWorkout, updateReps, updateDuration, endWorkout, setSessionId }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = (): WorkoutContextType => {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
};
