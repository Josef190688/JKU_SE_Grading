import { AbstractGradingError } from "../../../exception_handling/exception_abstraction/AbstractGradingError";
import { GradingTableNumberingError } from "../../../exception_handling/exception_implementation/gradingTableNumberingError";
import { ExercisePoints } from "../exercises/exerciseModel";

export class GradingTableReader {
    private rows: string[][];

    constructor(table: string) {
        try {
            const rows = table.split('\n');
            this.rows = rows.map(row => row.split('|').map(cell => cell.trim()));
            this.getExercisePoints(); // wird hier ausgeführt, um einen potentiellen GradingTableNumberingError zu werfen
        } catch (error) {
            if (!(error instanceof AbstractGradingError)) {
                console.log('unexpected error in creating some grading model', error);
            }
            throw error;
        }
    }

    public getExercisePoints(): Set<ExercisePoints> {
        const exercisePoints = new Set<ExercisePoints>();
        let lastExercise = 0;
        this.rows.forEach(row => {
            let points: ExercisePoints = { exercise: undefined, maxPoints: undefined, result: undefined };
            if (row[1] && !isNaN(+row[1].replace(/\s+/g,''))) {
                let exercise = +row[1].replace(/\s+/g,'');
                if(exercise === undefined || exercise !== lastExercise + 1) {
                    throw new GradingTableNumberingError();
                }
                lastExercise = exercise;
                points.exercise = exercise;
            }
            if (row[2] && !isNaN(+row[2].replace(/\s+/g,''))) {
                points.maxPoints = +row[2].replace(/\s+/g,'');
            }
            if (row[3] && !isNaN(+row[3].replace(/\s+/g,''))) {
                points.result = +row[3].replace(/\s+/g,'');
            }
            if (points.exercise || points.maxPoints || points.result) {
                exercisePoints.add(points);
            }
        });
        return exercisePoints;
    }

    public getSumPoints(): { maxPoints: number, resultPoints: number } {
        let maxPoints = 0;
        let resultPoints = 0;
        this.rows.forEach(row => {
            if (!isNaN(+row[1].replace(/\s+/g,'')) && !isNaN(+row[2].replace(/\s+/g,''))) {
                maxPoints += +row[1].replace(/\s+/g,'');
                resultPoints += +row[2].replace(/\s+/g,'');
            }
        });
        return { maxPoints, resultPoints };
    }
}