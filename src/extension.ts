import * as vscode from 'vscode';

import { createGradingView } from './view/viewManager';
import { User } from './view/viewManager';

let timer: NodeJS.Timeout;

export function activate(context: vscode.ExtensionContext) {
	vscode.window.onDidChangeActiveNotebookEditor(() => {
		createGradingView(context, User.lecturer);
		createGradingView(context, User.tutor);
	});
	vscode.workspace.onDidChangeNotebookDocument(() => {
		clearTimeout(timer);
		timer = setTimeout(() => {
		  	createGradingView(context, User.lecturer);
		  	createGradingView(context, User.tutor);
		}, 200);
	});
}