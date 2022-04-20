import polygonArea from 'area-polygon';
import polygonClipping from 'polygon-clipping';

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

class PathSet {
    constructor() {
        this.paths = {};
        this.pathIndexesByItem = {};
    }

    getForItem(poly) {
        if (poly.id in this.pathIndexesByItem) {
            return this.paths[this.pathIndexesByItem[poly.id]];
        } else {
            /* no path stored -> path consists of only this poly */
            return [poly];
        }
    }

    getWithId(poly) {
        if (poly.id in this.pathIndexesByItem) {
            let pathId = this.pathIndexesByItem[poly.id];
            return [pathId, this.paths[pathId]];
        } else {
            return [poly.id, [poly]];
        }
    }

    link(poly1, poly2) {
        if (poly1.id === poly2.id) return;
        const path1exists = poly1.id in this.pathIndexesByItem;
        const path2exists = poly2.id in this.pathIndexesByItem;

        if (path1exists && path2exists) {
            /* move everything from path2 into path1 */
            const path1id = this.pathIndexesByItem[poly1.id];
            const path2id = this.pathIndexesByItem[poly2.id];
            if (path1id === path2id) return;
            const path1 = this.paths[path1id];
            const path2 = this.paths[path2id];
            path2.forEach((poly) => {
                path1.push(poly);
                this.pathIndexesByItem[poly.id] = path1id;
            });
            /* path2id is no longer active */
            delete this.paths[path2id];
        } else if (path1exists) {
            /* add poly2 to path1 */
            const path1id = this.pathIndexesByItem[poly1.id];
            const path1 = this.paths[path1id];
            path1.push(poly2)
            this.pathIndexesByItem[poly2.id] = path1id;
        } else if (path2exists) {
            /* add poly1 to path2 */
            const path2id = this.pathIndexesByItem[poly2.id];
            const path2 = this.paths[path2id];
            path2.push(poly1)
            this.pathIndexesByItem[poly1.id] = path2id;
        } else {
            /* create new path consisting of poly1 and poly2 */
            const path = [poly1, poly2];
            this.paths[poly1.id] = path;
            this.pathIndexesByItem[poly1.id] = poly1.id;
            this.pathIndexesByItem[poly2.id] = poly1.id;
        }
    }

