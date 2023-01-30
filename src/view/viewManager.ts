import * as vscode from 'vscode';
import { AbstractGradingError } from "../exception_handling/exception_abstraction/AbstractGradingError";
import { GradingErrorModel } from "../model/model_access/gradingErrorModel";
import { GradingModel } from "../model/model_access/gradingModel";
import { GradingErrorProvider } from "./gradingErrorTreeView";
import { GradingForTutorsProvider } from "./gradingForTutorsTreeView";
import { GradingForLecturersProvider } from './gradingForLecturersTreeView';
import { TreeItem } from 'vscode';

let currentTutorsView: vscode.TreeView<TreeItem> | vscode.TreeView<AbstractGradingError> | undefined;
let currentLecturersView: vscode.TreeView<TreeItem> | vscode.TreeView<AbstractGradingError> | undefined;
let currentGradingModel: GradingModel | undefined;

export enum User { lecturer, tutor };

/**
 * Abhängig von der Struktur der Notebook-Datei wird eine TreeView
 * mit entsprechendem Model geladen:
 * 
 * Eine TreeView mit {@link GradingErrorModel} wird verwendet,
 * wenn ein Grading auf dem Notebook nicht möglich ist.
 * 
 * Eine TreeView mit {@link GradingModel} wird verwendet,
 * wenn ein Grading potentiell fehlerfrei durchgeführt werden kann.
 */
export async function createGradingView(context: vscode.ExtensionContext, typeOfUser: User) {
	if (currentLecturersView) {
		let index = context.subscriptions.indexOf(currentLecturersView);
		if (index >= 0) {
			context.subscriptions.splice(index, 1);
		}
	}
	if (currentTutorsView) {
		let index = context.subscriptions.indexOf(currentTutorsView);
		if (index >= 0) {
			context.subscriptions.splice(index, 1);
		}
	}
	// Wenn Notebook-Datei einer Struktur entspricht, die fehlerloses Grading verspricht,
	// dann wird eine TreeView mit GradingModel erstellt.
	try {
		// erstelle GradingModel
		let gradingModel;
		if (currentGradingModel) {
			gradingModel = currentGradingModel;
			await gradingModel.refresh();
		}
		else { gradingModel = await GradingModel.create(); }
		// erstelle View
		let view;
		if (typeOfUser === User.lecturer) {
			view = vscode.window.createTreeView(
				'JKU Grading for Lecturers',
				{ treeDataProvider: new GradingForLecturersProvider(gradingModel), showCollapseAll: false });
		} else if (typeOfUser = User.tutor) {
			view = vscode.window.createTreeView(
				'JKU Grading for Tutors',
				{ treeDataProvider: new GradingForTutorsProvider(gradingModel), showCollapseAll: false });
		}
		if (view) {
			// implementiere Funktion: springe im Notebook an die im TreeView angewählte Position
			view.onDidChangeSelection(e => {
				let currentEditor = vscode.window.activeNotebookEditor;
				let index = e.selection[0].notebookCellIndex;
				if (currentEditor) {
					let range = new vscode.NotebookRange(index, index);
					currentEditor.selection = range;
					vscode.window.activeNotebookEditor?.revealRange(range, vscode.NotebookEditorRevealType.AtTop);
				}
			});
			// Variablen festlegen zum ordnungsgemäßen Registrieren / Deregistrieren der Views
			context.subscriptions.push(view);
			currentGradingModel = gradingModel;
			if (typeOfUser === User.lecturer) { currentLecturersView = view; }
			if (typeOfUser === User.tutor) { currentTutorsView = view; }
		}
	}
	// Wenn Notebook-Datei einer Struktur entspricht, die fehlerhaftes Grading verursacht,
	// dann wird eine TreeView mit GradingErrorModel erstellt.
	catch (error) {
		currentGradingModel = undefined;
		let view = vscode.window.createTreeView(
			typeOfUser ===
				User.lecturer ? 'JKU Grading for Lecturers' :
				User.tutor ? 'JKU Grading for Tutors' :	'',
			{ treeDataProvider: new GradingErrorProvider(new GradingErrorModel()), showCollapseAll: false });
		context.subscriptions.push(view);
		if (typeOfUser === User.lecturer) { currentLecturersView = view; }
		if (typeOfUser === User.tutor) { currentTutorsView = view; }
	}

}
