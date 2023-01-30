export class GradingTableBuilder {
    private rows: string[];
  
    constructor() {
        this.rows = [
            "| Exercise    | Max Points   | Result      |\n",
            "| :-----------| :----------: | ----------: |\n"
        ];
    }

    // Fügt eine neue Zeile hinzu, nur mit exercise
    addRowWithoutPoints(exercise: number) {
        let exerciseString = exercise.toString().padEnd(13, ' ');
        let row = `|${exerciseString}|              |             |\n`;
        this.rows.push(row);
    }

    // Fügt eine neue Zeile hinzu mit maxPoints, ohne result
    addRowWithMaxPoints(exercise: number, maxPoints: number) {
        let exerciseString = exercise.toString().padEnd(13, ' ');
        let maxPointsString = maxPoints.toString().padEnd(14, ' ');
        let row = `|${exerciseString}|${maxPointsString}|             |\n`;
        this.rows.push(row);
    }

    // Fügt eine neue Zeile hinzu mit maxPoints und result
    addRowWithMaxPointsAndResult(exercise: number, maxPoints: number, result: number) {
        let exerciseString = exercise.toString().padEnd(13, ' ');
        let maxPointsString = maxPoints.toString().padEnd(14, ' ');
        let resultString = result.toString().padEnd(13, ' ');
        let row = `|${exerciseString}|${maxPointsString}|${resultString}|\n`;
        this.rows.push(row);
    }
  
    // Berechnet die Summe der "Max Points"- und "Result"-Spalten und fügt sie als neue Zeile hinzu
    private addTotalRow() {
    let maxPointsTotal = 0;
    let resultTotal = 0;
    for (let i = 2; i < this.rows.length; i++) {
        let row = this.rows[i];
        let maxPointsMatch = row.match(/^\|\s*\d+\s*\|(\s*\d+\s*)\|/);
        let resultMatch = row.match(/^\|\s*\d+\s*\|\s*\d+\s*\|(\s*\d+\s*)\|\s*$/);
        if (maxPointsMatch) {
            maxPointsTotal += parseInt(maxPointsMatch[1]);
        }
        if (resultMatch) {
            resultTotal += parseInt(resultMatch[1]);
        }
    }
    let maxPointsTotalString = maxPointsTotal.toString().padEnd(14, ' ');
    let resultTotalString = "             ";
    if (resultTotal !== 0) {
        resultTotalString = resultTotal.toString().padEnd(13, ' ');
    }
    let sumLine = `|_____________|______________|_____________|\n`;
    let totalRow = `|Sum          |${maxPointsTotalString}|${resultTotalString}|`;
    this.rows.push(sumLine);
    this.rows.push(totalRow);
    }
  
    // Gibt die GradingTable als einen einzelnen String zurück
    toString(): string {
        this.addTotalRow();
        return this.rows.join('');
    }
  }
  