    sort() {
        for (let pathId in this.paths) {
            this.paths[pathId].sort((a, b) => a.id - b.id);
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

class Vertex {
    constructor(x, y, frameIndex, polyIndex, vertexIndex) {
        this.x = x;
        this.y = y;
        this.coord = (y << 8) | x;
        this.id = (frameIndex << 16) | (polyIndex << 8) | vertexIndex;
    }

    isOnScreenEdge() {
        return this.x === 0 || this.x === 255 || this.y === 0 || this.y === 199;
    }
}

class Polygon {
    constructor(color, vertices, frameNumber, index) {
        this.color = color;
        this.vertices = vertices;
        this.index = index;
        this.frameNumber = frameNumber;
        this.id = (frameNumber << 8) | index;
    }

    isOnScreenEdge() {
        return this.vertices.some((v) => v.isOnScreenEdge());
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

    getArea() {
        return polygonArea(this.vertices.map(v => [v.x, v.y]));
    }

    overlap(other) {
        const p1 = this.vertices.map(v => [v.x, v.y]);
        const p2 = other.vertices.map(v => [v.x, v.y]);
        const originalArea = Math.max(polygonArea(p1), polygonArea(p2));
        if (originalArea === 0) return 0;
        const intersection = polygonClipping.intersection([p1], [p2]);
        let intersectionArea = 0;
        intersection.forEach((multipoly) => {
            multipoly.forEach((poly) => {
                let area = polygonArea(poly);
                intersectionArea += area;
            })
        })
        return intersectionArea / originalArea;
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

        const vertexLookup = [];
        if (isIndexed) {
            let vertexCount = this.data.getUint8(ptr++);
            for (let i = 0; i < vertexCount; i++) {
                let x = this.data.getUint8(ptr++);
                let y = this.data.getUint8(ptr++);
                vertexLookup.push({x, y});
            }
        }

        this.polygons = [];
        this.verticesByCoordinate = {};
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
                    let {x, y} = vertexLookup[vertexIndex];
                    let vertex = new Vertex(x, y, this.frameNumber, this.polygons.length, i);
                    polygonVertices.push(vertex);
                    if (vertex.coord in this.verticesByCoordinate) {
                        this.verticesByCoordinate[vertex.coord].push(vertex);
                    } else {
                        this.verticesByCoordinate[vertex.coord] = [vertex];
                    }
                }
            } else {
                for (let i = 0; i < vertexCount; i++) {
                    let x = this.data.getUint8(ptr++);
                    let y = this.data.getUint8(ptr++);
                    let vertex = new Vertex(x, y, this.frameNumber, this.polygons.length, i);
                    polygonVertices.push(vertex);
                    if (vertex.coord in this.verticesByCoordinate) {
                        this.verticesByCoordinate[vertex.coord].push(vertex);
                    } else {
                        this.verticesByCoordinate[vertex.coord] = [vertex];
                    }
                }
            }
            this.polygons.push(new Polygon(
                this.palette[paletteIndex], polygonVertices, this.frameNumber, this.polygons.length
            ));
        }
    }

    draw(ctx, scale, highlightPolygonIndex, highlightVertexIndex) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 256 * scale, 200 * scale);
        this.polygons.forEach((poly, i) => {
            poly.fill(ctx, scale);
            if (highlightPolygonIndex === i) {
                poly.stroke(ctx, scale);
                if (highlightVertexIndex !== null && !isNaN(highlightVertexIndex)) {
                    ctx.fillStyle = 'cyan';
                    let v = poly.vertices[highlightVertexIndex];
                    ctx.fillRect((v.x - 2) * scale, (v.y - 2) * scale, 4 * scale, 4 * scale);
                }
            }
        });
    }

    showPathlessVertices(ctx, scale, scene) {
        this.polygons.forEach((poly) => {
            poly.vertices.forEach((v, vertexIndex) => {
                let vertexId = (poly.id << 8) | vertexIndex;
                if (!(vertexId in scene.vertexPaths.pathIndexesByItem)) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
                    ctx.fillRect((v.x - 2) * scale, (v.y - 2) * scale, 4 * scale, 4 * scale);
                }
            });
        });
    }

    findClosestPoly(target) {
        let bestIndex = null;
        let bestScore = 0;
        let nextBestScore = 0;
        this.polygons.forEach((poly, i) => {
            if (poly.color === target.color) {
                let score = target.overlap(poly);
                if (score > bestScore) {
                    bestIndex = i;
                    nextBestScore = bestScore;
                    bestScore = score;
                } else if (score > nextBestScore) {
                    nextBestScore = score;
                }
            }
        });
        return [bestIndex, bestScore, nextBestScore];
    }

    findVertexPathsByAlias(scene) {
        /* for each poly in this frame, see which ones are in a polypath */
        this.polygons.forEach((poly) => {
            if (!(poly.id in scene.polyPaths.pathIndexesByItem)) return;
            let polyPathId = scene.polyPaths.pathIndexesByItem[poly.id];

            /* find vertices that are not on the screen edge */
            poly.vertices.forEach((vertex) => {
                if (vertex.isOnScreenEdge()) return;
                /* does this vertex share coordinates with any others on this frame? */
                let coincidents = this.verticesByCoordinate[vertex.coord];
                if (coincidents.length > 1) {
                    let currentVertexPath = scene.vertexPaths.getForItem(vertex);
                    coincidents.forEach((otherVertex) => {
                        /* skip otherVertex if it is the same as vertex, is not in a vertexPath,
                        or is already in the same vertexPath as vertex */
                        if (vertex === otherVertex) return;
                        if (!(otherVertex.id in scene.vertexPaths.pathIndexesByItem)) return;
                        let otherVertexPath = scene.vertexPaths.getForItem(otherVertex);
                        if (otherVertexPath === currentVertexPath) return;

                        /* does otherVertex's vertexPath share at least one vertex with this polypath? If so:
                        - otherVertex (being from a different polygon) must have ended up on that vertexPath
                        due to it being established as a shared vertex with the current polygon (over some
                        other range of frames)
                        - scene topology is static, so if two polygons sharing a vertex(Path) appear in the
                        same frame, the coordinates must coincide
                        - the current frame is such a frame, and since it's not possible for otherVertex to
                        coincide with more than one vertex of the current polygon, the current vertex must
                        be the shared one
                        - therefore the current vertex belongs to that vertexPath too
                        */
                        if (otherVertexPath.some((candidateVertex) => {
                            let candidatePolyId = candidateVertex.id >> 8;
                            return (scene.polyPaths.pathIndexesByItem[candidatePolyId] === polyPathId);
                        })) {
                            scene.vertexPaths.link(vertex, otherVertex);
                        }
                    })
                }
            });
        });
    }
}

