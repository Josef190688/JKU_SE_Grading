import { AbstractGradingError, Solution } from "../exception_abstraction/AbstractGradingError";

export class GradingTableNumberingError extends AbstractGradingError {
    constructor() {
        super('gradingTableNumberingError');
        this.name = 'grading-table has incorrect task-numbering';
        this.message = 
            'The numbering must correspond to the arithmetic sequence: Exercise 1, Exercise 2, Exercise 3, ...';
    }

    protected getAtLeastOneSolution(): [Solution, Solution[]] {
        return [
            Solution.createNoSolutionImplementedObject(), []
        ];
    }
}
