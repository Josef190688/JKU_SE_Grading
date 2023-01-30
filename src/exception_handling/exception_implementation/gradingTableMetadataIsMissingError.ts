import { AbstractGradingError, Solution } from "../exception_abstraction/AbstractGradingError";

export class GradingTableMetadataIsMissingError extends AbstractGradingError {
    constructor() {
        super('gradingTableNotFound');
        this.name = 'grading-table-cell not found';
        this.message = 
            'A notebook cell has been identified as a grading table, but metadata seems to be missing.';
    }

    protected getAtLeastOneSolution(): [Solution, Solution[]] {
        return [
            Solution.createNoSolutionImplementedObject(), []
        ];
    }
}
