export interface SolutionStep {
  text: string;
  expr?: string;
  unit?: string;
  isConclusion?: boolean;
}

export interface StructuredSolution {
  steps: SolutionStep[];
}

export type ExerciseSolution = StructuredSolution | string;

export interface Exercise {
  question: string;
  difficulty: 'basic' | 'medium' | 'advanced';
  solution: ExerciseSolution;
}
