import * as THREE from "three";
import { clamp, lerp } from "../math";
import { TileSet } from "./PointSet";

export type ConfigNumber = { get(): number };
export type ConfigBoolean = { get(): boolean };

export type EroderConfiguration = {
    rainfall: ConfigNumber;
    wind: ConfigNumber;
    siltAngle: ConfigNumber;
    rockAngle: ConfigNumber;
    water: ConfigNumber;
}

export class Eroder {
    readonly tiles: TileSet;
    readonly configuration: EroderConfiguration;

    constructor(tiles: TileSet, configuration: EroderConfiguration) {
        this.tiles = tiles;
        this.configuration = configuration;

        this.resetWater();
    }

    fixWater() {
        let currentWater = 0;
        let goal = 0;
        let targets = 0;
        const waterHeight = this.configuration.water.get();
        for (let i = 0; i < this.tiles.count; ++i) {
            if (this.tiles.hard[i] < waterHeight) {
                this.tiles.water[i] = waterHeight - this.tiles.hard[i];
            }
        }

        for (let i = 0; i < this.tiles.count; ++i) {
            currentWater += this.tiles.water[i];
            goal += Math.max(waterHeight - this.tiles.hard[i], 0);
            if (this.tiles.hard[i] < waterHeight) {
                targets += 1;
            }
        } 
        
        const add = (goal - currentWater)/targets;
        for (let i = 0; i < this.tiles.count; ++i) {
            if (this.tiles.hard[i] < waterHeight) {
                this.tiles.water[i] += add;
            }
        }
        
        for (let i = 0; i < this.tiles.count; ++i) {
            if (this.tiles.hard[i] < waterHeight) {
                this.tiles.water[i] = waterHeight - this.tiles.hard[i];
            }
        }
    }

    passTime() {
        for (let current = 0; current < this.tiles.count; ++current) {
            this.tiles.river[current] *= 0.95;
            this.tiles.vegetation[current] += this.tiles.aquifer[current]*0.3;
            this.tiles.vegetation[current] = clamp(this.tiles.vegetation[current] * 0.97, 0, 1);

            const adjs = this.tiles.adjacents[current];
            for (let i = 0; i < adjs.length; ++i) {
                const target = adjs[i];
                const transfer = (this.tiles.vegetation[current] - this.tiles.vegetation[target])*0.05/adjs.length;
                this.tiles.vegetation[current] -= transfer;
                this.tiles.vegetation[target] += transfer;
            }

            if (this.tiles.water[current] > 0.01) {
                this.tiles.vegetation[current] -= this.tiles.water[current] - 0.01;
            }

            if (this.tiles.water[current] < 0) {
                this.tiles.water[current] = 0;
            // Model turbulent shallow water erosion (coastal sand is a useful outcome)
            } else if (this.tiles.water[current] > 0.01 && this.tiles.water[current] < 0.08) {
                this.simpleErode(current, clamp(0.2 - this.tiles.water[current], 0, 1)*0.2);
            }

            if (this.tiles.snow[current] > 0) {
                let target = this.tiles.downhill(current);
                const snowDelta = this.tiles.snow[current] - this.tiles.snow[target];
                const slide = snowDelta * 0.1;
                this.tiles.snow[current] -= slide;
                this.tiles.snow[target] += slide;

                const delta = this.tiles.rockElevation(current) - this.tiles.rockElevation(target);
                if (delta > 0) {
                    const scrape = Math.min(slide*slide, this.tiles.hard[current], delta*0.2);
                    this.tiles.hard[current] -= scrape;
                    this.tiles.hard[target] += scrape;
                }

                if (this.tiles.rockElevation(current) < 0.7) {
                    const melt = Math.min((0.8 - this.tiles.rockElevation(current)) * 0.2, this.tiles.snow[current]);
                    this.tiles.snow[current] -= melt;
                    this.tiles.water[target] += melt*0.5;
                }
                this.tiles.snow[current] = clamp(this.tiles.snow[current], 0, 1);
            }
        }
    }

