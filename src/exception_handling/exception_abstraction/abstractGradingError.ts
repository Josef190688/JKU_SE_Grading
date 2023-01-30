import * as vscode from 'vscode';

/**
 * AbstractGradingError ist dazu gedacht, dass er in einer ErrorTreeView angezeigt wird,
 * wenn Grading aufgrund eines definierten Fehlers nicht möglich ist.
 *
 * Der Error spiegelt also das TreeItem wider, das angezeig wird.
 * 
 * Vorgehen, wenn man einen AbstractGradingError implementieren will:
 * 
 * 1. in package.json muss in "commands" ein command definiert sein.
 * Dieser Command spiegelt die Lösung wider, die man auf diesen Error anwenden möchte.
 * 
 * 2. in package.json muss in "menus" unter "view/item/context" ein Eintrag angelegt werden,
 * der auf genau diesen command verweist. Dieser Eintrag sagt aus, unter welchen Bedingungen
 * denn ein Kontextmenü-Eintrag (eine Lösung) angezeigt werden soll.
 * 
 * Beispiel: "assignment_id" wurde in den Metadaten nicht gefunden. Da das GradingObjet
 * aber in die Zelle mit "assignment_id" gespeichert werden soll, wird dies zu einem Fehler führen,
 * den man vermeiden möchte.
 * 
 * Hat man nun eine Lösung, die man anwenden kann, legt man folgende Einträge an:
 * 
 * Unter "commands":
 * 
 * "command": "solutions.addAssignmentCell",
 * "title": "add assignment-cell"
 * 
 * Unter "view/item/context" in "menus":
 * 
 * "command": "solutions.addAssignmentCell",
 * "when": "viewItem == assignmentNotFound" (hier einen eindeutigen Bezeichner überlegen)
 * 
 * Für jede Lösung, die man für einen Error anbieten möchte, wiederhole Schritt 1 und 2.
 * 
 * 3. contextValue (in diesem Fall "assignmentNotFound") aus der "when"-Bedingung muss im
 * Konstruktor von AbstractGradingError angegeben werden. Dies muss zusammen passen,
 * ansonsten kann die Lösung nicht gefunden werden.
 * 
 * 4. Beim Konstruieren des AbstractGradingErrors gibt man this.name und this.message an.
 * 
 * this.name spiegelt den Anzeigenamen des Errors in der TreeView wider.
 * 
 * this.message spiegelt die Beschreibung des Errors wider, die angezeigt wird, wenn man
 * mit der Maus über das TreeItem navigiert.
 * 
 * 5. In jeder Solution muss man nun im Konstruktor den Identifier desjenigen commands übergeben,
 * auf den man referenzieren möchte. "solutions.addAssignmentCell" also in diesem Fall.
 */
export abstract class AbstractGradingError extends Error {
    readonly contextValue: string;

    /**
     * AbstractGradingError ist dazu gedacht, dass er in einer ErrorTreeView angezeigt wird,
     * wenn Grading aufgrund eines definierten Fehlers nicht möglich ist.
     * 
     * Der Error spiegelt also das TreeItem wider, das angezeig wird.
     * 
     * Wenn man nun einen Kontextmenü-Eintrag auf diesem TreeItem anzeigen möchte,
     * muss dieser in der package.json unter "menus": "view/item/context": [ ... angeführt sein
     * und auf einen command verweisen, der bei Klick auf diesen Kontextmenü-Eintrag
     * ausgeführt werden soll.
     * 
     * Dies kann so aussehen:
     * 
     * "command": "solutions.addGradingTableCell",
     * "when": "viewItem == gradingTableNotFound"
     * 
     * Wenn diese "when"-Bedingung fehlt, wird der Kontextmenü-Eintrag in jedem TreeItem angezeigt,
     * das es gibt. Daher muss man über diesen contextValue referenzieren, auf welches
     * viewItem ein Kontextmenü-Eintrag angewendet werden soll.
     * @param contextValue - muss übereinstimmen mit dem contextValue aus package.json
     * 
     * (zB contextValue "gradingTableNotFound" bei viewItem == gradingTableNotFound)
     */
    constructor(contextValue: string) {
        super();
        this.contextValue = contextValue;

        // Dieser Aufruf sorgt dafür, dass die Solutions auf jeden Fall erzeugt
        // und damit die commands registriert werden.
        this.getSolutions();
    }

    public getSolutions(): Solution[] {
        return [this.getAtLeastOneSolution()[0]].concat(this.getAtLeastOneSolution()[1]);
    }

    protected abstract getAtLeastOneSolution(): [Solution, Solution[]];
}

export class Solution {
    readonly command: string;
    readonly applySolution: () => void;

    /**
     * Eine Solution ist eine Funktion, die ausgeführt werden kann,
     * um einen GradingError zu beheben.
     * Dazu muss ein command aus package.json referenziert und registriert werden,
     * dies geschieht in dieser Klasse.
     * 
     * @param command - command muss ein existierender identifier in einem command-Eintrag der package.json sein.
     * 
     * Beispiel:
     * 
     * "solutions.addAssignmentCell" muss übergeben werden, wenn man folgenden command aus package.json ausführen will:
     * 
     * "commands": [
     *    {
     *        "command": "solutions.addAssignmentCell",
     *        "title": "add assignment-cell"
     *    }
     * ]
     * 
     * Um die Registrierung muss man sich dann nicht mehr kümmern, das geschieht im Solution-Konstruktor automatisch.
     * 
     * @param solutionFunction - diese Funktion wird ausgeführt, sobald der command über das Kontextmenü gestartet wird
     */
    constructor(command: string, solutionFunction: () => void) {
		try {
			vscode.commands.registerCommand(command, solutionFunction);
		} catch (error) {
			
		}
        this.applySolution = solutionFunction;
        this.command = command;
    }

    /**
     * da immer mindestens eine Lösung vorliegen muss für einen AbstractGradingError,
     * man aber die Lösung vielleicht noch nicht implementiert hat, gibt es hier
     * die Möglichkeit, einen Dummy zu erstellen, der besagt, dass noch keine Lösung
     * implementiert wurde.
     * @returns Lösung, die aussagt, dass die Lösung noch nicht implementiert wurde
     */
    public static createNoSolutionImplementedObject(): Solution {
        return new Solution("solutions.noSolution", () => {});
    }
}
