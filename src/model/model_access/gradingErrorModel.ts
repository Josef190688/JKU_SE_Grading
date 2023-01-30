import * as vscode from 'vscode';
import { AbstractGradingError } from '../../exception_handling/exception_abstraction/AbstractGradingError';
import { AssignmentModel } from '../implementation/assignment/assignmentModel';
import { ExerciseModel } from '../implementation/exercises/exerciseModel';
import { GradingObjectModel } from '../implementation/grading_object/gradingObjectModel';
import { GradingTableModel } from '../implementation/grading_table/gradingTableModel';

/**
 * Die Verwaltung aller Grading-Funktionen für eine Notebook-Datei
 * wird über diese zentrale Schnittstelle angesprochen.
 */
export class GradingErrorModel {

  public getErrors(): AbstractGradingError[] {
    let errors: AbstractGradingError[] = [];
    function addError(error: any) {
      if (error instanceof AbstractGradingError) {
        errors.push(error);
      }
    }
    // an dieser Stelle kann man noch etwaigen Errors Vorrang geben
    try {
	    new AssignmentModel();
    } catch (error) {
      addError(error);
    }
    try {
	    new ExerciseModel();
    } catch (error) {
      addError(error);
    }
    try {
	    new GradingObjectModel();
    } catch (error) {
      addError(error);
    }
    try {
	    new GradingTableModel();
    } catch (error) {
      addError(error);
    }
    return errors;
  }

}