    globalRivers() {
        for (let i = 0; i < this.tiles.count; ++i) {
            const occlusion = this.tiles.totalElevation(i) - this.tiles.occlusion[i];
            let occlusionFactor = occlusion > -0 ? 1 : 0.01;
            const base = 0.03*this.tiles.rockElevation(i) + 0.0001;
            this.tiles.water[i] += base*occlusionFactor;

            if (this.tiles.rockElevation(i) > 0.9 && occlusion > -0) {
                this.tiles.snow[i] = clamp(this.tiles.snow[i] + 0.2, 0, 1);
            }
        }
    }
    
    simpleErode(center: number, amount: number) {
        const hardFactor = clamp(amount*0.1*this.tiles.hard[center]*(0.2 - this.tiles.soft[center]), 0, this.tiles.hard[center]);
        this.tiles.hard[center] -= hardFactor;
        this.tiles.soft[center] += hardFactor;
    }

    getWind() {
        return {
            x: this.wind.x,
            y: -this.wind.y
        }
    }

    wind = new THREE.Vector2(); 
    start = 0;
    deriveOcclusion(radius: number, windInfluence: { x: number, y: number }) {
        const angle = Math.random() * 2 * Math.PI;

        const wind = Math.sqrt(windInfluence.x*windInfluence.x + windInfluence.y*windInfluence.y);

        this.wind.x += lerp(Math.cos(angle)*0.04, windInfluence.x, Math.pow(wind, 4));
        this.wind.y -= lerp(Math.sin(angle)*0.04, windInfluence.y, Math.pow(wind, 4));

        if (this.wind.length() > 1) {
            this.wind.normalize();
        }

        const nwind = this.wind.clone().normalize();

        const targets = new Array<number>(100);

        const count = 10;

        for (let i = 0; i < this.tiles.count; ++i) {
            const source = i%this.tiles.count;
            if (this.tiles.surfaceWater(source) > 0.07) {
                this.tiles.occlusion[source] =  this.tiles.totalElevation(source);
            }

            const length = this.tiles.byDirection(source, nwind, targets, 0.5);
            for (let j = 0; j < length; ++j) {
                const target = targets[j];
                this.tiles.occlusion[target] =  Math.max(this.tiles.totalElevation(source), this.tiles.totalElevation(target), this.tiles.occlusion[source]);
            }
        }

        this.start += count;
        if (this.start > this.tiles.count) {
            this.start = 0;
        }
    }

    deriveUphills() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const original = this.tiles.uphill[source];
            let next = original;
            let highest = Number.MIN_VALUE;
            for (let j = 0; j < this.tiles.adjacents[source].length; ++j) {
                const target = this.tiles.adjacents[source][j];
                const factor = this.tiles.totalElevation(target);
                if (factor > highest) {
                    next = target;
                    highest = factor;
                }
            }

