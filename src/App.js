import React from 'react';

import './App.css';
import { Scene, Snapshot } from './Scene';

const Canvas = ({ frame, scale, highlightPoly, highlightVertex, scene }) => {
    const canvasRef = React.useRef(null);

    React.useEffect(() => {
        if (frame) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            frame.draw(ctx, scale, parseInt(highlightPoly, 10), parseInt(highlightVertex, 10));
            frame.showPathlessVertices(ctx, scale, scene);
        }
    });

    return <canvas ref={canvasRef} width={256 * scale} height={200 * scale}></canvas>
}

const FrameList = ({ scene, frameNumber, onChange }) => {
    return (
        <div className="control">
            <label htmlFor="frameList">Frames: {scene.frames.length}</label><br/>
            <select id="frameList" size="20" value={frameNumber} onChange={onChange}>
                {scene.frames.map((frame, index) => {
                    return <option key={index} value={index}>frame {index} - {frame.polygons.length} polygons</option>
                })}
            </select>
        </div>
    );
};

const ColorList = ({ scene }) => {
    return (
        <div className="control">
            <label htmlFor="colorList">Global palette: {scene.palette.colors.length}</label><br/>
            <select id="colorList" size="5">
                {scene.palette.colors.map((color, index) => {
                    return <option key={index}>{index} - {color.hex}</option>
                })}
            </select>
        </div>
    );
};

const PolyList = ({ frame, polyIndex, onChange }) => {
    const polygons = frame ? frame.polygons : []

    return (
        <div className="control">
            <label htmlFor="polyList">Polygons: {polygons.length}</label><br/>
            <select id="polyList" size="20" value={polyIndex} onChange={onChange}>
                {polygons.map((poly, index) => {
                    return <option key={index} value={index}>{poly.color.hex} ({poly.color.index}), {poly.vertices.length} vertices</option>
                })}
            </select>
        </div>
    );
}

const PolyPathSequence = ({ scene, poly, onChange }) => {
    const polyPath = poly ? scene.polyPaths.getForItem(poly) : [];

    return (
        <div className="control">
            <label htmlFor="polyPath">PolyPath</label><br/>
            <select id="polyPath" size="20" value={poly?.id} onChange={onChange}>
                {polyPath.map((otherPoly) => {
                    return <option key={otherPoly.id} value={otherPoly.id}>fr {otherPoly.frameNumber} poly {otherPoly.index}, {otherPoly.vertices.length} vertices</option>
                })}
            </select>
        </div>
    );
}

const VertexPathSequence = ({ scene, vertex, onChange }) => {
    const vertexPath = vertex ? scene.vertexPaths.getForItem(vertex) : [];

    return (
        <div className="control">
            <label htmlFor="vertexPath">VertexPath</label><br/>
            <select id="vertexPath" size="20" value={vertex?.id} onChange={onChange}>
                {vertexPath.map((otherVertex) => {
                    return <option key={otherVertex.id} value={otherVertex.id}>{otherVertex.id} ({otherVertex.x}, {otherVertex.y})</option>
                })}
            </select>
        </div>
    );
}

const FrameVertexList = ({ frame, vertexIndex, onChange }) => {
    const vertices = frame ? frame.vertices : []

    return (
        <div className="control">
            <label htmlFor="frameVertexList">Frame vertices: {vertices.length}</label><br/>
            <select id="frameVertexList" size="20" value={vertexIndex} onChange={onChange}>
                {vertices.map((vertex, index) => {
                    return <option key={index} value={index}>{index}: {vertex.x}, {vertex.y}</option>
                })}
            </select>
        </div>
    );
}

const VertexList = ({ poly, vertexIndex, onChange }) => {
    const vertices = poly ? poly.vertices : []

    return (
        <div className="control">
            <label htmlFor="vertexList">Poly vertices: {vertices.length}</label><br/>
            <select id="vertexList" size="20" value={vertexIndex} onChange={onChange}>
                {vertices.map((vertex, index) => {
                    return <option key={index} value={index}>{index}: {vertex.x}, {vertex.y}</option>
                })}
            </select>
        </div>
    );
}

