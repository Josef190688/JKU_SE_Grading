import * as vscode from 'vscode';
import * as path from 'path';
import { GradingModel } from '../model/model_access/gradingModel';
import { Exercise } from '../model/implementation/exercises/exerciseModel';
import { ParentExercise } from '../model/implementation/exercises/exerciseModel';

enum TreeItemType { assignment, parentExercise, exercise, maxPointsAssignment, currentPointsAssignment, error }

export class TreeItem {
    label: string;
    type: TreeItemType;
    exercise: Exercise | undefined;
	notebookCellIndex: number; // beim Klick auf das TreeItem wird diese Notebook-Zelle angesteuert

    constructor(label: string, notebookCellIndex: number, typeOrExercise: TreeItemType | Exercise) {
        this.label = label;
		this.notebookCellIndex = notebookCellIndex;
        if (typeOrExercise instanceof Exercise) {
            this.type = TreeItemType.exercise;
            this.exercise = typeOrExercise;
        } else {
            this.type = typeOrExercise;
        }
    }
}

let grading: GradingModel;

export class GradingForLecturersProvider implements vscode.TreeDataProvider<TreeItem> {

	constructor(gradingModel: GradingModel) {
		grading = gradingModel;
		try {
			vscode.commands.registerCommand('treeItem.changeAchievablePoints', item => this.changeAchievablePoints(item));
			vscode.commands.registerCommand('treeItem.changeTotalAchievablePoints', () => this.changeTotalAchievablePoints());
		} catch (error) {
			
		}
	}
	
	getTreeItem(item: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		if (grading) {
			switch(item.type) {
				case TreeItemType.assignment: {
					return {
						label: item.label,
						collapsibleState: vscode.TreeItemCollapsibleState.Expanded
					};
				}
				case TreeItemType.parentExercise: {
					return {
						label: item.label,
						collapsibleState: vscode.TreeItemCollapsibleState.Expanded
					};
				}
				case TreeItemType.exercise: {
					return {
						label: item.label,
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						contextValue: 'exercise'
					};
				}
				case TreeItemType.maxPointsAssignment: {
					return {
						label: item.label,
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						contextValue: 'maxPointsAssignment'
					};
				}
				case TreeItemType.currentPointsAssignment: {
					let iconPath = '';
					if (grading.assignment.getMaxPointsForAssignment() !== grading.exercises.getSumOfAchievablePoints()) {
						iconPath = path.join(__filename, '..', '..', '..', 'resources', 'red_x.svg');
					}
					else {
						iconPath = path.join(__filename, '..', '..', '..', 'resources', 'check.svg');
					}
					return {
						label: item.label,
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						iconPath: iconPath
					};
				}
			}
		}
		return {
			label: item.label,
			collapsibleState: vscode.TreeItemCollapsibleState.None
		};
	}

	getChildren(item?: TreeItem | undefined): vscode.ProviderResult<TreeItem[]> {
		// Baum soll folgende Struktur haben:
		/*
		- Assignment
			- x maximum points for assignment
			- x points already distributed
		- Exercise 1
			- 1.a) ...
			- 1.b) ...
		- Exercise 2
		- Exercise 3
		- ...
		*/
		let children: TreeItem[] = [];
		if (!item) {
			// 1. assignment
			children.push(new TreeItem(
				grading.assignment.getTitle(),
				grading.assignment.cell.index,
				TreeItemType.assignment,
			));

			// 2. exercise
			let exercises: Set<ParentExercise | Exercise> = new Set();
			grading.exercises.getExercises().forEach((exercise) => {
				if (exercise.parent) {
					exercises.add(exercise.parent);
				} else {
					exercises.add(exercise);
				}
			});
			exercises.forEach(exerciseOrParentExercise => {
				if (exerciseOrParentExercise instanceof ParentExercise) {
					children.push(new TreeItem(
						exerciseOrParentExercise.displayName,
						exerciseOrParentExercise.cell ? exerciseOrParentExercise.cell.index : -1,
						TreeItemType.parentExercise
					));
				} else {
					children.push(new TreeItem(
						exerciseOrParentExercise.displayName,
						exerciseOrParentExercise.cell.index,
						exerciseOrParentExercise
					));
				}
			});
		} else {
			// Kinder für Assignment erstellen
			if (item.type  === TreeItemType.assignment) {
				// Maximale Punktezahl (Assignment)
				children.push(new TreeItem(
					grading.assignment.getMaxPointsForAssignment() + ' maximum points for assignment',
					grading.assignment.cell.index,
					TreeItemType.maxPointsAssignment,
				));

				// Bereits vergebene Punkte (Assignment)
				let treeItem = new TreeItem(
					grading.exercises.getSumOfAchievablePoints() + ' points already distributed',
					grading.gradingTable.cell.index,
					TreeItemType.currentPointsAssignment,
				);
				children.push(treeItem);
			} else if (item.type === TreeItemType.parentExercise) {
				grading.exercises.getExercises().forEach(exercise => {
					let parentMatch = item?.label?.match(/\d+/);
					let exerciseMatch = exercise.displayName.match(/\d+/);
					if (parentMatch && parentMatch[0] && exerciseMatch && exerciseMatch[0] && parentMatch[0] === exerciseMatch[0]) {
						children.push(new TreeItem(
							exercise.displayName,
							exercise.cell.index,
							exercise
						));
					}
				});
				
			}
		}
		return children;
	}

	private async changeTotalAchievablePoints() {
		// Prompt the user to enter a number
		let result = await vscode.window.showInputBox({
			placeHolder: "Enter a number",
			validateInput: (value: string) => {
				// Ensure that the user enters a valid number
				if (!/^\d+$/.test(value)) {
					return "Please enter a valid number";
				}
				return undefined;
			}
		});
		if (result) {
			grading.assignment.setMaxPointsForAssignment(parseInt(result));
		}
	}
	
	private async changeAchievablePoints(item: TreeItem) {
		let result = await showInputBoxAndGetValidatedResult();
		if (result) {
			let num = parseInt(result);
			const currentNotebook = vscode.window.activeNotebookEditor?.notebook;
			if (currentNotebook && item.exercise) {
				await item.exercise.setMaxPoints(num);
				await grading.gradingTable.buildGradingTableAndApplyToNotebook();
			}
		}

		async function showInputBoxAndGetValidatedResult(): Promise<string | undefined> {
			return await vscode.window.showInputBox({
				placeHolder: "Enter a number",
				validateInput: (value: string) => {
					// die Eingabe muss eine gültige Zahl sein
					if (!/^\d+$/.test(value)) {
						return "Please enter a valid number";
					}
					// die maximale Punktzahl von Assignment darf nicht überschritten werden
					let maxPoints = item.exercise?.exercisePoints.maxPoints === undefined ? 0 : item.exercise?.exercisePoints.maxPoints;
					if (grading.exercises.getSumOfAchievablePoints() - maxPoints + parseInt(value) > grading.assignment.getMaxPointsForAssignment()) {
						return "All tasks together may be worth a maximum of " + grading.assignment.getMaxPointsForAssignment() + " points. This entry would cause the value to be exceeded.";
					}
					// Benutzer hat die Eingabe abgebrochen
					return undefined;
				}
			});
		}
    }
}
