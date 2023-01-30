import * as vscode from 'vscode';
import { ExerciseNumberingError } from '../../../exception_handling/exception_implementation/exerciseNumberingError';
import { GradingObjectModel } from '../grading_object/gradingObjectModel';
import { GradingTableBuilder } from '../grading_table/gradingTableBuilder';

/**
 * Die Klasse ExerciseModel verwaltet den Zugriff
 * auf die einzelnen Programmieraufgaben, die in der Notebook-Datei enthalten sind.
 * Als Wording wird in Englisch hierfür "Exercise" verwendet, in Deutsch "Aufgabe".
 *
 * @property {Exercise[]} exercises - Informationen über alle Aufgaben des Notebooks
 */
export class ExerciseModel {

    /*============================================================================
        Variablen
    ============================================================================*/
    private exercises: Exercise[] = [];

    /*============================================================================
        Konstruktor
    ------------------------------------------------------------------------------
        identifiziert die Notebook-Zellen, die als Aufgabe definiert sind
        und legt all deren relevanten Daten in der Variable "exercises" ab
    ============================================================================*/
    constructor() {
        let possibleParents: ParentExercise[] = [];
        vscode.window.activeNotebookEditor?.notebook?.getCells()?.forEach(cell => {
            if (!cell.metadata?.custom?.metadata?.task_id) {
                let exerciseData = getExtractedExerciseDataFromCellText(cell);
                if (exerciseData.exercise && exerciseData.maxPoints) {
                    let parent = new ParentExercise();
                    parent.cell = cell;
                    parent.displayName = exerciseData.displayValue;
                    parent.exercisePoints = {
                        exercise: parseInt(exerciseData.exercise),
                        maxPoints: exerciseData.maxPoints,
                        result: exerciseData.result
                    };
                    possibleParents.push(parent);
                }
            }
        });
        vscode.window.activeNotebookEditor?.notebook?.getCells()?.forEach((cell) => {
            if (cell.metadata?.custom?.metadata?.task_id) {
                this.exercises.push(new Exercise(cell, possibleParents));
            }
        });
        // FIXME: wenn exercise-daten nicht mit grading-table-daten übereinstimmen, gradingEqualityError werfen
    }

    /*============================================================================
        Methoden
    ============================================================================*/

    /**
     * @returns Summe der Bewertungen je Aufgabe
     */
    getSumOfResultPoints(): number {
        let sum = 0;
        this.getExercisePoints().forEach(points => {
            if (points.result) {
                sum += points.result;
            }
        });
        return sum;
    }

    /**
     * @returns Summe der maximal erreichbaren Punkte je Aufgaben
     */
    getSumOfAchievablePoints(): number {
        let sum = 0;
        this.getExercisePoints().forEach(points => {
            if (points.maxPoints) {
                sum += points.maxPoints;
            }
        });
        return sum;
    }

    /**
     * @returns alle Aufgaben, die eine "task_id" in deren Metadaten enthalten
     */
    getExercises(): Exercise[] {
        return this.exercises;
    }

    /**
     * Gibt ein Set von allen Punkten aller Aufgaben zurück.
     * Wenn es Unteraufgaben gibt, werden die Punkte hier
     * zusammengefasst zurückgegeben, um Vergleiche mit
     * der GradingTable zu ermöglichen.
     * 
     * Beispiel:
     * 
     * 1.a) maxPoints = 2, resultPoints = 2
     * 
     * 1.b) maxPoints = 3, resultPoints = 0
     * 
     * wird zu
     * Exercise 1: maxPoints = 5, resultPoints = 2
     */
    public getExercisePoints(): Set<ExercisePoints> {
        let map = new Map<number, ExercisePoints>();
        this.getExercises()
            .map(exercise => {
                if (!exercise.exercisePoints.exercise) {
                    let data = getExtractedExerciseDataFromCellText(exercise.cell);
                    let match = data.exercise?.match(/\d+/);
                    if (match && match[0]) {
                        return {
                            exercise: parseInt(match[0]),
                            maxPoints: exercise.exercisePoints.maxPoints,
                            result: exercise.exercisePoints.result
                        };
                    }
                }
                return exercise.exercisePoints;
            })
            .forEach(points => {
                if (points.exercise !== undefined && map.has(points.exercise)) {
                    let previousMaxPoints = map.get(points.exercise)?.maxPoints;
                    let previousResultPoints = map.get(points.exercise)?.result;
                    let addedMaxPoints;
                    let addedResultPoints;
                    if (previousMaxPoints === undefined) {
                        addedMaxPoints = points.maxPoints;
                    } else if (points.maxPoints === undefined) {
                        addedMaxPoints = previousMaxPoints;
                    } else {
                        addedMaxPoints = previousMaxPoints + points.maxPoints;
                    }
                    if (previousResultPoints === undefined) {
                        addedResultPoints = points.result;
                    } else if (points.result === undefined) {
                        addedResultPoints = previousResultPoints;
                    } else {
                        addedResultPoints = previousResultPoints + points.result;
                    }
                    map.set(points.exercise, {exercise: points.exercise, maxPoints: addedMaxPoints, result: addedResultPoints});
                } else if (points.exercise !== undefined) {
                    map.set(points.exercise, {exercise: points.exercise, maxPoints: points.maxPoints, result: points.result});
                }
            }
        );
        return new Set(Array.from(map.values()));
    }

