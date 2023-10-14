import * as THREE from "three";
import { byMin, clamp, lerp, sumBy } from "../math";
import { TileSet } from "./TileSet";

export class Map {
    readonly tiles: TileSet;

    constructor(tiles: TileSet) {

        this.tiles = tiles;
        
        for (let i = 0; i < tiles.count; ++i) {
            tiles.downhills[i] = byMin(tiles.adjacents[i], i =>  this.tiles.totalElevation(i));
        }

        this.resetWater();
    }

    riverMultiplier = 1;
    windMultiplier = 1;
    landslideAngle = 0.1;
    waterHeight = 0.25;

    setRiverMultiplier(value: number) {
        this.riverMultiplier = value;
    }
    setWindMultiplier(value: number) {
        this.windMultiplier = value;
    }
    setLandslideAngle(value: number) {
        this.landslideAngle = value;
    }
    setWaterHeight(value: number) {
        this.waterHeight = value;
    }

    fixWater() {
        let currentWater = 0;
        let goal = 0;
        let targets = 0;
        for (let i = 0; i < this.tiles.count; ++i) {
            currentWater += this.tiles.water[i];
            goal += Math.max(this.waterHeight - this.tiles.hard[i], 0) + this.tiles.soft[i];
            targets += 1;
        } 

        const add = (goal - currentWater)/targets;
        for (let i = 0; i < this.tiles.count; ++i) {
            this.tiles.water[i] += add;
        } 
    }

    passTime() {
        for (let i = 0; i < this.tiles.count; ++i) {
            this.tiles.river[i] *= 0.9;
            this.tiles.fog[i] *= 0.9;
            this.tiles.vegetation[i] = clamp(this.tiles.vegetation[i] - 0.004, 0, 1);
            if (this.tiles.water[i] < 0) {
                this.tiles.water[i] = 0;
            }
        }
    }

    river(i: number, amount: number) {
        let current = i;
        const surface = this.tiles.surfaceWater(current)*0.1;
        amount += surface;
        this.tiles.water[current] -= surface;
        let multiplier = amount*500*this.riverMultiplier;

        for (let j = 0; j < 400; ++j) {
            let target = this.tiles.downhills[current];
            const delta = this.tiles.totalElevation(current) - this.tiles.totalElevation(target);
            if (delta < 0) {
                break;
            }
            const transfer = Math.min(
                0.2* multiplier*this.tiles.soft[current]*delta,
                this.tiles.soft[current]
            );
            this.tiles.soft[current] -= transfer;
            this.tiles.soft[target] += transfer;

            this.tiles.river[current] += 0.2 * delta * multiplier;
            this.tiles.vegetation[current] += 0.005 * multiplier;
            current = target;
        }

        this.tiles.water[current] += amount;
    }

    fill(start: number, silt: number) {
        while (silt > 0) {
            let bar = Number.MAX_VALUE;
            let which = 0;
            const adj = this.tiles.adjacents[start];
            for (let i = 0; i < adj.length; ++i) {
                const elevation = this.tiles.rockElevation(adj[i]);
                if (elevation < bar) {
                    bar = elevation;
                    which = adj[i];
                }
            }

            if (this.tiles.rockElevation(which) < this.tiles.rockElevation(start)) {
                start = which;
            }

            const transfer = Math.min(0.04, silt);
            silt -= transfer;
            this.tiles.soft[start] += transfer
        }
    }

    simpleErosion() {
        for (let source = 0; source < this.tiles.count; ++source) {
            for (let a = 0; a < this.tiles.adjacents[source].length; ++a) {
                const target = this.tiles.adjacents[source][a];
                const delta = (this.tiles.rockElevation(source) - this.tiles.rockElevation(target));

                if (delta < 0) {
                    continue;
                }

                const softFactor = Math.min((this.tiles.soft[source] - this.tiles.soft[target])*0.5,  delta*0.00001);
                this.tiles.soft[source] -= softFactor;
                this.tiles.soft[target] += softFactor;

                const hardFactor = Math.min((this.tiles.hard[source] - this.tiles.hard[target])*0.5,  delta*0.00001);
                this.tiles.hard[source] -= hardFactor;
                this.tiles.soft[target] += hardFactor;
            }
        } 
    }
    
    simpleErode(center: number, amount: number) {
        const hardFactor = Math.min(this.tiles.hard[center], amount*0.1);
        this.tiles.hard[center] -= hardFactor;
        this.tiles.soft[center] += hardFactor;
        this.tiles.water[center] += hardFactor;
    }

    deriveDownhills() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const original = this.tiles.downhills[source];
            let next = original;
            let lowest = Number.MAX_VALUE;
            for (let j = 0; j < this.tiles.adjacents[source].length; ++j) {
                const target = this.tiles.adjacents[source][j];
                const factor = this.tiles.totalElevation(target);
                if (factor < lowest) {
                    next = target;
                    lowest = factor;
                }
            }

