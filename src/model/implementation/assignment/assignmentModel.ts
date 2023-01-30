import * as vscode from 'vscode';
import { AbstractGradingError } from '../../../exception_handling/exception_abstraction/AbstractGradingError';
import { AssignmentNotFoundError } from '../../../exception_handling/exception_implementation/assignmentNotFoundError';
import { GradingModel } from '../../model_access/gradingModel';
import { ExerciseModel } from '../exercises/exerciseModel';
import { GradingObjectModel } from '../grading_object/gradingObjectModel';
import { GradingTableModel } from '../grading_table/gradingTableModel';

/**
 * Die Klasse AssigmentModel verwaltet den Zugriff
 * auf die allgemeinen Daten der Python-Programmier-Übung
 * innerhalb eines Notebook-Files.
 * Als Wording wird in Englisch hierfür "Assignment" verwendet, in Deutsch "Übung".
 *
 * @property {string} title - Der Titel der Übung
 * @property {number} maxPointsForAssignment - Anzahl der maximal zu erreichenden Punkte für die Übung
 * @property {vscode.NotebookCell} cell - Die Notebook-Zelle, auf die sich die Übungs-Daten beziehen
 */
export class AssignmentModel {

    /*============================================================================
        Variablen
    ============================================================================*/
    private title: string = '';
    readonly cell: vscode.NotebookCell;

    /*============================================================================
        Konstruktor
    ------------------------------------------------------------------------------
        identifiziert die Notebook-Zelle, die den Titel der Übung enthält
    ============================================================================*/
    constructor() {
        try {
	        let foundCell;
	        vscode.window.activeNotebookEditor?.notebook.getCells()?.some((cell) => {
	            // Eine Zelle wird als Übung identifiziert, wenn in den Metadaten
	            // in irgendeiner Ebene eine "assignment_id" vorhanden ist.
	            if (hasProperty(cell.metadata?.custom?.metadata, 'assignment_id')) {
	                foundCell = cell;
	                let text = cell.document.getText();
	                // Der Titel wird aus "assignment" in den Metadaten ermittelt
	                if (cell.metadata?.custom?.metadata?.assignment) {
	                    this.title = cell.metadata.custom.metadata.assignment;
	                }
	                // Wenn "assignment" in den Metadaten nicht vorhanden ist,
	                // wird der Titel aus dem Zellen-Inhalt gelesen
	                else if (text.includes('# Assignment') && text.indexOf('\n') !== -1) {
	                    this.title = text.substring(text.indexOf('Assignment'), text.indexOf('\n', text.indexOf('Assignment')) - 1);
	                }
	                else if (text.includes('# Assignment')) {
	                    this.title = text.substring(text.indexOf('Assignment'));
	                }
	                else if (text.includes('# Übung') && text.indexOf('\n') !== -1) {
	                    this.title = text.substring(text.indexOf('Übung'), text.indexOf('\n', text.indexOf('Übung')) - 1);
	                }
	                else if (text.includes('# Übung')) {
	                    this.title = text.substring(text.indexOf('Übung'));
	                }
	                // Wenn auch hier nichts gefunden wird,
	                // wird Titel aus "assignment_id" in den Metadaten ermittelt
	                else {
	                    this.title = cell.metadata.custom.metadata.assignment_id;
	                }
                    if (hasProperty(cell.metadata?.custom?.metadata, 'max_points_assignment')) {
                        
                    }
	                return true;
	            }
	        });
	        if (foundCell) {
                this.cell = foundCell;
	        } else {
                throw new AssignmentNotFoundError();
            }
        } catch (error) {
            if (!(error instanceof AbstractGradingError)) {
                console.log('unexpected error in assignmentModelConstructor', error);
            }
            throw error;
        }
    }

    /*============================================================================
        Methoden
    ============================================================================*/

    /**
     * @returns {string} Titel der Übung
     */
    getTitle(): string { return this.title; }

