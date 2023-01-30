/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { AbstractGradingError } from '../../../exception_handling/exception_abstraction/AbstractGradingError';
import { AssignmentModel } from '../assignment/assignmentModel';
import { ExerciseModel } from '../exercises/exerciseModel';

export class GradingObjectModel {

    results: { [key: string]: Result } | undefined;
    submission: Submission | undefined;
    assignmentModel: AssignmentModel | undefined;

    metadataWithoutGrading: any;

    constructor() {
        try {
	        this.assignmentModel = new AssignmentModel();
            this.metadataWithoutGrading = extractMetadataWithoutGrading(this.assignmentModel.cell.metadata?.custom?.metadata);
            this.results = getResults();

	        vscode.window.activeNotebookEditor?.notebook.getCells()?.forEach(cell => {
	            if (cell?.metadata?.custom?.metadata?.exercise_data === "student_data") {
                    this.submission = new Submission(cell.document.getText());
                }
	        });

            function getResults(): { [key: string]: Result } {
                let exerciseModel = new ExerciseModel();
                let resultArray: Result[] = [];
                exerciseModel.getExercises().forEach(exercise => {
                    if (exercise.exercisePoints.result !== undefined && exercise.exercisePoints.maxPoints !== undefined) {
                        resultArray.push({
                            achieved: exercise.exercisePoints.result,
                            max: exercise.exercisePoints.maxPoints,
                            name: exercise.title,
                            task_id: exercise.cell.metadata.custom.metadata.task_id
                        });
                    }
                });
                function createResultsFromArray(resultsArray: Result[]): { [key: string]: Result } {
                    const results: { [key: string]: Result } = {};
                    for (let i = 0; i < resultsArray.length; i++) {
                        results[i + 1] = resultsArray[i];
                    }
                    return results;
                }
                return createResultsFromArray(resultArray);
            }

        } catch (error) {
            if (!(error instanceof AbstractGradingError)) {
                console.log('unexpected error in gradingObjectModel', error);
            }
        }

        function extractMetadataWithoutGrading(metadata: any) {
            let newMetadata = {...metadata};
            let assignment = metadata.grading?.assignment || metadata.assignment;
            let assignment_id = metadata.grading?.assignment_id || metadata.assignment_id;
            let submissiondate = metadata.grading?.submissiondate || metadata.submissiondate;
            delete newMetadata.grading;
            newMetadata.assignment = assignment;
            newMetadata.assignment_id = assignment_id;
            newMetadata.submissiondate = submissiondate;
            return newMetadata;
        }
    }

    public async removeGradingObject() {
        if (this.assignmentModel) {
	        const edit = new vscode.WorkspaceEdit();
	        const nbEdit = vscode.NotebookEdit.updateCellMetadata(
                this.assignmentModel.cell.index, 
                {"custom": {
                    "metadata": this.metadataWithoutGrading
                    }
                }
            );
	
	        // die Änderungen werden ins Notebook geschrieben
	        if (vscode.window.activeNotebookEditor?.notebook.uri) {
	            edit.set(vscode.window.activeNotebookEditor?.notebook.uri, [nbEdit]);
	            await vscode.workspace.applyEdit(edit);
	        }
        }
    }

    public async buildGradingObject() {
        if (this.results && this.assignmentModel) {
            const assignment = this.metadataWithoutGrading?.assignment ? this.metadataWithoutGrading.assignment : '';
            const assignmentId = this.metadataWithoutGrading?.assignment_id ? this.metadataWithoutGrading.assignment_id : '';
            const grading = new Grading(
                assignment,
                assignmentId,
                this.submission?.effortInHours ? this.submission.effortInHours : 0,
                this.submission?.name.firstName ? this.submission.name.firstName : '',
                this.submission?.name.lastName ? this.submission.name.lastName : '',
                this.results,
                this.submission?.studentID ? this.submission.studentID : '',
                this.submission?.submissionDate ? this.submission.submissionDate : ''
            );
            let metadataWithoutGrading = this.metadataWithoutGrading;
            let keys = ['assignment', 'assignment_id', 'effort', 'firstname', 'lastname', 'student_id', 'submissiondate'];
            keys.forEach(key => {
                if (metadataWithoutGrading[key]) {
                    delete metadataWithoutGrading[key];
                }
            });
            let metadata = {
                "custom": {
                    "metadata": {
                        "grading": grading,
                        ...metadataWithoutGrading
                    }
                }
            };
            const edit = new vscode.WorkspaceEdit();
            const nbEdit = vscode.NotebookEdit.updateCellMetadata(this.assignmentModel.cell.index, metadata);
    
            // die Änderungen werden ins Notebook geschrieben
            if (vscode.window.activeNotebookEditor?.notebook.uri) {
                edit.set(vscode.window.activeNotebookEditor?.notebook.uri, [nbEdit]);
                await vscode.workspace.applyEdit(edit);
            }
        }
    }

}

class Grading {
    constructor(
        public assignment: string,
        public assignment_id: string,
        public effort: number,
        public firstname: string,
        public lastname: string,
        public results: { [key: string]: Result },
        public student_id: string,
        public submissiondate: string
    ) {}
}

class Result {
    constructor(
        public achieved: number,
        public max: number,
        public name: string,
        public task_id: string
    ) {}
}

class Submission {
    submissionDate: string = '';
    name: {
        firstName: string;
        lastName: string;
    };
    studentID: string = '';
    teamMembers: string = '';
    effortInHours: number = 0;

    constructor(submissionData: string) {
        const submissionDateRegex = /\*\*Submission until:\*\*[\s]*(\d{2}\.\d{2}\.\d{4})/;
        const nameRegex = /\*\*Name:\*\*[\s]*(\w+ \w+)/;
        const studentIDRegex = /\*\*Student ID:\*\*[\s]*(\w+)/;
        const teamMembersRegex = /\*\*Team members:\*\*(.)*/;
        const effortInHoursRegex = /\*\*Effort in hours \(including time in class\):\*\*[\s]*(\d+)/;

        // submissiondate
        const submissionDateMatch = submissionData.match(submissionDateRegex);
        if (submissionDateMatch && submissionDateMatch[1]) {
            // Konvertieren des Datums in das Format yyyy-mm-dd
            const [day, month, year] = submissionDateMatch[1].split(".");
            this.submissionDate = `${year}-${month}-${day}`;
        }

        // firstname, lastname
        const nameMatch = submissionData.match(nameRegex);
        if (nameMatch && nameMatch[1]) {
            // Namen teilen in Vor- und Nachname
            const [firstName, lastName] = nameMatch[1].split(" ");
            this.name = {
                firstName,
                lastName
            };
        } else {
            this.name = {
                firstName: '',
                lastName: ''
            };
        }
                
        // student_id
        const studentIDMatch = submissionData.match(studentIDRegex);
        if (studentIDMatch && studentIDMatch[1]) {
            this.studentID = studentIDMatch[1];
        }
        const teamMembers = submissionData.match(teamMembersRegex);

        // effort
        const effortInHoursMatch = submissionData.match(effortInHoursRegex);
        if (effortInHoursMatch && effortInHoursMatch[1]) {
            this.effortInHours = parseInt(effortInHoursMatch[1]);
        }

        // team_members (nicht Teil von GradingObject)
        if (teamMembers) {
            this.teamMembers = teamMembers[0];
        } else {
            this.teamMembers = '';
        }

    }
}