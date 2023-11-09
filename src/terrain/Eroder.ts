import * as THREE from "three";
import { Vector2 } from "three";
import { PointLike } from "../PointLike";
import { clamp } from "../math";
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
    aquiferBuffer: Float32Array;
    siltBuffer: Float32Array;
    softBuffer: Float32Array;

    constructor(tiles: TileSet, configuration: EroderConfiguration) {
        this.points = tiles;
        this.configuration = configuration;

        this.aquiferBuffer = new Float32Array(tiles.count);
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
                this.points.water[i] = waterHeight - this.points.rockElevation(i);
                this.points.aquifer[i] = this.points.soft[i];
            }
        }
    }

    spreadVegetation(current: number) {
        this.points.vegetation[current] = clamp(Math.log(this.points.aquifer[current]*4 + 1) - this.points.water[current]*20, 0, 1);
    }

    spreadSnow() {
        for (let current = 0; current < this.points.count; ++current) {
            if (this.points.snow[current] > 0) {
                let target = this.points.downhill(current);
                const snowDelta = this.points.snow[current] - this.points.snow[target];
                const delta = this.points.rockElevation(current) - this.points.rockElevation(target);
                const slide = Math.min(snowDelta * 0.5, delta * 0.2);
                this.points.snow[current] -= slide;
                this.points.snow[target] += slide;

                if (delta > 0) {
                    const scrape = Math.min(slide*slide*10, this.points.hard[current], delta*0.4);
                    this.points.hard[current] -= scrape;
                    this.points.hard[target] += scrape;
                }

                if (this.points.rockElevation(current) < 0.7) {
                    const melt = Math.min(0.001, this.points.snow[current]);
                    this.points.snow[current] -= melt;
                    this.points.water[target] += melt*0.01;
                }
                this.points.snow[current] = clamp(this.points.snow[current], 0, 1);
            }
        }
    }

    maxElevation = 0;
    passTime() {
        this.maxElevation = 0;
        for (let current = 0; current < this.points.count; ++current) {
            this.maxElevation = Math.max(this.points.rockElevation(current), this.maxElevation);
        }
        for (let current = 0; current < this.points.count; ++current) {
            this.spreadVegetation(current);

            if (this.points.water[current] < 0) {
                this.points.water[current] = 0;
            }
        }
    }

    solveLakes() {
        const waterHeight = this.configuration.water.get();
        this.points.river.fill(0);
        let more = false;
        for (let i = 0; i < this.points.count; ++i) {
            if (this.points.rockElevation(i) < waterHeight) {
                continue;
            }
            more = this.findMinimum(i) || more;
        }
        return more;
    }

    findMinimum(source: number) {
        let current = source;
        const waterHeight = this.configuration.water.get();
        for (let i = 0; i < 10000; ++i) {
            if (this.points.rockElevation(current) < waterHeight) {
                return false;
            }
            const target = this.points.downhill(current);
            let delta = this.points.totalElevation(current) - this.points.totalElevation(target);
            if (delta < 0) {
                const transfer = -delta + 0.001;
                this.points.water[current] += transfer;
            }
            current = target;
            this.points.river[current] += 0.01;
        }

        return true;
    }

    rain() {
        let evaporation = 0;
        let count = 0;
        const waterHeight = this.configuration.water.get();
        for (let i = 0; i < this.points.count; ++i) {
            if (this.points.rockElevation(i) < waterHeight) {
                continue;
            }
            count += 1;
            if (this.points.water[i] > 0) {
                const amount = Math.min(0.0001 * this.points.water[i], this.points.water[i]);
                evaporation += amount;
                this.points.water[i] -= amount;
            } else {
                const amount = this.points.aquifer[i] * 0.0005;
                evaporation += amount;
                this.points.aquifer[i] -= amount;
            }
        }

        evaporation /= count;
        for (let i = 0; i < this.points.count; ++i) {
            if (this.points.rockElevation(i) < waterHeight) {
                continue;
            }
            const exposure = this.points.rockElevation(i) > this.points.occlusion[i] ? 1 : 0;
            const base = 0.00002;
            const transfer = base*(exposure + 0.0001) + evaporation;
            const aquiferFill = Math.min(transfer, this.points.aquiferSpace(i)*0.1);
            const water = (transfer - aquiferFill);
            this.points.water[i] += water;
            this.points.aquifer[i] += aquiferFill;

            if (this.points.rockElevation(i) > 0.8 && exposure > 0.01) {
                this.points.snow[i] = 1;
            }
        }
    }
    
    simpleErode(center: number, amount: number) {
        const hardFactor = clamp(amount*0.1*this.points.hard[center]*(0.1 - this.points.soft[center]), 0, this.points.hard[center]);
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
    occlusionIndices: Int32Array;
    initializeOcclusion(windInfluence?: { x: number, y: number }) {
        if (windInfluence) {
            this.wind.x = windInfluence.x;
            this.wind.y = -windInfluence.y;

            this.wind.normalize();

            const projections = new Float32Array(this.points.count);
            const a = new Vector2(0,0);
            for (let i = 0; i < this.points.count; ++i) {
                a.x = this.points.x(i);
                a.y = this.points.y(i);
                const projection = a.dot(this.wind);
                projections[i] = projection;
            }
            

            if (!this.occlusionIndices || this.occlusionIndices.length !== this.points.count) {
                this.occlusionIndices = new Int32Array(this.points.count);
                for (let i = 0; i < this.points.count; ++i) {
                    this.occlusionIndices[i] = i;
                }
            }
            this.occlusionIndices.sort((a, b) => projections[a] - projections[b]);
        }

        this.points.occlusion.fill(0);

        const waterHeight = this.configuration.water.get();
        const targets = new Array<number>(100);
        for (let i = 0; i < this.points.count; ++i) {
            const current = this.occlusionIndices[i];
            
            if (this.points.rockElevation(current) < waterHeight) {
                this.points.occlusion[current] = this.points.totalElevation(current);
            }
                
            const length = this.points.byDirection(current, this.wind, targets, 0.5);
            for (let j = 0; j < length; ++j) {
                const target = targets[j];
                this.points.occlusion[target] =  Math.max(this.points.totalElevation(current), this.points.totalElevation(target), this.points.occlusion[current]) - 0.002;
            }
        }
    }

    packet: Packet = {
        silt: 0,
        selfSilt: 0,
        water: 0,
        soft: 0
    };

    extractPacket(source: number, delta: number, rockDelta: number) {
        const transfer = Math.min(delta * 0.5, this.points.water[source]);
        const siltTransfer = Math.min(transfer / this.points.water[source] * this.points.silt[source], this.points.silt[source]);
        this.simpleErode(source, transfer*80);
        this.packet.water = transfer;
        this.waterBuffer[source] -= transfer;
        this.siltBuffer[source] -= siltTransfer;
        this.packet.silt = siltTransfer;
        this.packet.soft = 0;

        if (rockDelta > 0) {
            const erosion = clamp(Math.min(transfer*.3/(this.points.water[source]*10 + 1), this.points.soft[source], rockDelta*0.5, delta * 0.1), 0, 1);
            this.softBuffer[source] -= erosion;
            this.packet.selfSilt = erosion;
        }
    }

    placePacket(source: number, target: number) {
        this.waterBuffer[target] += this.packet.water;
        this.siltBuffer[target] += this.packet.silt;
        this.siltBuffer[source] += this.packet.selfSilt;
        this.softBuffer[target] += this.packet.soft;
    }

    clearBuffers() {
        if (this.points.count > this.softBuffer.length) {
            this.softBuffer = new Float32Array(this.points.count);
            this.aquiferBuffer = new Float32Array(this.points.count);
            this.siltBuffer = new Float32Array(this.points.count);
            this.waterBuffer = new Float32Array(this.points.count);
        }
        this.softBuffer.fill(0);
        this.aquiferBuffer.fill(0);
        this.siltBuffer.fill(0);
        this.waterBuffer.fill(0);
    }
    
    spreadAquifer() {
        const waterHeight = this.configuration.water.get();
        for (let source = 0; source < this.points.count; ++source) {
            if (this.points.aquifer[source] <= 0 || this.points.rockElevation(source) < waterHeight) {
                continue;
            }
            const target = this.points.waterTableDownhill(source);
            const delta = this.points.waterTable(source) - this.points.waterTable(target);
            if (delta < 0) {
                continue;
            }
            
            let transfer = Math.min(delta * 0.04, this.points.aquifer[source]);
            this.aquiferBuffer[source] -= transfer;
            this.aquiferBuffer[target] += transfer;
        }
    }

    findRivers() {
        // Use the buffers to find springs.
        this.clearBuffers();
        this.spreadAquifer();

        const paths: PointLike[][] = [];

        const springs: number[] = [];
        for (let i = 0; i < this.points.count; ++i) {
            if (this.points.aquifer[i] > this.points.soft[i]) {
                springs.push(i);
            }
        }
        console.log("Spring count: " + springs.length);

        for (let i = 0; i < springs.length; ++i) {
            let current = springs[i];
            const path = new Array<PointLike>();
            path.push({ x: this.points.x(current), y: this.points.y(current) });
            
            const waterHeight = this.configuration.water.get();
            for (let i = 0; i < 10000; ++i) {
                if (this.points.rockElevation(current) < waterHeight) {
                    break;
                }
                const target = this.points.downhill(current);
                let delta = this.points.totalElevation(current) - this.points.totalElevation(target);
                if (delta < 0) {
                    this.points.water[current] += -delta + 0.0001;
                    delta = this.points.totalElevation(current) - this.points.totalElevation(target);
                }
                current = target;
                path.push({ x: this.points.x(current), y: this.points.y(current) });
            }

            paths.push(path);
        }

        return paths;
    }

    spreadWater(aquiferSpread: boolean) {
        for (let i = 0; i < this.points.count; ++i) {
            const water = this.points.water[i];
            const aquiferSpace = this.points.aquiferSpace(i);
            if (aquiferSpace > 0 && water > 0) {
                const soak = Math.min(water*0.02, aquiferSpace, 0.0002);
                this.points.aquifer[i] += soak;
                this.points.water[i] -= soak;
            }
            
            this.points.vegetation[i] = clamp(this.points.aquifer[i]*1.01/(this.points.aquiferCapacity(i)+0.01), 0, 1);
        
            let release = this.points.aquifer[i] - this.points.aquiferCapacity(i);
            if (release > 0) {
                this.points.water[i] += release;
                this.points.aquifer[i] -= release;
            }
        }

        this.clearBuffers();

        if (aquiferSpread) {
            this.spreadAquifer();
        }

        const waterHeight = this.configuration.water.get();
        for (let source = 0; source < this.points.count; ++source) {
            if (this.points.water[source] <= 0 || this.points.rockElevation(source) < waterHeight) {
                continue;
            }
            const target= this.points.downhill(source);
            const delta = this.points.totalElevation(source) - this.points.totalElevation(target);
            if (delta < 0) {
                continue;
            }

            const rockDelta = this.points.rockElevation(source) - this.points.rockElevation(target);
            this.extractPacket(source, delta, rockDelta);

            //const adjs = this.points.adjacents[i];
            const releaseFactor = clamp(0.7 - delta*20 - this.points.water[source]*4, 0.01, 0.7);
            const release = this.packet.silt*releaseFactor;
            this.softBuffer[target] += release//*25/(adjs.length + 25);
            this.packet.silt -= release;
            
            this.placePacket(source, target);
        }

        for (let i = 0; i < this.points.count; ++i) {
            this.points.water[i] += this.waterBuffer[i];
            this.points.soft[i] += this.softBuffer[i];
            this.points.silt[i] += this.siltBuffer[i];
            this.points.aquifer[i] += this.aquiferBuffer[i];
            
            const releaseFactor = 0.05;
            const release = this.points.silt[i]*releaseFactor;
            this.points.soft[i] += release//*25/(adjs.length + 25);
            this.points.silt[i] -= release;
        }
    }

    landslide() {
        const siltAngle = this.configuration.siltAngle.get();
        const rockAngle = this.configuration.rockAngle.get();
        for (let source = 0; source < this.points.count; ++source) {
            let target = this.points.downhill(source);
            let delta = this.points.rockElevation(source) - this.points.rockElevation(target);
            if (delta > siltAngle) {
                const transfer = Math.min((delta - siltAngle) * 0.1, this.points.soft[source]);

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
            this.points.water[source] = Math.max(waterHeight - this.points.rockElevation(source), 0);
        }
    }
}