class Scene {
    constructor(frames, palette) {
        this.frames = frames;
        this.palette = palette || new GlobalPalette();
        this.polyPaths = new PathSet();
        this.vertexPaths = new PathSet();
    }

    matchFramePolys(frame1, frame2) {
        frame1.polygons.forEach((poly1) => {
            let [poly2Index, bestScore, nextBestScore] = frame2.findClosestPoly(poly1);
            if (bestScore > 0.4 && nextBestScore < bestScore / 10) {
                let poly2 = frame2.polygons[poly2Index];
                this.polyPaths.link(poly1, poly2);
            }
        })
    }

    getTotalPolyCount() {
        let total = 0;
        this.frames.forEach((frame) => {
            total += frame.polygons.length;
        });
        return total;
    }

    getTotalVertexCount() {
        let total = 0;
        this.frames.forEach((frame) => {
            frame.polygons.forEach((polygon) => {
                total += polygon.vertices.length;
            });
        });
        return total;
    }

    vertexPathsFromPolyPaths() {
        const conservativeMatching = false;

        for (let polyPathId in this.polyPaths.paths) {
            let polyPath = this.polyPaths.paths[polyPathId];
            for (let i = 1; i < polyPath.length; i++) {
                let poly0 = polyPath[i - 1];
                let poly1 = polyPath[i];
                if (poly1.frameNumber !== poly0.frameNumber + 1) {
                    /* Non-consecutive frames */
                    continue;
                }
                if (poly0.vertices.length !== poly1.vertices.length) {
                    /* Differing vertex counts */
                    continue;
                }
                if (poly0.isOnScreenEdge() || poly1.isOnScreenEdge()) {
                    /* Hit screen edge */
                    continue;
                }

                if (conservativeMatching) {
                    /* only match if tracking each vertex in poly0 to its closest counterpart
                    in poly1 produces a 1:1 mapping. It turns out that in cases where this
                    succeeds, vertex indices ALWAYS match (i.e. poly0 index 1 maps to poly1 index 1 etc)
                    and therefore we can reasonably assume that polygons always preserve vertex ordering
                    between frames, regardless of what the proximity calculations say */
                    let vertexMap = {};
                    let reverseMap = {};
                    let twistyPath = false;
                    poly0.vertices.forEach((vertex0, v0index) => {
                        let bestDistance = null;
                        let bestVertexIndex = null;
                        poly1.vertices.forEach((vertex1, v1index) => {
                            let distance = (vertex1.x - vertex0.x) ** 2 + (vertex1.y - vertex0.y) ** 2;
                            if (bestDistance === null || distance < bestDistance) {
                                bestDistance = distance;
                                bestVertexIndex = v1index;
                            }
                        })
                        if (bestVertexIndex !== v0index) {
                            twistyPath = true;
                        }
                    vertexMap[v0index] = bestVertexIndex;
                        reverseMap[bestVertexIndex] = v0index;
                    })
                    let reverseMapCount = 0;
                    for (let i in reverseMap) reverseMapCount++;
                    if (reverseMapCount === poly0.vertices.length) {
                        /* unique mapping found for each vertex */
                        if (twistyPath) {
                            console.log('twisty path found!', poly0, poly1, vertexMap);
                        }
                        for (let v0index in vertexMap) {
                            let v0 = poly0.vertices[v0index];
                            let v1index = vertexMap[v0index];
                            let v1 = poly1.vertices[v1index];
                            this.vertexPaths.link(v0, v1);
                        }
                    }
                } else {
                    /* just trust the vertex indices to correspond */
                    poly0.vertices.forEach((v0, v0index) => {
                        let v1 = poly1.vertices[v0index];
                        this.vertexPaths.link(v0, v1);
                    });
                }
            }
        }
    }

