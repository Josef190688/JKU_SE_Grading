import * as vscode from 'vscode';
import { AbstractGradingError } from '../../../exception_handling/exception_abstraction/AbstractGradingError';
import { GradingTableNotFoundError } from '../../../exception_handling/exception_implementation/gradingTableNotFoundError';
import { ExerciseModel, ExercisePoints } from '../exercises/exerciseModel';
import { GradingTableBuilder } from './gradingTableBuilder';
import { GradingTableReader } from './gradingTableReader';

/**
 * Bietet Lese- und Schreibzugriff auf die Notebook-Zelle, die die GradingTable enthält.
 * Die GrdingTable-Zelle wird durch den key "exercise_data" mit value "grading_table"
 * in den Metadaten der Zelle identifiziert.
 */
export class GradingTableModel {

    /*============================================================================
        Variablen
    ============================================================================*/
    private gradingTableReader: GradingTableReader;
    readonly cell: vscode.NotebookCell;
    
    /*============================================================================
        Konstruktor
    ------------------------------------------------------------------------------
        identifiziert die Notebook-Zelle, in der die Grading-Tabelle enthalten ist
    ============================================================================*/
    constructor() {
        try {
	        let foundCell;
	        // Eine Zelle wird als GradingTable identifiziert, wenn in den Metadaten
	        // ein key "exercise_data" mit value "grading_table" vorhanden ist.
	        vscode.window.activeNotebookEditor?.notebook.getCells()?.some((cell) => {
	            if (cell.metadata?.custom?.metadata?.exercise_data === "grading_table") {
	                foundCell = cell;
	                return true;
	            }
	        });
            if (foundCell) {
                this.cell = foundCell;
                this.gradingTableReader = new GradingTableReader(this.cell.document.getText());
            } else {
	            throw new GradingTableNotFoundError();
	        }
        } catch (error) {
            if (!(error instanceof AbstractGradingError)) {
                console.log('unexpected error in gradingTableModelConstructor', error);
            }
            throw error;
        }
    }
    
    /*============================================================================
        Methoden
    ============================================================================*/

    public getExercisePoints(): Set<ExercisePoints> {
        try {
            return this.gradingTableReader.getExercisePoints();
        } catch (error) {
            if (!(error instanceof AbstractGradingError)) {
                console.log('unexpected error in creating some grading model', error);
            }
            throw error;
        }
    }

    public getSumPoints(): { maxPoints: number, resultPoints: number } {
        return this.gradingTableReader.getSumPoints();
    }

    public async buildGradingTableAndApplyToNotebook() {
        // GradingTable wird erstellt
        let builder = new GradingTableBuilder();
        let exerciseModel = new ExerciseModel();
        exerciseModel.getExercisePoints().forEach(points => {
            if (points.exercise !== undefined && points.maxPoints !== undefined && points.result !== undefined) {
                builder.addRowWithMaxPointsAndResult(points.exercise, points.maxPoints, points.result);
            } else if (points.exercise !== undefined && points.maxPoints !== undefined) {
                builder.addRowWithMaxPoints(points.exercise, points.maxPoints);
            } else if (points.exercise !== undefined) {
                builder.addRowWithoutPoints(points.exercise);
            }
        });

        // Neue GradingTable wird ins Notebook geschrieben
        const edit = new vscode.WorkspaceEdit();
        let cell = new vscode.NotebookCellData(
            this.cell.kind,
            builder.toString(),
            this.cell.document.languageId
        );
        cell.metadata = this.cell.metadata;
        const nbEdit = vscode.NotebookEdit.replaceCells(
            new vscode.NotebookRange(this.cell.index, this.cell.index + 1),
            [cell]
        );
        if (vscode.window.activeNotebookEditor?.notebook.uri) {
            edit.set(
                vscode.window.activeNotebookEditor?.notebook.uri,
                [nbEdit]
            );
            await vscode.workspace.applyEdit(edit);
        }
    }

}