    /**
     * @returns Anzahl der Aufgaben, die noch nicht bewertet sind
     */
    public getNumberOfExercisesLeftToGrade(): number {
        let leftToGrade = this.getExercises().length;
        this.getExercises().forEach(exercise => {
            if (exercise.exercisePoints.result !== undefined) {
                leftToGrade--;
            }
        });
        return leftToGrade;
    }

}

// ===================================================================================================

export interface ExercisePoints {
    exercise?: number;
    maxPoints?: number;
    result?: number;
}

interface ExerciseData {
    exerciseTitleLine: string;
    startIndexOfTitleLine: number;
    endIndexOfTitleLine: number;
    displayValue: string;
    title: string;

    // points
    exercise?: string;
    maxPoints?: number;
    result?: number;
}

/**
 * Eine ParentExercise wird nur für die Anzeige und Strukturierung von Unteraufgaben verwendet.
 * Die Punkte darin werden für keine Berechnungen herangezogen.
 * 
 * Wichtig: Um als ParentExercise vom Programm erkannt zu werden,
 * darf diese keine "task_id" in den Metadaten enthalten.
 */
export class ParentExercise {
    cell: vscode.NotebookCell | undefined;
    exercisePoints: ExercisePoints = { exercise: undefined, maxPoints: undefined, result: undefined };
    displayName: string = 'Exercise';
}

/**
 * Eine Exercise hält alle relevanten Daten über eine jeweilige Aufgabe.
 * 
 * Eine Exercise kann optional einer ParentExercise angehören.
 * Dafür muss die Exercise ihren Titel mit mindestens einer Raute beginnen,
 * gefolgt von beliebigen Zeichen bis hin zu einer Zahl,
 * gefolgt von einem Punkt, gefolgt von einem Buchstaben,
 * gefolgt von einer schließenden Klammer.
 * Beispiel: ### 1.a) Task1
 * 
 * Aufgaben werden ausschließlich dadurch identifiziert,
 * dass sie in ihren Metadaten eine "task_id" enthalten.
 */
export class Exercise {
    readonly cell: vscode.NotebookCell;
    private _exercisePoints: ExercisePoints = { exercise: undefined, maxPoints: undefined, result: undefined };
    public get exercisePoints(): ExercisePoints { return this._exercisePoints; }
    readonly displayName: string = '';
    readonly title: string = '';
    parent: ParentExercise | undefined;

    constructor(cell: vscode.NotebookCell, possibleParents: ParentExercise[]) {
        this.cell = cell;
        let extractedData = getExtractedExerciseDataFromCellText(this.cell);
        if (cell.metadata?.custom?.metadata?.task_id) {
            // Parent hinzufügen, wenn in den Notebook-Daten eine passende Zelle gefunden wurde
            if (extractedData.exercise !== undefined) {
                this._exercisePoints.exercise = +extractedData.exercise;
                if (isNaN(+extractedData.exercise)) {
                    possibleParents.forEach(parent => {
                        if (extractedData.exercise !== undefined) {
                            if (parent.exercisePoints.exercise === parseInt(extractedData.exercise)) {
                                this.parent = parent;
                            }
                        }
                    });
                }
            }

            if (extractedData.maxPoints !== undefined) {
                this._exercisePoints.maxPoints = extractedData.maxPoints;
            }
            if (extractedData.result !== undefined) {
                this._exercisePoints.result = extractedData.result;
            }
            this.displayName = extractedData.displayValue;
            this.title = extractedData.title;
        }
    }

