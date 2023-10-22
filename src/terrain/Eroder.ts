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
    readonly points: TileSet;
    readonly configuration: EroderConfiguration;

    constructor(tiles: TileSet, configuration: EroderConfiguration) {
        this.points = tiles;
        this.configuration = configuration;

        this.resetWater();
    }

    tideI = 0;
    fixWater() {
        this.tideI += 1;
        const waterHeight = this.configuration.water.get() + Math.sin(this.tideI * 0.05)*0.02;
        for (let i = 0; i < this.points.count; ++i) {
            if (this.points.rockElevation(i) < waterHeight) {
                this.points.water[i] = waterHeight - this.points.hard[i];
                this.points.aquifer[i] = this.points.soft[i];
            }
        }
    }

    spreadVegetation(current: number) {
        this.points.vegetation[current] += this.points.aquifer[current]*0.1;
        this.points.vegetation[current] *= 0.99;

        const adjs = this.points.adjacents[current];
        for (let i = 0; i < adjs.length; ++i) {
            const target = adjs[i];
            const transfer = (this.points.vegetation[current] - this.points.vegetation[target])*0.05/adjs.length;
            this.points.vegetation[current] -= transfer;
            this.points.vegetation[target] += transfer;
        }

        if (this.points.water[current] > 0.01) {
            this.points.vegetation[current] -= this.points.water[current] - 0.01;
        }
    }

    spreadSnow(current: number) {
        if (this.points.snow[current] > 0) {
            let target = this.points.downhill(current);
            const snowDelta = this.points.snow[current] - this.points.snow[target];
            const slide = snowDelta * 0.1;
            this.points.snow[current] -= slide;
            this.points.snow[target] += slide;

            const delta = this.points.rockElevation(current) - this.points.rockElevation(target);
            if (delta > 0) {
                const scrape = Math.min(slide*slide, this.points.hard[current], delta*0.2);
                this.points.hard[current] -= scrape;
                this.points.hard[target] += scrape;
            }

            if (this.points.rockElevation(current) < 0.7) {
                const melt = Math.min((0.8 - this.points.rockElevation(current)) * 0.05, this.points.snow[current]);
                this.points.snow[current] -= melt;
                this.points.water[target] += melt*0.5;
            }
            this.points.snow[current] = clamp(this.points.snow[current], 0, 1);
        }
    }

    passTime() {
        for (let current = 0; current < this.points.count; ++current) {
            this.points.river[current] *= 0.98;
            this.spreadVegetation(current);
            this.spreadSnow(current);

            if (this.points.water[current] < 0) {
                this.points.water[current] = 0;
            // Model turbulent shallow water erosion (coastal sand is a useful outcome)
            } else if (this.points.water[current] > 0.01 && this.points.water[current] < 0.08) {
                this.simpleErode(current, clamp(0.2 - this.points.water[current], 0, 1)*0.2);
            }
        }
    }

    rain() {
        for (let i = 0; i < this.points.count; ++i) {
            const occlusion = this.points.totalElevation(i) - this.points.occlusion[i] + Number.EPSILON*10;
            let occlusionFactor = occlusion > -0 ? 1 : 0.001;
            const base = 0.002*this.points.rockElevation(i) + 0.001;
            this.points.water[i] += base*occlusionFactor/15;

            if (this.points.rockElevation(i) > 0.9 && occlusion > -0) {
                this.points.snow[i] = clamp(this.points.snow[i] + 0.2, 0, 1);
            }
        }
    }
    
    simpleErode(center: number, amount: number) {
        const hardFactor = clamp(amount*0.1*this.points.hard[center]*(0.2 - this.points.soft[center]), 0, this.points.hard[center]);
        this.points.hard[center] -= hardFactor;
        this.points.soft[center] += hardFactor;
    }

    getWind() {
        return {
            x: this.wind.x,
            y: -this.wind.y
        }
    }

    wind = new THREE.Vector2(); 
    start = 0;
    deriveOcclusion(windInfluence: { x: number, y: number }) {
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

        for (let i = 0; i < this.points.count; ++i) {
            const source = i%this.points.count;
            if (this.points.surfaceWater(source) > 0.07) {
                this.points.occlusion[source] =  this.points.totalElevation(source);
            }

            const length = this.points.byDirection(source, nwind, targets, 0.5);
            for (let j = 0; j < length; ++j) {
                const target = targets[j];
                this.points.occlusion[target] =  Math.max(this.points.totalElevation(source), this.points.totalElevation(target), this.points.occlusion[source]);
            }
        }

        this.start += count;
        if (this.start > this.points.count) {
            this.start = 0;
        }
    }

    deriveUphills() {
        for (let source = 0; source < this.points.count; ++source) {
            const original = this.points.uphill[source];
            let next = original;
            let highest = Number.MIN_VALUE;
            for (let j = 0; j < this.points.adjacents[source].length; ++j) {
                const target = this.points.adjacents[source][j];
                const factor = this.points.totalElevation(target);
                if (factor > highest) {
                    next = target;
                    highest = factor;
                }
            }

            this.points.uphill[source] = next;
        }
    }

    iterateRivers() {
        for (let source = 0; source < this.points.count; ++source) {
            const target = this.points.downhill(source);
            const delta = (this.points.rockElevation(source) - this.points.rockElevation(target));
            if (delta < 0) {
                continue;
            }

            const pressure = 0.03*this.points.river[source]*(0.2 - this.points.soft[source]);
            const erosion = clamp(Math.min(pressure, this.points.hard[source]), 0, 1);
            this.points.hard[source] -= erosion;
            this.points.soft[source] += erosion;
        }
    }

    spreadWater() {
        for (let i = 0; i < this.points.count; ++i) {
            const water = this.points.water[i];
            const aquiferSpace = this.points.aquiferSpace(i);
            if (aquiferSpace > 0 && water > 0) {
                const soak = Math.min(water, aquiferSpace*0.01);
                this.points.aquifer[i] += soak;
                this.points.water[i] -= soak;
            }

            if (this.points.aquifer[i] > this.points.soft[i]) {
                const release = this.points.aquifer[i] - this.points.soft[i];
                this.points.water[i] += release;
                this.points.aquifer[i] -= release;
            }
        }

        for (let source = 0; source < this.points.count; ++source) {
            if (this.points.water[source] <= 0.001) {
                continue;
            }
            const target = this.points.waterTableDownhill(source);
            const delta = this.points.waterTable(source) - this.points.waterTable(target);
            if (delta < 0) {
                continue;
            }
            
            const friction = clamp(1 - this.points.soft[source]*2 + this.points.surfaceWater(source)*2, 0.1, 1);
            let transfer = Math.min(delta * 0.2 * friction, this.points.aquifer[source]);

            this.points.aquifer[source] -= transfer;
            this.points.aquifer[target] += transfer;

            if (transfer > 0) {
                const rockDelta = this.points.rockElevation(source) - this.points.rockElevation(target);
                const square = clamp(transfer - this.points.surfaceWater(source), 0, 1);

                const erosion = clamp(Math.min(square*rockDelta*0.05, this.points.soft[source], delta*0.5), 0, 1);
                this.points.soft[source] -= erosion;
                this.points.soft[target] += erosion;
            }
        }

        for (let source = 0; source < this.points.count; ++source) {
            if (this.points.water[source] <= 0.001) {
                continue;
            }
            const targetIndex = this.points.downhillIndex(source);
            const target = this.points.adjacents[source][targetIndex];
            const delta = this.points.totalElevation(source) - this.points.totalElevation(target);
            if (delta < 0) {
                continue;
            }
            
            let transfer = Math.min(delta * 0.45, this.points.water[source]);

            this.points.water[source] -= transfer;
            this.points.water[target] += transfer;

            this.points.river[source] += transfer;

            const rockDelta = this.points.rockElevation(source) - this.points.rockElevation(target);
            if (transfer > 0 && rockDelta > 0) {
                const square = clamp(transfer, 0, 1);
                this.simpleErode(source, square*10);

                const erosion = clamp(Math.min(square*rockDelta*40.8, this.points.soft[source], delta*0.5 - transfer), 0, 1);
                this.points.soft[source] -= erosion;
                this.points.soft[target] += erosion;
            }
        }
    }

    landslide() {
        const siltAngle = this.configuration.siltAngle.get();
        const rockAngle = this.configuration.rockAngle.get();
        for (let source = 0; source < this.points.count; ++source) {
            let target = this.points.downhill(source);
            let delta = this.points.rockElevation(source) - this.points.rockElevation(target);
            let sagAngle = clamp(siltAngle * clamp(1 - this.points.soak(source), 0.6, 1), 0.001, 1);
            if (delta > sagAngle) {
                const transfer = Math.min((delta - sagAngle) * 0.1, this.points.soft[source]);

                this.points.soft[source] -= transfer;
                this.points.soft[target] += transfer;
            }
            target = this.points.downhill(source);
            delta = this.points.rockElevation(source) - this.points.rockElevation(target);
            if (delta > rockAngle) {
                const transfer = Math.min((delta - rockAngle) * 0.1, this.points.hard[source]);

                this.points.hard[source] -= transfer;
                this.points.hard[target] += transfer;
            }
        }
    }

    resetWater() {
        const waterHeight = this.configuration.water.get();
        for (let source = 0; source < this.points.count; ++source) { 
            this.points.water[source] = Math.max(waterHeight - this.points.hard[source], 0) + this.points.soft[source];
        }
    }
}