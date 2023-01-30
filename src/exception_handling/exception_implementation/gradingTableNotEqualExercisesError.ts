import { AbstractGradingError, Solution } from "../exception_abstraction/AbstractGradingError";

// Als Idee
export class GradingTableNotEqualExercisesError extends AbstractGradingError {
    constructor() {
        super('');
        this.name = '';
        this.message = '';
    }

    protected getAtLeastOneSolution(): [Solution, Solution[]] {
        return [
            Solution.createNoSolutionImplementedObject(), []
        ];
    }
}
