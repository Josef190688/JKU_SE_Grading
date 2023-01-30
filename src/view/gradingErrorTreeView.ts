import * as vscode from 'vscode';
import { GradingErrorModel } from '../model/model_access/gradingErrorModel';
import { AbstractGradingError } from '../exception_handling/exception_abstraction/AbstractGradingError';

let errorModel: GradingErrorModel;

export class GradingErrorProvider implements vscode.TreeDataProvider<AbstractGradingError> {

	constructor(model: GradingErrorModel) {
		errorModel = model;
	}

	getTreeItem(item: AbstractGradingError): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return {
			label: item.name,
			tooltip: item.message,
			contextValue: item.contextValue,
			collapsibleState: vscode.TreeItemCollapsibleState.None
		};
	}

	getChildren(item?: AbstractGradingError | undefined): vscode.ProviderResult<AbstractGradingError[]> {
		if (!vscode.window.activeNotebookEditor) { return []; }
		let children: AbstractGradingError[] = [];
		errorModel.getErrors().forEach(error => {
			children.push(error);
		});
		return children;
	}

}