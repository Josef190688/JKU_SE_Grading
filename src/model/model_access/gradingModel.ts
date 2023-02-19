import * as vscode from 'vscode';
import { AbstractGradingError } from '../../exception_handling/exception_abstraction/AbstractGradingError';
import { AssignmentModel } from '../implementation/assignment/assignmentModel';
import { ExerciseModel, ExercisePoints } from '../implementation/exercises/exerciseModel';
import { GradingObjectModel } from '../implementation/grading_object/gradingObjectModel';
import { GradingTableModel } from '../implementation/grading_table/gradingTableModel';

/**
 * Die Verwaltung aller Grading-Funktionen für eine Notebook-Datei
 * wird über diese zentrale Schnittstelle angesprochen.
 * 
 * Das GradingModel enthält weitere Models.
 * Wenn das Notebook-Dokument nicht einer Struktur entspricht,
 * die ein fehlerloses Grading verspricht,
 * wird von den einzelnen Models ein AbstractGradingError geworfen.
 * Das Error-Handling wird an den Aufrufer übergegeben.
 */
export class GradingModel {
  private hasBeenRefreshedWithUri: boolean = false;
  private uri: vscode.Uri | undefined;

  private _assignment!: AssignmentModel;
  private _exercises!: ExerciseModel;
  private _gradingTable!: GradingTableModel;
  private _gradingObject!: GradingObjectModel;

  public get assignment(): AssignmentModel { return this._assignment; }
  public get exercises(): ExerciseModel { return this._exercises; }
  public get gradingTable(): GradingTableModel { return this._gradingTable; }
  public get gradingObject(): GradingObjectModel { return this._gradingObject; }

  /**
   * private constructor
   * ----------------------------------------------------------------------------
   * Eine Instanz von GradingModel wird durch die statische Methode create()
   * erzeugt, da für das Erzeugen asynchrone Schreiboperationen am Notebook
   * erforderlich sein können.
   * Das Definieren von asynchronen Konstruktoren ist nicht möglich.
   */
  private constructor() { }

  /**
   * GradingModel.create()
   * ----------------------------------------------------------------------------
   * Wenn das geöffnete Notebook die definierten Anforderungen erfüllt,
   * die ein potentiell fehlerfreies Grading versprechen,
   * wird eine Instanz von GradingModel erzeugt und zurückgegeben,
   * ansonsten wird ein AbstractGradingError geworfen.
   * 
   * @returns {GradingModel} Instanz von GradingModel
   * @throws {AbstractGradingError} Wenn das Notebook nicht den Anforderungen entspricht
   */
  public static async create(): Promise<GradingModel> {
    try {
      let model = new GradingModel();
      await model.refresh();
      return Promise.resolve(model);
    } catch (error) {
      if (!(error instanceof AbstractGradingError)) {
        console.log('unexpected error in creating some grading model', error);
      }
      return Promise.reject(error);
    }
  }

  public async refresh() {
    try {
      let currentUri = vscode.window.activeNotebookEditor?.notebook.uri;
      if (this.hasBeenRefreshedWithUri && currentUri && currentUri === this.uri) {
        // automatisches Binding der letzten Veränderung
        await this.updateValuesOnChange();
      }
      this._assignment = new AssignmentModel();
      this._gradingTable = new GradingTableModel();
      this._exercises = new ExerciseModel();
      this._gradingObject = new GradingObjectModel();
      this.uri = vscode.window.activeNotebookEditor?.notebook.uri;
      this.hasBeenRefreshedWithUri = true;
    } catch (error) {
      if (!(error instanceof AbstractGradingError)) {
        console.log('unexpected error in creating some grading model', error);
      }
      throw error;
    }
  }

  /**
   * updateValuesOnChange sorgt dafür, dass nach manuellen Änderungen im Notebook-Dokument
   * abhängige Werte mit angepasst werden.
   * Das heißt, wenn der Benutzer beispielsweise im Notebook-Dokument die Note
   * manuell in die Grading-Tablle einträgt, statt über die TreeView,
   * dann werden die Punkte automatisch übertragen in die Titel-Zeile der entsprechenden Aufgabe.
   */
  private async updateValuesOnChange() {
    try {
      let exerciseModel = new ExerciseModel();
      let gradingTableModel = new GradingTableModel();
      // GradingTable hat sich verändert?
      if (JSON.stringify(Array.from(this.gradingTable.getExercisePoints())) !== JSON.stringify(Array.from(gradingTableModel.getExercisePoints()))) {
        // dann passe die Exercises dazu an
        await writeResultPointsFromGradingTableToExercises(this.gradingTable);
        await updateGradingObject();
      }
      // Exercises haben sich verändert?
      else if (JSON.stringify(Array.from(this.exercises.getExercisePoints())) !== JSON.stringify(Array.from(exerciseModel.getExercisePoints()))) {
        // dann passe die GradingTable dazu an
        await gradingTableModel.buildGradingTableAndApplyToNotebook();
        await updateGradingObject();
      }

      async function writeResultPointsFromGradingTableToExercises(oldGradingTableModel: GradingTableModel) {
        try {     
	        let changedEntries: ExercisePoints[] = [];
	        oldGradingTableModel.getExercisePoints().forEach(before => {
	          gradingTableModel.getExercisePoints().forEach(after => {
	            if (before.exercise && after.exercise && before.exercise === after.exercise) {
	              if (before.maxPoints !== after.maxPoints || before.result !== after.result) {
	                changedEntries.push(after);
	              }
	            }
	          });
	        });
	        if (changedEntries.length === 1 && changedEntries[0]) {
	          // finde die dazugehörende Aufgabe und aktualisiere alle Abhängigkeiten
	          // Achtung: wenn im GradingTable die Punktezahl einer ParentExercise geändert wird,
	          // kann man nicht darauf schließen, welche Unteraufgabe mit wie vielen Punkten
	          // davon betroffen ist, daher wird in diesem Fall nicht synchronisiert.
	          exerciseModel.getExercises().forEach(async exercise => {
	            if (exercise.exercisePoints.exercise === changedEntries[0].exercise) {
	              let newPoints = changedEntries[0];
	              await exercise.setResultPoints(newPoints.result);
                gradingTableModel = new GradingTableModel();
	              await gradingTableModel.buildGradingTableAndApplyToNotebook();
	            }
	          });
	        }
        } catch (error) { }
      }

      async function updateGradingObject() {
        let gradingObject = new GradingObjectModel();
        if (new ExerciseModel().getNumberOfExercisesLeftToGrade() === 0) {
          gradingObject.buildGradingObject();
        } else {
          gradingObject.removeGradingObject();
        }
      }

    } catch (error) { }
  }
}





