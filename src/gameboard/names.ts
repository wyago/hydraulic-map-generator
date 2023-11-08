import { iota } from "../construction";
import { normalized } from "../math";

const clusters = [
    "b",
    "br",
    "bl",
    "c",
    "cr",
    "ch",
    "cl",
    "f",
    "fr",
    "fl",
    "g",
    "gr",
    "gl",
    "k",
    "l",
    "m",
    "n",
    "p",
    "r",
    "s",
    "sh",
    "t",
    "tr",
    "th",
    "tl",
    "v",
    "w",
    "wr",
    "z"
];

const vowels = [
    "a",
    "e",
    "i",
    "o",
    "u"
];

export type Dialect = {
    finals: string[],
    finalProbability: number,
    syllables: string[],
    probabilities: number[][];
    start: number[];
}

export function makeDialect(): Dialect {
    const clusterSubset = clusters.flatMap(c => Math.random() > 0.7 ? [c] : []);
    const vowelSubset = vowels.concat(iota(Math.floor(Math.random()*5)).map(() => {
        const a = ~~(Math.random()*vowels.length);
        let b = ~~(Math.random()*vowels.length);
        while (b == a) {
            b = ~~(Math.random()*vowels.length);
        }
        return vowels[a] + vowels[b];
    }));
    const syllables = clusterSubset.flatMap(c => vowelSubset.flatMap(v => Math.random() > 0.7 ? [c + v] : []));
    const probabilities = syllables.map(x => normalized(syllables.map(y => x == y ? 0 : (1 + Math.random()/y.length))));

    return {
        finals: clusters.flatMap(c => (c.length === 1 && Math.random() > 0.7) ? [c] : []),
        finalProbability: Math.random(),
        syllables,
        probabilities,
        start: normalized(syllables.map(y => 1 + Math.random()/y.length))
    };
}

function select(probabilities: number[], exclude: number[]): number {
    const random = Math.random();
  
    let accumulated = 0;
    for (let i = 0; i < probabilities.length; i++) {
      accumulated += probabilities[i];
      if (random < accumulated && !exclude.includes(i)) {
        return i;
      }
    }
  
    return probabilities.length - 1;
}

const defaultDialect = makeDialect();
export function makeWord(dialect?: Dialect) {
    dialect = dialect ?? defaultDialect;

    const length = Math.floor(Math.random()*Math.random() * 6);
    let current = select(dialect.start, []);
    const exclude = [current];
    let result = dialect.syllables[current];
    for (let i = 0; i < length; ++i) {
        current = select(dialect.probabilities[current], exclude);
        exclude.push(current);
        result += dialect.syllables[current];
    }
    if (dialect.finalProbability > Math.random()) {
        result += dialect.finals[~~(Math.random() * dialect.finals.length)];
    }
    return result;
}

export function makeName(dialect?: Dialect) {
    const words = ~~(Math.random()*3) + 1;
    return iota(words).map(() => makeWord(dialect)).join(" ");
}

(window as any).makeName = makeName;
(window as any).makeDialect = makeDialect