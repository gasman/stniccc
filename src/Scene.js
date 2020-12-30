class GlobalPalette {
    constructor() {
        this.colors = [];
        this.colorIndexesByPackedValue = {};
    }
    get(packedValue) {
        let index;
        if (packedValue in this.colorIndexesByPackedValue) {
            index = this.colorIndexesByPackedValue[packedValue];
            return this.colors[index];
        } else {
            index = this.colors.length;
            const color = new Color(packedValue, index);
            this.colors[index] = color;
            this.colorIndexesByPackedValue[packedValue] = index;
            return color;
        }
    }
}

class Color {
    constructor(packedValue, index) {
        this.index = index;
        this.packedValue = packedValue;
        this.r = ((packedValue & 0x0700) >> 8) * 36;
        this.g = ((packedValue & 0x0070) >> 4) * 36;
        this.b = (packedValue & 0x0007) * 36;
        const rgbVal = (this.r << 16) | (this.g << 8) | this.b;
        this.hex = '#' + rgbVal.toString(16).padStart(6, '0')
    }
}

class Polygon {
    constructor(color, vertices) {
        this.color = color;
        this.vertices = vertices;
    }

    drawPath(ctx, scale, closed) {
        ctx.beginPath();
        let v = this.vertices[0];
        ctx.moveTo(v.x * scale, v.y * scale);
        for (var i = 1; i < this.vertices.length; i++) {
            v = this.vertices[i];
            ctx.lineTo(v.x * scale, v.y * scale);
        }
        if (closed) {
            v = this.vertices[0];
            ctx.lineTo(v.x * scale, v.y * scale);
        }
    }

    fill(ctx, scale) {
        ctx.fillStyle = this.color.hex;
        this.drawPath(ctx, scale, false);
        ctx.fill();
    }

    stroke(ctx, scale) {
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2 * scale;
        this.drawPath(ctx, scale, true);
        ctx.stroke();
    }
}

class Frame {
    constructor(frameNumber, buffer, offset, lastPalette, globalPalette) {
        this.frameNumber = frameNumber;
        this.offset = offset;
        this.data = new DataView(buffer, offset);
        this.palette = [...lastPalette];

        let ptr = 0;
        const flags = this.data.getUint8(ptr++);
        this.clearScreen = flags & 1;
        let hasPalette = flags & 2;
        let isIndexed = flags & 4;

        if (hasPalette) {
            let bitmask = this.data.getUint16(ptr);
            ptr += 2;
            for (let i = 0; i < 16; i++) {
                if (bitmask & (1 << (15 - i))) {
                    this.palette[i] = globalPalette.get(this.data.getUint16(ptr));
                    ptr += 2;
                }
            }
        }

        this.vertices = [];
        const seenCoordinates = {};
        if (isIndexed) {
            let vertexCount = this.data.getUint8(ptr++);
            for (let i = 0; i < vertexCount; i++) {
                let x = this.data.getUint8(ptr++);
                let y = this.data.getUint8(ptr++);
                this.vertices.push({x, y});
            }
        }

        this.polygons = [];
        while (true) {
            let descriptor = this.data.getUint8(ptr++);
            if (descriptor === 0xff) {
                this.nextOffset = offset + ptr;
                this.isLast = false;
                break;
            } else if (descriptor === 0xfe) {
                let currentBlock = (offset + ptr - 1) & 0xffff0000;
                this.nextOffset = currentBlock + 0x10000;
                this.isLast = false;
                break;
            } else if (descriptor === 0xfd) {
                this.isLast = true;
                break;
            }

            let paletteIndex = descriptor >> 4;
            let vertexCount = descriptor & 0x0f;

            let polygonVertices = [];
            if (isIndexed) {
                for (let i = 0; i < vertexCount; i++) {
                    let vertexIndex = this.data.getUint8(ptr++);
                    polygonVertices.push(this.vertices[vertexIndex]);
                }
            } else {
                for (let i = 0; i < vertexCount; i++) {
                    let x = this.data.getUint8(ptr++);
                    let y = this.data.getUint8(ptr++);
                    let vertex = {x, y};
                    polygonVertices.push(vertex);
                    let coord = (y<<8) | x;
                    if (!(coord in seenCoordinates)) {
                        seenCoordinates[coord] = 1;
                        this.vertices.push(vertex);
                    }
                }
            }
            this.polygons.push(new Polygon(this.palette[paletteIndex], polygonVertices));
        }
    }

    draw(ctx, scale, highlightPolygonIndex) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 256 * scale, 200 * scale);
        this.polygons.forEach((poly, i) => {
            poly.fill(ctx, scale);
            if (highlightPolygonIndex === i) {
                poly.stroke(ctx, scale);
            }
        });
    }
}

class Scene {
    constructor(frames, palette) {
        this.frames = frames;
        this.palette = palette || new GlobalPalette();
    }

    static async fromURL(url) {
        const response = await fetch('/scene1.bin');
        const sceneBuffer = await response.arrayBuffer();
        return Scene.fromBuffer(sceneBuffer);
    }

    static fromBuffer(buffer) {
        const frames = [];
        const globalPalette = new GlobalPalette();
        const black = globalPalette.get(0);
        let offset = 0;
        let lastPalette = (new Array(16)).fill(black);
        for (var i = 0; i < 16; i++) {lastPalette.push(new Color(0));}
        let frameNumber = 0;
        while (true) {
            let frame = new Frame(frameNumber, buffer, offset, lastPalette, globalPalette);
            frames.push(frame);
            lastPalette = frame.palette;
            if (frame.isLast) break;
            offset = frame.nextOffset;
            frameNumber++;
        }
        return new Scene(frames, globalPalette);
    }
}

export default Scene;