    mergeVertexPaths() {
        const coordinates = {};
        const collisions = {};

        for (let vertexPathId in this.vertexPaths.paths) {
            let vertexPath = this.vertexPaths.paths[vertexPathId];
            vertexPath.forEach((vertex) => {
                let frame = vertex.id >> 16;
                let coord = (frame << 16) | (vertex.y << 8) | vertex.x;
                if (coord in coordinates) {
                    coordinates[coord].forEach((otherPathId) => {
                        let collisionId = otherPathId + ':' + vertexPathId;
                        if (collisionId in collisions) {
                            collisions[collisionId]++;
                        } else {
                            collisions[collisionId] = 1;
                        }
                    });
                    coordinates[coord].push(vertexPathId);
                } else {
                    coordinates[coord] = [vertexPathId];
                }
            });
        }
        const merges = [];
        for (let collisionId in collisions) {
            if (collisions[collisionId] >= 5) {
                let [path1, path2] = collisionId.split(':');
                merges.push([
                    this.vertexPaths.paths[path1][0],
                    this.vertexPaths.paths[path2][0],
                ])
            }
        };
        merges.forEach(([v0, v1]) => {
            this.vertexPaths.link(v0, v1);
        })
    }

    findVertexPathsByAlias() {
        this.frames.forEach((frame) => {
            frame.findVertexPathsByAlias(this);
        });
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

class Snapshot {
    constructor(scene) {
        this.vertices = [];
        this.polygons = [];
        this.frames = []

        let verticesByPathId = {};
        let polygonsByPathString = {};

        scene.frames.forEach((frame, frameNumber) => {
            this.frames[frameNumber] = [];

            frame.polygons.forEach((poly) => {
                let vpaths = [];
                poly.vertices.forEach((vertex) => {
                    let [vpathid, vpath] = scene.vertexPaths.getWithId(vertex);
                    if (!(vpathid in verticesByPathId)) {
                        let pathDict = {};
                        vpath.forEach((v) => {
                            pathDict[v.id >> 16] = [v.x, v.y];
                        });
                        verticesByPathId[vpathid] = this.vertices.length;
                        this.vertices.push(pathDict);
                    }
                    vpaths.push(verticesByPathId[vpathid]);
                });
                let pathstring = poly.color.packedValue + ':' + vpaths.join(',');
                if (!(pathstring in polygonsByPathString)) {
                    polygonsByPathString[pathstring] = this.polygons.length;
                    this.polygons.push({
                        color: poly.color.packedValue,
                        vertices: vpaths,
                    });
                }
                this.frames[frameNumber].push(polygonsByPathString[pathstring]);
            });
        });
    }

    export() {
        return {
            vertices: this.vertices,
            polygons: this.polygons,
            frames: this.frames,
        };
    }
}

export {Scene, Snapshot};