            this.tiles.uphill[source] = next;
        }
    }

    iterateRivers() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const target = this.tiles.downhill(source);
            const delta = (this.tiles.rockElevation(source) - this.tiles.rockElevation(target));
            if (delta < 0) {
                continue;
            }

            const pressure = 0.03*this.tiles.river[source]*(0.2 - this.tiles.soft[source]);
            const erosion = clamp(Math.min(pressure, this.tiles.hard[source]), 0, 1);
            this.tiles.hard[source] -= erosion;
            this.tiles.soft[source] += erosion;
        }
    }

    spreadWater() {
        for (let i = 0; i < this.tiles.count; ++i) {
            const water = this.tiles.water[i];
            const aquiferSpace = this.tiles.aquiferSpace(i);
            if (aquiferSpace > 0 && water > 0) {
                const soak = Math.min(water * 0.2, aquiferSpace);
                this.tiles.aquifer[i] += soak;
                this.tiles.water[i] -= soak;
            }

            if (this.tiles.aquifer[i] > this.tiles.soft[i]) {
                const release = this.tiles.aquifer[i] - this.tiles.soft[i];
                this.tiles.water[i] += release;
                this.tiles.aquifer[i] -= release;
            }
        }

        for (let source = 0; source < this.tiles.count; ++source) {
            if (this.tiles.water[source] <= 0.001) {
                continue;
            }
            const target = this.tiles.waterTableDownhill(source);
            const delta = this.tiles.waterTable(source) - this.tiles.waterTable(target);
            if (delta < 0) {
                continue;
            }
            
            const friction = clamp(1 - this.tiles.soft[source]*2 + this.tiles.surfaceWater(source)*2, 0.1, 1);
            let transfer = Math.min(delta * 0.4 * friction, this.tiles.water[source]);

            this.tiles.water[source] -= transfer;
            this.tiles.water[target] += transfer;

            if (transfer > 0) {
                const rockDelta = this.tiles.rockElevation(source) - this.tiles.rockElevation(target);
                const square = clamp(transfer - this.tiles.surfaceWater(source), 0, 1);
                this.simpleErode(source, square*2);

                const erosion = clamp(Math.min(square*rockDelta*0.2, this.tiles.soft[source], rockDelta*0.5), 0, 1);
                this.tiles.soft[source] -= erosion;
                this.tiles.soft[target] += erosion;
            }
        }

        for (let source = 0; source < this.tiles.count; ++source) {
            if (this.tiles.water[source] <= 0.001) {
                continue;
            }
            const target = this.tiles.downhill(source);
            const delta = this.tiles.totalElevation(source) - this.tiles.totalElevation(target);
            if (delta < 0) {
                continue;
            }
            
            let transfer = Math.min(delta * 0.5, this.tiles.water[source]);

            this.tiles.water[source] -= transfer;
            this.tiles.water[target] += transfer;

            this.tiles.river[source] += transfer;

            if (transfer > 0) {
                const rockDelta = this.tiles.rockElevation(source) - this.tiles.rockElevation(target);
                const square = clamp(transfer - this.tiles.surfaceWater(source), 0, 1);
                this.simpleErode(source, square*2);

                const erosion = clamp(Math.min(square*rockDelta*2.8, this.tiles.soft[source], rockDelta*0.5), 0, 1);
                this.tiles.soft[source] -= erosion;
                this.tiles.soft[target] += erosion;
            }
        }
    }

    landslide() {
        const siltAngle = this.configuration.siltAngle.get();
        const rockAngle = this.configuration.rockAngle.get();
        for (let source = 0; source < this.tiles.count; ++source) {
            let target = this.tiles.downhill(source);
            let delta = this.tiles.rockElevation(source) - this.tiles.rockElevation(target);
            let sagAngle = clamp(siltAngle * clamp(1 - this.tiles.soak(source), 0.6, 1), 0.001, 1);
            if (delta > sagAngle) {
                const transfer = Math.min((delta - sagAngle) * 0.1, this.tiles.soft[source]);

                this.tiles.soft[source] -= transfer;
                this.tiles.soft[target] += transfer;
            }
            target = this.tiles.downhill(source);
            delta = this.tiles.rockElevation(source) - this.tiles.rockElevation(target);
            if (delta > rockAngle) {
                const transfer = Math.min((delta - rockAngle) * 0.1, this.tiles.hard[source]);

                this.tiles.hard[source] -= transfer;
                this.tiles.hard[target] += transfer;
            }
        }
    }

    resetWater() {
        const waterHeight = this.configuration.water.get();
        for (let source = 0; source < this.tiles.count; ++source) { 
            this.tiles.water[source] = Math.max(waterHeight - this.tiles.hard[source], 0) + this.tiles.soft[source];
        }
    }

    rain() {
        for (let source = 0; source < this.tiles.count; ++source) { 
            let target = this.tiles.downhill[source];
            for (let i = 0; i < 1000 && this.tiles.totalElevation(target) < this.tiles.totalElevation(source); ++i) {
                source = target;
                target = this.tiles.downhill[source];
            }

            if (this.tiles.rockElevation(source) > 0.2 && this.tiles.surfaceWater(source) < 0.1) {
                this.tiles.water[source] += 0.01;
            }
        }
    }
}