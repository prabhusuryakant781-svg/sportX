// Active Workout & Session State Context
import React, { createContext, useContext, useState } from 'react';

const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [currentReps, setCurrentReps] = useState(0);
  const [formScore, setFormScore] = useState(100);
  const [formFeedback, setFormFeedback] = useState('Position yourself in camera view');

  return (
    <WorkoutContext.Provider value={{
      activeWorkout,
      setActiveWorkout,
      currentReps,
      setCurrentReps,
      formScore,
      setFormScore,
      formFeedback,
      setFormFeedback
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => useContext(WorkoutContext);