    /**
     * @returns {number} Anzahl der maximal zu erreichenden Punkte für die Übung
     */
    getMaxPointsForAssignment(): number {
        let obj = this.cell.metadata?.custom?.metadata;
        if (!obj) {
            return 25;
        }
        if (obj.hasOwnProperty("max_points_assignment") && !isNaN(obj.max_points_assignment)) {
            return obj.max_points_assignment;
        }
        for (const p in obj) {
            if (obj.hasOwnProperty(p) && typeof obj[p] === 'object') {
                if (hasProperty(obj[p], "max_points_assignment") && !isNaN(obj[p].max_points_assignment)) {
                    return obj[p].max_points_assignment;
                }
            }
        }
        return 25;
    }

    /**
     * Setter für die Anzahl der maximal zu erreichenden Punkte für die Übung
     */
    async setMaxPointsForAssignment(newValueForMaxPoints: number) {
        if (this.getMaxPointsForAssignment() !== newValueForMaxPoints) {
            let metadata = this.cell.metadata?.custom?.metadata;
            replaceMaxPoints(metadata, newValueForMaxPoints);
            insertMaxPoints(metadata, newValueForMaxPoints);
            this.cell.metadata.custom.metadata = metadata;

            // Änderungen werden ins Notebook geschrieben
            const edit = new vscode.WorkspaceEdit();
            const nbEdit = vscode.NotebookEdit.updateCellMetadata(this.cell.index, this.cell.metadata);
            if (vscode.window.activeNotebookEditor) {
                edit.set(vscode.window.activeNotebookEditor?.notebook.uri, [nbEdit]);
                await vscode.workspace.applyEdit(edit);
            }
        }

        /**
         * Wenn sich in einer beliebigen Ebene der Metadaten ein key "max_points_assignment"
         * befindet, wird dessen Wert durch newValue ersetzt.
         * 
         * Wenn newValue = 25 ist, dann wird "max_points_assignment" entfernt,
         * da dies der Standard-Wert ist.
         */
        function replaceMaxPoints(metadata: any, newValue: number): void {
            if (!metadata) {
                return;
            }
            if (metadata.hasOwnProperty("max_points_assignment")) {
                metadata["max_points_assignment"] = newValue;
                if (newValue === 25) {
                    delete metadata["max_points_assignment"];
                }
            } else {
                for (const key in metadata) {
                    if (metadata[key] && typeof metadata[key] === "object") {
                        replaceMaxPoints(metadata[key], newValue);
                    }
                }
            }
        }

        /**
         * Wenn newValue ungleich 25 ist (da dies der Standard ist),
         * wird in der ersten Ebene der Metadaten ein neuer Eintrag
         * "max_points_assignment" angelegt mit dem Wert newValue.
         */
        function insertMaxPoints(metadata: any, newValue: number): void {
            if (!metadata || newValue === 25) {
                return;
            }
            if (metadata.hasOwnProperty("max_points_assignment")) {
                metadata["max_points_assignment"] = newValue;
            } else {
                for (const key in metadata) {
                    if (metadata[key] && typeof metadata[key] === "object") {
                        insertMaxPoints(metadata[key], newValue);
                    }
                }
                metadata["max_points_assignment"] = newValue;
            }
        }
    }


}

/**
 * Prüft, ob ein beliebig tief verschachteltes Objekt eine Eigenschaft mit einem bestimmten Namen hat.
 *
 * @param {object} obj - Das zu durchsuchende Objekt
 * @param {string} prop - Der Name der Eigenschaft, nach der gesucht wird
 * @returns {boolean} true, wenn die Eigenschaft gefunden wurde, ansonsten false
 */
function hasProperty(obj: any, prop: string): boolean {
    if (!obj) {
        return false;
    }
    if (obj.hasOwnProperty(prop)) {
        return true;
    }
    for (const p in obj) {
        if (obj.hasOwnProperty(p) && typeof obj[p] === 'object') {
            if (hasProperty(obj[p], prop)) {
            return true;
            }
        }
    }
    return false;
}

