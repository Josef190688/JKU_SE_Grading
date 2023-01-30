/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { AbstractGradingError, Solution } from "../exception_abstraction/AbstractGradingError";

export class AssignmentNotFoundError extends AbstractGradingError {
    constructor() {
        super('assignmentNotFound');
        this.name = 'assignment-cell not found';
        this.message = 
            'None of the cells in the notebook were recognized as an \'Assignment\' ' + 
            'because they did not contain an \'assignment_id\' key in their metadata.';
    }

    protected getAtLeastOneSolution(): [Solution, Solution[]] {
        return [
            new Solution(
                'solutions.addAssignmentCell',
                () => {
                    addAssignmentCell();
                }
            ), []
        ];
    }
}

async function addAssignmentCell() {
  // erstelle Webview-Fenster zum Abfragen der Assignment-Daten
  let uri = vscode.window.activeNotebookEditor?.notebook.uri;
  
  const panel = vscode.window.createWebviewPanel(
    'myWebview', // ID für die Webview
    'Add Assignment-Cell', // Anzeigename
    vscode.ViewColumn.One,
    { enableScripts: true }
  );
    
  // HTML und Javascript für das Form zum Abfragen der neuen Assignment-Daten
  panel.webview.html = `<!DOCTYPE html>
  <html>
  <body>
    <form>
      <label for="assignment_id">Assignment ID:</label><br>
      <input type="text" id="assignment_id" name="assignment_id"><br>
      <label for="assignment_number">Assignment Number:</label><br>
      <input type="text" id="assignment_number" name="assignment_number" oninput="validateNumber()"><br>
      <label for="assignment_title">Assignment Title:</label><br>
      <input type="text" id="assignment_title" name="assignment_title"><br>
      <label for="submissiondate">Submission Date:</label><br>
      <input type="text" id="submissiondate" name="submissiondate"><br><br>
      <h1><label id="exercise_label"></label><br></h1>
      <input type="submit" value="Submit" id="submit-button" onClick="submitForm(event)" disabled >
    </form> 
  </body>
  </html>
  <script>
    document.getElementById("assignment_id").addEventListener("input", validateId);
    document.getElementById("assignment_number").addEventListener("input", validateNumber);
    document.getElementById("assignment_title").addEventListener("input", validateTitle);
    document.getElementById("submissiondate").addEventListener("input", validateSubmissionDate);

    updateExerciseLabel();

    function validateId() {
      validateSubmitButton();
    }

    function validateNumber() {
      var input = document.getElementById("assignment_number").value;
      if (isNaN(input)) {
        document.getElementById("assignment_number").value = input.substring(0, input.length - 1);
      }
      updateExerciseLabel();
      validateSubmitButton();
    }

    function validateTitle() {
      updateExerciseLabel();
      validateSubmitButton();
    }

    function validateSubmissionDate() {
      validateSubmitButton();
    }

    function updateExerciseLabel() {
      let exercise = '{assignment_number}';
      if (document.getElementById("assignment_number").value) {
        exercise = document.getElementById("assignment_number").value;
      }
      let title = '{assignment_title}';
      if (document.getElementById("assignment_title").value) {
        title = document.getElementById("assignment_title").value;
      }
      document.getElementById("exercise_label").innerHTML =
        "Assignment " + exercise + " - " + title;
    }

    function validateSubmitButton() {
      if (
        document.getElementById("assignment_id").value &&
        document.getElementById("assignment_number").value &&
        document.getElementById("assignment_title").value &&
        document.getElementById("submissiondate").value)
      {
        document.getElementById("submit-button").disabled = false;
      } else {
        document.getElementById("submit-button").disabled = true;
      }
    }

    function submitForm(event) {
      // Send the values to the parent class
      const values = {
        assignment_id: document.getElementById("assignment_id").value,
        assignment_number: document.getElementById("assignment_number").value,
        assignment_title: document.getElementById("assignment_title").value,
        submissiondate: document.getElementById("submissiondate").value
      }
      acquireVsCodeApi().postMessage(values);
    }
  </script>`;

  // schließe Fenster wieder, wenn in ein anderes Fenster navigiert wird
  panel.onDidChangeViewState((event) => {
    if (!event.webviewPanel.active) {
        panel.dispose();
    }
  });
  
  panel.webview.onDidReceiveMessage(async (message) => {
    panel.dispose();
    
    // Auswerten und aufbereiten der Daten für die neue Notebook-Zelle
    const edit = new vscode.WorkspaceEdit();
    let cell = new vscode.NotebookCellData(
        vscode.NotebookCellKind.Markup,
        "# Assignment " + message.assignment_number + " - " + message.assignment_title,
        'en'
    );
    cell.metadata = {
      "custom": {
        "metadata": {
          "assignment_id": message.assignment_id,
          "assignment": "Assignment " + message.assignment_number + " - " + message.assignment_title,
          "deletable": false,
          "editable": false,
          "language": "en",
          "submissiondate": message.submissiondate
        }
      }
    };
    // Schreibe neue Zelle ins Notebook
    const nbEdit = vscode.NotebookEdit.insertCells(0, [cell]);
    const disposable = vscode.window.onDidChangeActiveNotebookEditor(async (e) => {
      if (e !== undefined && vscode.window.activeNotebookEditor) {
        if (uri) {
          edit.set(uri, [nbEdit]);
          await vscode.workspace.applyEdit(edit);
          await vscode.window.activeNotebookEditor.notebook.save();
          // applyEdit und save alleine genügen nicht, um das Rendering korrekt abzuschließen,
          // daher 'workbench.action.reloadWindow'
          vscode.commands.executeCommand('workbench.action.reloadWindow');
          disposable.dispose();
        }
      }
    });
  });
}