const App = () => {
    const [scene, setScene] = React.useState(new Scene([]));
    const [frameNumber1, setFrameNumber1] = React.useState(0);
    const [polyIndex1, setPolyIndex1] = React.useState(null);
    const [vertexIndex1, setVertexIndex1] = React.useState(null);

    const [frameNumber2, setFrameNumber2] = React.useState(0);
    const [polyIndex2, setPolyIndex2] = React.useState(null);

    const frame1 = scene.frames[frameNumber1];
    const poly1 = frame1?.polygons[polyIndex1];
    const polyArea1 = poly1?.getArea();

    const frame2 = scene.frames[frameNumber2];
    const poly2 = frame2?.polygons[polyIndex2];
    const polyArea2 = poly2?.getArea();

    const overlap = poly1 && poly2 ? poly1.overlap(poly2) : null;

    const matchPoly = () => {
        if (!poly1) return;
        if (!frame2) return;
        let [index, score, nextBestScore] = frame2.findClosestPoly(poly1);
        console.log('score: ' + score + '. Next best: ' + nextBestScore);
        if (index !== null) setPolyIndex2(index);
    }

    const matchFramePolys = () => {
        for (let i = 0; i < scene.frames.length - 1; i++) {
            scene.matchFramePolys(scene.frames[i], scene.frames[i+1]);
        }

        scene.polyPaths.sort();

        let pathCount = 0;
        let polyCount = 0;
        for (let id in scene.polyPaths.paths) {
            pathCount++;
            polyCount += scene.polyPaths.paths[id].length;
        }
        console.log(
            'Formed ' + pathCount + ' polypaths containing ' + polyCount +
            ' total polys, out of ' + scene.getTotalPolyCount() + ' available polys'
        );
    }

    const followVertices = () => {
        scene.vertexPathsFromPolyPaths();
        vertexPathStats();
    }

    const vertexPathStats = () => {
        let pathCount = 0;
        let vertexCount = 0;
        for (let id in scene.vertexPaths.paths) {
            pathCount++;
            vertexCount += scene.vertexPaths.paths[id].length;
        }
        console.log(
            'Formed ' + pathCount + ' vertex paths containing ' + vertexCount +
            ' total vertices, out of ' + scene.getTotalVertexCount() + ' available vertices'
        );
    }

    const mergeVertexPaths = () => {
        scene.mergeVertexPaths();
        vertexPathStats();
    }

    const findVertexPathsByAlias = () => {
        scene.findVertexPathsByAlias();
        vertexPathStats();
    }

    const snapshot = () => {
        const s = new Snapshot(scene);
        console.log(JSON.stringify(s.export()));
    }

    const goToPolyId = (polyId) => {
        setFrameNumber1(polyId >> 8);
        setPolyIndex1(polyId & 0xff);
    }

    let vertex1 = null;
    if (poly1 && vertexIndex1 !== null) {
        const vertexData1 = poly1.vertices[vertexIndex1];
        vertex1 = {x: vertexData1.x, y: vertexData1.y, id: (poly1.id << 8) | vertexIndex1};
    }

    return (
        <div className="App">
            <div className="toolbar">
                <button onClick={() => Scene.fromURL('/scene1.bin').then(setScene)}>Load</button>
                <button onClick={matchPoly}>Match poly</button>
                <button onClick={matchFramePolys}>Match frame polys</button>
                <button onClick={followVertices}>Follow vertices</button>
                <button onClick={mergeVertexPaths}>Merge vertex paths</button>
                <button onClick={findVertexPathsByAlias}>Find vpaths by alias</button>
                <button onClick={snapshot}>Snapshot</button>
            </div>

            <div className="viewer">
                <Canvas frame={frame1} scene={scene} highlightPoly={polyIndex1} highlightVertex={vertexIndex1} scale={2} />
                <FrameList scene={scene} frameNumber={frameNumber1} onChange={(e) => {setFrameNumber1(e.target.value)}} />
                <PolyList frame={frame1} polyIndex={polyIndex1} onChange={(e) => {setPolyIndex1(e.target.value)}} />
                {/* <FrameVertexList frame={frame1} /> */}
                poly area: {polyArea1}
                <VertexList poly={poly1} vertexIndex={vertexIndex1} onChange={(e) => {setVertexIndex1(e.target.value)}} />
                <PolyPathSequence scene={scene} poly={poly1} onChange={(e) => {goToPolyId(e.target.value)}} />
                <VertexPathSequence scene={scene} vertex={vertex1} />
            </div>

            <div className="viewer">
                { /* <Canvas frame={frame2} scene={scene} highlight={polyIndex2} scale={2} /> */ }
                <FrameList scene={scene} frameNumber={frameNumber2} onChange={(e) => {setFrameNumber2(e.target.value)}} />
                <PolyList frame={frame2} polyIndex={polyIndex2} onChange={(e) => {setPolyIndex2(e.target.value)}} />
                {/* <FrameVertexList frame={frame2} /> */}
                <ColorList scene={scene} />
                poly area: {polyArea2}<br />
                overlap: { overlap }
            </div>
        </div>
    );
}

export default App;
