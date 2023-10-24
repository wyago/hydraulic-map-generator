import * as THREE from "three";
import { Vector2 } from "three";
import { clamp, lerp } from "../math";
import { Packet } from "./Packet";
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
    waterBuffer: Float32Array;
    siltBuffer: Float32Array;
    softBuffer: Float32Array;

    constructor(tiles: TileSet, configuration: EroderConfiguration) {
        this.points = tiles;
        this.configuration = configuration;

        this.waterBuffer = new Float32Array(tiles.count);
        this.siltBuffer = new Float32Array(tiles.count);
        this.softBuffer = new Float32Array(tiles.count);

        this.resetWater();
    }

    tideI = 0;
    fixWater() {
        this.tideI += 1;
        const waterHeight = this.configuration.water.get() ;
        for (let i = 0; i < this.points.count; ++i) {
            if (this.points.rockElevation(i) < waterHeight) {
                this.points.water[i] = waterHeight - this.points.hard[i];
                this.points.aquifer[i] = this.points.soft[i]*0.5;
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
            let occlusionFactor = occlusion > -0 ? 1 : 0.04;
            const base = 0.002*this.points.rockElevation(i);
            this.points.water[i] += base*occlusionFactor/15;

            if (this.points.rockElevation(i) > 0.82 && occlusion > -0) {
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
    updateOcclusion(windInfluence: { x: number, y: number }) {
        const angle = Math.random() * 2 * Math.PI;

        const wind = Math.sqrt(windInfluence.x*windInfluence.x + windInfluence.y*windInfluence.y);

        this.wind.x += lerp(Math.cos(angle)*0.04, windInfluence.x, Math.pow(wind, 4));
        this.wind.y -= lerp(Math.sin(angle)*0.04, windInfluence.y, Math.pow(wind, 4));

        if (this.wind.length() > 1) {
            this.wind.normalize();
        }

        const nwind = this.wind.clone().normalize();

        const targets = new Array<number>(100);

        const waterHeight = this.configuration.water.get();
        for (let i = 0; i < this.points.count; ++i) {
            const source = i%this.points.count;
            if (this.points.rockElevation(source) < waterHeight) {
                this.points.occlusion[source] =  this.points.totalElevation(source);
            }

            const length = this.points.byDirection(source, nwind, targets, 0.5);
            for (let j = 0; j < length; ++j) {
                const target = targets[j];
                this.points.occlusion[target] =  Math.max(this.points.totalElevation(source), this.points.totalElevation(target), this.points.occlusion[source]);
            }
        }
    }
    
    initializeOcclusion(windInfluence: { x: number, y: number }) {
        this.wind.x = windInfluence.x;
        this.wind.y = windInfluence.y;

        if (this.wind.length() > 1) {
            this.wind.normalize();
        }

        const a = new Vector2(0,0);
        const projections = new Float32Array(this.points.count);
        const indices = new Int32Array(this.points.count);

        for (let i = 0; i < this.points.count; ++i) {
            a.x = this.points.x(i);
            a.y = this.points.y(i);
            const projection = a.dot(this.wind);
            projections[i] = projection;
            indices[i] = i;
        }

        indices.sort((a, b) => projections[a] - projections[b]);

        this.resetWater();
        this.points.occlusion.fill(0);

        const waterHeight = this.configuration.water.get();

        const targets = new Array<number>(100);
        for (let i = 0; i < this.points.count; ++i) {
            const current = indices[i];
                
            const length = this.points.byDirection(current, this.wind, targets, 0.5);
            for (let j = 0; j < length; ++j) {
                const target = targets[j];
                if (this.points.rockElevation(current) < waterHeight) {
                    this.points.occlusion[current] = this.points.totalElevation(current);
                }
                this.points.occlusion[target] =  Math.max(this.points.totalElevation(current), this.points.totalElevation(target), this.points.occlusion[current]);
            }
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

    packet: Packet = {
        silt: 0,
        water: 0,
        soft: 0
    };

    extractPacket(source: number, delta: number, rockDelta: number) {
        const transfer = Math.min(delta * 0.5, this.points.water[source]);
        const siltTransfer = Math.min(transfer / this.points.water[source] * this.points.silt[source], this.points.silt[source]);
        this.packet.water = transfer;
        this.waterBuffer[source] -= transfer;
        this.siltBuffer[source] -= siltTransfer;
        this.packet.silt = siltTransfer;
        this.packet.soft = 0;

        if (rockDelta > 0) {
            const erosion = clamp(Math.min(transfer*1 - this.points.water[source]*0.4, this.points.soft[source], this.packet.water - this.packet.silt, rockDelta*0.5), 0, 1);
            this.softBuffer[source] -= erosion;
            this.packet.silt += erosion;
        }
    }

    placePacket(target: number) {
        this.waterBuffer[target] += this.packet.water;
        this.siltBuffer[target] += this.packet.silt;
        this.softBuffer[target] += this.packet.soft;
    }
    
    spreadSilt(current: number) {
        const adjs = this.points.adjacents[current];
        for (let i = 0; i < adjs.length; ++i) {
            const target = adjs[i];
            const transfer = Math.min((this.points.silt[current] - this.points.silt[target])*0.1/adjs.length, this.points.siltSpace(target));
            this.points.silt[current] -= transfer;
            this.points.silt[target] += transfer;
        }
    }

    spreadWater() {
        for (let i = 0; i < this.points.count; ++i) {
            const water = this.points.water[i];
            const aquiferSpace = this.points.aquiferSpace(i);
            if (aquiferSpace > 0 && water > 0) {
                const soak = Math.min(water, aquiferSpace*0.1);
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
            this.spreadSilt(source);
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
            let transfer = Math.min(delta * 0.1 * friction, this.points.aquifer[source]);

            this.points.aquifer[source] -= transfer;
            this.points.aquifer[target] += transfer;

            let release = this.points.aquifer[target] - this.points.soft[target];
            if (release > 0) {
                this.points.water[target] += release;
                this.points.aquifer[target] -= release;
            }
        }

        if (this.softBuffer.length != this.points.count) {
            this.softBuffer = new Float32Array(this.points.count);
            this.siltBuffer = new Float32Array(this.points.count);
            this.waterBuffer = new Float32Array(this.points.count);
        }
        this.softBuffer.fill(0);
        this.siltBuffer.fill(0);
        this.waterBuffer.fill(0);

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

            const rockDelta = this.points.rockElevation(source) - this.points.rockElevation(target);
            
            if (rockDelta > 0) {
                const releaseFactor = (1 - rockDelta)*0.01;
                const release = this.points.silt[source]*releaseFactor;
                this.softBuffer[target] += release;
                this.siltBuffer[source] -= release;
            }

            this.simpleErode(source, delta*3);
            this.extractPacket(source, delta, rockDelta);
            this.placePacket(target);
        }

        for (let i = 0; i < this.points.count; ++i) {
            this.points.water[i] += this.waterBuffer[i];
            this.points.soft[i] += this.softBuffer[i];
            this.points.silt[i] += this.siltBuffer[i];
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
            this.points.water[source] = Math.max(waterHeight - this.points.hard[source], 0);
        }
    }
}