import * as vscode from 'vscode';
import * as path from 'path';
import { GradingModel } from '../model/model_access/gradingModel';
import { Exercise, ParentExercise } from '../model/implementation/exercises/exerciseModel';

export enum TreeItemType {
	assignment, parentExercise, exercise, leftToGrade, tutorName
}

export class TreeItem {
    label: string;
    type: TreeItemType;
    exercise: Exercise | undefined;
	notebookCellIndex: number; // beim Klick auf das TreeItem wird diese Notebook-Zelle angesteuert
	iconPath: string = '';

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

export class GradingForTutorsProvider implements vscode.TreeDataProvider<TreeItem> {

	constructor(gradingModel: GradingModel) {
		grading = gradingModel;
		try {
			vscode.commands.registerCommand('treeItem.gradeExercise', item => this.gradeExercise(item));
			vscode.commands.registerCommand('treeItem.removeGrade', item => this.removeGrade(item));
			vscode.commands.registerCommand('treeItem.setTutorName', item => this.setTutorName());
		} catch (error) {

		}
	}
	
	getTreeItem(item: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		switch(item.type) {
			case TreeItemType.assignment: {
				return {
					label: item.label,
					collapsibleState: vscode.TreeItemCollapsibleState.Expanded
				};
			}
			case TreeItemType.exercise: {
				return {
					label: item.label,
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					contextValue: 'exercise',
					iconPath: item.iconPath
				};
			}
			case TreeItemType.parentExercise: {
				return {
					label: item.label,
					collapsibleState: vscode.TreeItemCollapsibleState.Expanded
				};
			}
			case TreeItemType.leftToGrade: {
				return {
					label: item.label,
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					iconPath: item.iconPath
				};
			}
			case TreeItemType.tutorName: {
				return {
					label: item.label,
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					contextValue: "tutorName"
				};
			}
		}
		return {
			label: item.label
		};
	}

	getChildren(item?: TreeItem | undefined): vscode.ProviderResult<TreeItem[]> {
		// Baum soll folgende Struktur haben:
		/*
		- Assignment
			- x exercises left to grade || assignment completely graded || some result points exceed max points
		- Exercise 1
			- 1.a) ...
			- 1.b) ...
		- Exercise 2
		- Exercise 3
		- ...
		*/
		let children: TreeItem[] = [];
		let pathToCheck = path.join(__filename, '..', '..', '..', 'resources', 'check.svg');
		let pathToX = path.join(__filename, '..', '..', '..', 'resources', 'red_x.svg');
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
					// Es handelt sich um eine Aufgabe.
					// Wenn keine resultPoints, oder wenn resultPoints > maxPoints,
					// dann soll ein X bei dieser Aufgabe angezeigt werden, sonst ein Häkchen.
					let path = '';
					if (exerciseOrParentExercise.exercisePoints.result === undefined ||
						(exerciseOrParentExercise.exercisePoints.maxPoints && exerciseOrParentExercise.exercisePoints.result &&
						exerciseOrParentExercise.exercisePoints.result > exerciseOrParentExercise.exercisePoints.maxPoints))
					{
						path = pathToX;
					} else {
						path = pathToCheck;
					}
					let treeItem = new TreeItem(
						exerciseOrParentExercise.displayName,
						exerciseOrParentExercise.cell.index,
						exerciseOrParentExercise
					);
					treeItem.iconPath = path;
					children.push(treeItem);
				}
			});
		} else {
			// Kinder für Assignment erstellen
			if (item.type  === TreeItemType.assignment) {
				// Noch zu bewerten
				let resultPointsExceedMaxPoints = false;
				grading.exercises.getExercisePoints().forEach(exercise => {
					if (exercise.maxPoints && exercise.result && exercise.result > exercise.maxPoints) {
						resultPointsExceedMaxPoints = true;
					}
				});
				let label = '';
				let path = '';
				if (resultPointsExceedMaxPoints) {
					label = 'some result points exceed max points';
					path = pathToX;
				} else if (grading.exercises.getNumberOfExercisesLeftToGrade() === 1) {
					label = grading.exercises.getNumberOfExercisesLeftToGrade() + ' exercise left to grade';
					path = pathToX;
				} else if (grading.exercises.getNumberOfExercisesLeftToGrade() > 1) {
					label = grading.exercises.getNumberOfExercisesLeftToGrade() + ' exercises left to grade';
					path = pathToX;
				} else if (grading.exercises.getNumberOfExercisesLeftToGrade() === 0) {
					label = 'assignment completely graded';
					path = pathToCheck;
				}
				let treeItem = new TreeItem(
					label,
					grading.gradingTable.cell.index,
					TreeItemType.leftToGrade
				);
				treeItem.iconPath = path;
				children.push(treeItem);
				// Tutor-Name
				treeItem = new TreeItem(
					"Tutor: " + grading.assignment.getTutorName(),
					-1,
					TreeItemType.tutorName
				);
				children.push(treeItem);
			} else if (item.type === TreeItemType.parentExercise) {
				// die Kinder an ein ParentExercise anhängen
				grading.exercises.getExercises().forEach(exercise => {
					let parentMatch = item?.label?.match(/\d+/);
					let exerciseMatch = exercise.displayName.match(/\d+/);
					if (parentMatch && parentMatch[0] && exerciseMatch && exerciseMatch[0] && parentMatch[0] === exerciseMatch[0]) {
						let treeItem = new TreeItem(
							exercise.displayName,
							exercise.cell.index,
							exercise
						);
						let path = '';
						if (exercise.exercisePoints.result === undefined ||
							(exercise.exercisePoints.maxPoints && exercise.exercisePoints.result &&
							exercise.exercisePoints.result > exercise.exercisePoints.maxPoints))
						{
							path = pathToX;
						} else {
							path = pathToCheck;
						}
						treeItem.iconPath = path;
						children.push(treeItem);
					}
				});
			}
		}
		return children;
	}

	private async gradeExercise(item: TreeItem) {
		let exercise = item.exercise;

		let result = await vscode.window.showInputBox({
			placeHolder: "Enter a number",
			validateInput: (value: string) => {
				// die Eingabe muss eine gültige Zahl sein
				if (!/^\d+$/.test(value)) {
					return "Please enter a valid number";
				}
				// die neuen resultPoints dürfen maxPoints dieser Aufgabe nicht übersteigen
				else if (exercise?.exercisePoints.maxPoints && parseInt(value) > exercise?.exercisePoints.maxPoints) {
					return "Input not allowed, the grade would be higher than the maximum points for this exercise.";
				}
				// Benutzer hat die Eingabe abgebrochen
				return undefined;
			}
		});
		if (result) {
			await exercise?.setResultPoints(+result);
			await grading.gradingTable.buildGradingTableAndApplyToNotebook();
		}
    }

	private async removeGrade(item: TreeItem) {
		let exercise = item.exercise;
		if (exercise && exercise.exercisePoints.maxPoints !== undefined) {
			await exercise.setMaxPoints(exercise.exercisePoints.maxPoints);
			await grading.gradingTable.buildGradingTableAndApplyToNotebook();
		}
    }

	private async setTutorName() {
		let result = await vscode.window.showInputBox({
			placeHolder: "Enter your name"
		});
		if (result) {
			await grading.assignment.setTutorName(result);
		}
    }
}