            this.tiles.downhills[source] = next;
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
        this.deriveDownhills();
        for (let source = 0; source < this.tiles.count; ++source) {
            const target = this.tiles.downhill(source);
            const delta = (this.tiles.rockElevation(source) - this.tiles.rockElevation(target));
            if (delta < 0) {
                continue;
            }

            const pressure = 0.03*this.tiles.river[source]*(0.5 - this.tiles.soft[source]);
            const erosion = clamp(Math.min(pressure, this.tiles.hard[source]), 0, 1);
            this.tiles.hard[source] -= erosion;
            this.tiles.soft[source] += erosion;
        }
    }

    spreadWater() {
        this.deriveDownhills();
        for (let source = 0; source < this.tiles.count; ++source) {
            const target = this.tiles.downhills[source];
            const delta = this.tiles.waterTable(source) - this.tiles.waterTable(target);
            if (delta < 0) {
                continue;
            }
            let transfer = Math.min(delta * 0.5, this.tiles.water[source]);

            this.tiles.water[source] -= transfer;
            this.tiles.water[target] += transfer;
        }
    }

    landslide() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const target = this.tiles.downhills[source];
            const delta = this.tiles.rockElevation(source) - this.tiles.rockElevation(target);
            if (delta > this.landslideAngle) {
                const transfer = Math.min(delta * 0.5, this.tiles.soft[source]);

                this.tiles.soft[source] -= transfer;
                this.tiles.soft[target] += transfer;
            }
            if (delta > this.landslideAngle*1.5) {
                const transfer = Math.min(delta * 0.1, this.tiles.hard[source]);

                this.tiles.hard[source] -= transfer;
                this.tiles.hard[target] += transfer;
            }
        }
    }

    getWind() {
        return {
            x: this.wind.x,
            y: -this.wind.y
        }
    }

    fogI = 0;
    wind = new THREE.Vector2();
    fog(radius: number, windInfluence: { x: number, y: number }) {
        const angle = Math.random() * 2 * Math.PI;

        const wind = Math.sqrt(windInfluence.x*windInfluence.x + windInfluence.y*windInfluence.y);

        this.wind.x += lerp(Math.cos(angle)*0.04, windInfluence.x, Math.pow(wind, 4));
        this.wind.y -= lerp(Math.sin(angle)*0.04, windInfluence.y, Math.pow(wind, 4));
        this.wind.normalize();
        this.deriveDownhills();

        for (let i = 0; i < 100; ++i) {
            const source = ~~(Math.random() * this.tiles.count);
            if (this.tiles.surfaceWater(source) < 0.01 && this.tiles.river[source] < 4) {
                continue;
            }

            let humidity = Math.min(this.tiles.surfaceWater(source) * 0.1 + 0.01, this.tiles.water[source]);
            this.tiles.water[source] -= humidity;

            let x = this.tiles.vertices.xs[source];
            let y = this.tiles.vertices.ys[source];

            this.fogI += 1;
            let vx = this.wind.x*radius*1;
            let vy = this.wind.y*radius*1;

            for (let iter = 0; iter < 100 && humidity > 0; ++iter) {
                const region = this.tiles.vertices.points.search({
                    maxX: x + radius * 2,
                    minX: x - radius * 2,
                    maxY: y + radius * 2,
                    minY: y - radius * 2,
                }).map(x => x.index);
                if (region.length === 0) {
                    break;
                }

                const air = sumBy(region, x => this.tiles.air(x) + this.tiles.surfaceRock(x)*0.01)/region.length;
                let soak = 0;
                if (air < humidity) {
                    soak = humidity - air;
                }

                const normV = new THREE.Vector2(vx, vy);
                normV.normalize();

                for (let i = 0; i < region.length; ++i) {
                    const target = region[i];

                    if (this.tiles.surfaceRock(i) > 0.01) {
                        const deflector = region[0];
                        const deflectordown = this.tiles.downhill(deflector);
                        let d = new THREE.Vector2(
                            this.tiles.x(deflectordown) - this.tiles.x(deflector),
                            this.tiles.y(deflectordown) - this.tiles.y(deflector)
                        );
                        d.normalize();

                        const factor = this.tiles.totalElevation(deflector) - this.tiles.totalElevation(deflectordown);

                        const opposition = d.dot(normV);
                        if (opposition < -0.5) {
                            this.simpleErode(target, opposition*0.1*factor*humidity*this.windMultiplier);
                        }

                        if (opposition < 0.5) {
                            vx -= d.x * factor * 3 / region.length;
                            vy -= d.y * factor * 3 / region.length; 
                        } else {
                            vx += d.x * factor * 3 / region.length;
                            vy += d.y * factor * 3 / region.length; 
                        }
                        
                        const hit = clamp(soak, 0, humidity);
                        humidity -= hit;
                        this.river(target, hit);
                    }

                    if (this.tiles.fog[target] < 1 - humidity) {
                        this.tiles.fog[target] += humidity*0.5;
                    }

                    if (this.tiles.vegetation[target] < 1 - humidity) {
                        const transfer = humidity*0.1;
                        this.tiles.vegetation[target] += transfer;
                    }
                }


                const l = Math.sqrt(vx*vx + vy*vy);
                if (l > 0) {
                    vx /= l;
                    vy /= l;
                    vx *= radius;
                    vy *= radius;
                }

                x += vx;
                y += vy;
            }
            
            const region = this.tiles.vertices.points.search({
                maxX: x + radius * 2,
                minX: x - radius * 2,
                maxY: y + radius * 2,
                minY: y - radius * 2,
            }).map(x => x.index);
            
            region.forEach(x => {
                this.river(x, humidity/region.length);
            });
        }
    }

    resetWater() {
        for (let source = 0; source < this.tiles.count; ++source) { 
            this.tiles.water[source] = Math.max(this.waterHeight - this.tiles.hard[source], 0) + this.tiles.soft[source];
        }
    }

    rain() {
        this.deriveDownhills();
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