    /**
     * Setzt für eine bestimmte Aufgabe die maximalen Punkte neu und ändert auch den Anzeigetext entsprechend.
     * Wenn bereits eine Bewertung auf dieser Übung eingetragen ist, wird diese damit gelöscht,
     * da diese Funktion nur für Lehrende gedacht ist.
     */
    public async setMaxPoints(newMaxPoints: number) {
        await this.setExerciseCellTextWithNewValues(newMaxPoints, undefined);
    }

    /**
     * Setzt für eine bestimmte Aufgabe die erreichten Punkte neu und ändert auch den Anzeigetext entsprechend.
     * Wenn diese Aufgabe keine maximalen Punkte definiert hat, werden auch keine resultPoints eingetragen,
     * die eckigen Klammern bleiben in diesem Fall leer.
     */
    public async setResultPoints(newResultPoints: number | undefined) {
        let exerciseData = getExtractedExerciseDataFromCellText(this.cell);
        await this.setExerciseCellTextWithNewValues(exerciseData.maxPoints, newResultPoints);
        // build or remove GradingObject
        let leftToGrade = new ExerciseModel().getNumberOfExercisesLeftToGrade();
        if (leftToGrade === 0) {
            await new GradingObjectModel().buildGradingObject();
        } else if (leftToGrade > 0) {
            await new GradingObjectModel().removeGradingObject();
        }
    }

    private async setExerciseCellTextWithNewValues(newMaxPoints: number | undefined, newResultPoints: number | undefined) {
        // Neue Exercise-Zelle mit aktualisierten Punkten erstellen
        let exerciseData = getExtractedExerciseDataFromCellText(this.cell);
        let newExerciseTitle = '';
        if (exerciseData.exercise !== undefined && isNaN(+exerciseData.exercise)) {
            newExerciseTitle += '### ' + exerciseData.exercise + ' ';
        } else {
            newExerciseTitle += '## Exercise ' + exerciseData.exercise + ': ';
        }
        newExerciseTitle += exerciseData.title + ' [';
        // resultPoints werden eingefügt, wenn bereits maxPoints vorhanden sind
        // und newResultPoints übergeben werden
        if (newMaxPoints !== undefined && newResultPoints !== undefined) {
            newExerciseTitle += newResultPoints + ' / ' + newMaxPoints;
            newExerciseTitle += (newMaxPoints === 1) ? ' Point' : ' Points';
        // maxPoints werden eingefügt, wenn newMaxPoints übergeben wurde
        } else if (newMaxPoints !== undefined) {
            newExerciseTitle += newMaxPoints;
            newExerciseTitle += (newMaxPoints === 1) ? ' Point' : ' Points';
        }
        newExerciseTitle += ']';
        let newExerciseCellText =
            this.cell.document.getText().slice(0, exerciseData.startIndexOfTitleLine) + 
            newExerciseTitle +
            this.cell.document.getText().slice(exerciseData.endIndexOfTitleLine);
        let cell = new vscode.NotebookCellData(
            this.cell.kind,
            newExerciseCellText,
            this.cell.document.languageId
        );
        cell.metadata = this.cell.metadata;
        
        // Parent-Zelle mit anpassen, sofern es eine gibt
        let parentCell;
        if (this.parent && this.parent.cell) {
            let parentData = getExtractedExerciseDataFromCellText(this.parent.cell);
            let newParentCelltext = '## Exercise ' + parentData.exercise + ': ' + parentData.title + ' [';

            let oldParentMaxPoints = this.parent.exercisePoints.maxPoints === undefined ? 0 : this.parent.exercisePoints.maxPoints;
            let oldParentResultPoints = this.parent.exercisePoints.result === undefined ? 0 : this.parent.exercisePoints.result;
            let oldExerciseMaxPoints = this.exercisePoints.maxPoints === undefined ? 0 : this.exercisePoints.maxPoints;
            let oldExerciseResultPoints = this.exercisePoints.result === undefined ? 0 : this.exercisePoints.result;
            if (newMaxPoints !== undefined && newResultPoints !== undefined) {
                let newParentMaxPoints = oldParentMaxPoints - oldExerciseMaxPoints + newMaxPoints;
                newParentCelltext += oldParentResultPoints - oldExerciseResultPoints + newResultPoints + ' / ';
                newParentCelltext += newParentMaxPoints;
                newParentCelltext += (newParentMaxPoints === 1) ? ' Point' : ' Points';
            } else if (newMaxPoints !== undefined) {
                let newParentMaxPoints = oldParentMaxPoints - oldExerciseMaxPoints + newMaxPoints;
                newParentCelltext += newParentMaxPoints;
                newParentCelltext += (newParentMaxPoints === 1) ? ' Point' : ' Points';
            }
            newParentCelltext += ']';
            parentCell = new vscode.NotebookCellData(
                this.parent.cell.kind,
                newParentCelltext,
                this.parent.cell.document.languageId
            );
            parentCell.metadata = this.parent.cell.metadata;
        }

        // Änderungen werden ins Notebook geschrieben
        const edit = new vscode.WorkspaceEdit();
        const exerciseEdit = vscode.NotebookEdit.replaceCells(
            new vscode.NotebookRange(this.cell.index, this.cell.index + 1),
            [cell]);
        let exerciseParentEdit;
        if (this.parent?.cell && parentCell) {
            exerciseParentEdit = vscode.NotebookEdit.replaceCells(
                new vscode.NotebookRange(this.parent.cell.index, this.parent.cell.index + 1),
                [parentCell]);
        }
        if (vscode.window.activeNotebookEditor?.notebook.uri) {
            edit.set(
                vscode.window.activeNotebookEditor?.notebook.uri,
                exerciseParentEdit === undefined ? [exerciseEdit] : [exerciseEdit, exerciseParentEdit]
            );
            await vscode.workspace.applyEdit(edit);
        }
    }
}

