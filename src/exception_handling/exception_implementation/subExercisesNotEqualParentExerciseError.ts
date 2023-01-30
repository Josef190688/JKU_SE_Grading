/* eslint-disable @typescript-eslint/naming-convention */
import { AbstractGradingError, Solution } from "../exception_abstraction/AbstractGradingError";

// Als Idee
export class SubExercisesNotEqualParentExerciseError extends AbstractGradingError {
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
