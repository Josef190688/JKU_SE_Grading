import * as vscode from 'vscode';
import { AbstractGradingError, Solution } from "../exception_abstraction/AbstractGradingError";

export class ExerciseNumberingError extends AbstractGradingError {
    constructor() {
        super('assignmentNotFound');
        this.name = 'assignment-cell not found';
        this.message = 
            'None of the cells in the notebook were recognized as an \'Assignment\' ' + 
            'because they did not contain an \'assignment_id\' key in their metadata.';
    }

    protected getAtLeastOneSolution(): [Solution, Solution[]] {
        return [
            Solution.createNoSolutionImplementedObject(), []
        ];
    }
}