function getExtractedExerciseDataFromCellText(cell: vscode.NotebookCell): ExerciseData {
    let exerciceTitleLine = getExerciseTitleLine(cell);
    let startIndex = cell.document.getText().indexOf(exerciceTitleLine);
    let endIndex = startIndex + getExerciseTitleLine(cell).length;

    // extrahieren des Anzeigenamens der Titel-Zeile
    let displayValue = '';
    let parts = exerciceTitleLine.match(/#*\s*(.*)/);
    if (parts && parts[1]) {
        displayValue = parts[1];
    }

    // aufsplitten des extrahierten Anzeigenamens in Teil mit eckigen Klammern und den Rest
    parts = displayValue.match(/([^\[]*)(.*)/);
    let textWithoutBracketPart;
    let dataWithinBrackets;
    if (parts && parts[1]) {
        textWithoutBracketPart = parts[1];
    }
    if (parts && parts[2]) {
        dataWithinBrackets = parts[2];
    }

    // aufsplitten des verbleibenden Texts ohne Klammern in Nummer und Titel der Aufgabe
    let exercise;
    let title = '';
    if (textWithoutBracketPart) {
        parts = textWithoutBracketPart.match(/[^\d]*(?<exercise>\d*[.]\w[)]|\d*[.]d*[)]|\d*)[\s]*[\:]*[\s]*(?<title>.*)/);
        if (parts && parts.groups?.exercise) {
            exercise = parts.groups.exercise;
        }
        if (parts && parts.groups?.title) {
            title = parts.groups.title.trim();
        }
    }

    // extrahieren der maxPoints und result aus den eckigen Klammern
    let maxPoints;
    let result;
    if (dataWithinBrackets) {
        let numbers = dataWithinBrackets.match(/\d+/g);
        if (numbers && numbers[0] && numbers[1]) {
            maxPoints = parseInt(numbers[1]);
            result = parseInt(numbers[0]);
        }
        else if (numbers && numbers[0]) {
            maxPoints = parseInt(numbers[0]);
        }
    }

    let exerciseData: ExerciseData;
    exerciseData = {
        exerciseTitleLine: exerciceTitleLine,
        startIndexOfTitleLine: startIndex,
        endIndexOfTitleLine: endIndex,
        displayValue: displayValue,
        title: title,
        exercise: exercise,
        maxPoints: maxPoints,
        result: result
    };
    return exerciseData;
}

function getExerciseTitleLine(cell: vscode.NotebookCell): string {
    const lines = cell.document.getText().split("\n");
    for (let line of lines) {
        if (line.startsWith("#")) {
            return line;
        }
    }
    return '';
}
