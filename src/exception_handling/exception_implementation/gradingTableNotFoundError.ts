import * as vscode from 'vscode';
import { ExerciseModel } from '../../model/implementation/exercises/exerciseModel';
import { GradingTableBuilder } from '../../model/implementation/grading_table/gradingTableBuilder';
import { AbstractGradingError, Solution } from "../exception_abstraction/AbstractGradingError";

export class GradingTableNotFoundError extends AbstractGradingError {
    constructor() {
        super('gradingTableNotFound');
        this.name = 'grading-table-cell not found';
        this.message = 
            'None of the cells in the notebook were recognized as a \'grading table\' ' + 
            'because they did not contain an \'exercise_data\' key in their metadata ' + 
            'with the value \'grading_table\'';
    }

    protected getAtLeastOneSolution(): [Solution, Solution[]] {
        return [
            new Solution(
                'solutions.addGradingTableCell',
                async () => {
                    const edit = new vscode.WorkspaceEdit();
                    
                    // Tabelle wird erstellt
                    let builder = new GradingTableBuilder();
                    let exerciseModel = new ExerciseModel();
                    exerciseModel.getExercisePoints().forEach(points => {
                        if (points.exercise !== undefined && points.maxPoints !== undefined && points.result !== undefined) {
                            builder.addRowWithMaxPointsAndResult(points.exercise, points.maxPoints, points.result);
                        } else if (points.exercise && points.maxPoints) {
                            builder.addRowWithMaxPoints(points.exercise, points.maxPoints);
                        }
                    });
                    let cell = new vscode.NotebookCellData(
                        vscode.NotebookCellKind.Markup,
                        builder.toString(),
                        'en'
                    );
                    cell.metadata = {
                        "custom": {
                            "metadata": {
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                "exercise_data": "grading_table",
                                "deletable": false,
                                "editable": false,
                                "language": "en"
                            }
                        }
                    };
                    
                    const nbEdit = vscode.NotebookEdit.insertCells(3, [cell]);
                    
                    if (vscode.window.activeNotebookEditor?.notebook.uri) {
                        edit.set(vscode.window.activeNotebookEditor.notebook.uri, [nbEdit]);
                        await vscode.workspace.applyEdit(edit);
                        await vscode.window.activeNotebookEditor.notebook.save();
                        // applyEdit und save alleine genügen nicht, um das Rendering korrekt abzuschließen,
                        // daher 'workbench.action.reloadWindow'
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
            ), []
        ];
    }
}

