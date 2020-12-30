import React from 'react';

import './App.css';
import Scene from './Scene';

const Canvas = ({ frame, scale, highlight }) => {
    const canvasRef = React.useRef(null);

    React.useEffect(() => {
        if (frame) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            frame.draw(ctx, scale, parseInt(highlight, 10));
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

const FrameVertexList = ({ frame, vertexIndex, onChange }) => {
    const vertices = frame ? frame.vertices : []

    return (
        <div className="control">
            <label htmlFor="polyList">Frame vertices: {vertices.length}</label><br/>
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

    const [frameNumber2, setFrameNumber2] = React.useState(0);
    const [polyIndex2, setPolyIndex2] = React.useState(null);

    const frame1 = scene.frames[frameNumber1];
    const poly1 = frame1?.polygons[polyIndex1];
    const polyArea1 = poly1?.getArea();

    const frame2 = scene.frames[frameNumber2];
    const poly2 = frame2?.polygons[polyIndex2];
    const polyArea2 = poly2?.getArea();

    const overlap = poly1 && poly2 ? poly1.overlap(poly2) : null;

    const match = () => {
        if (!poly1) return;
        if (!frame2) return;
        let [index, score, nextBestScore] = frame2.findClosestPoly(poly1);
        console.log('score: ' + score + '. Next best: ' + nextBestScore);
        if (index !== null) setPolyIndex2(index);
    }

    return (
        <div className="App">
            <div className="toolbar">
                <button onClick={() => Scene.fromURL('/scene1.bin').then(setScene)}>Load</button>
                <button onClick={match}>Match</button>
            </div>

            <div className="viewer">
                <Canvas frame={frame1} highlight={polyIndex1} scale={2} />
                <FrameList scene={scene} frameNumber={frameNumber1} onChange={(e) => {setFrameNumber1(e.target.value)}} />
                <PolyList frame={frame1} polyIndex={polyIndex1} onChange={(e) => {setPolyIndex1(e.target.value)}} />
                <FrameVertexList frame={frame1} />
                <ColorList scene={scene} />
                poly area: {polyArea1}
            </div>

            <div className="viewer">
                <Canvas frame={frame2} highlight={polyIndex2} scale={2} />
                <FrameList scene={scene} frameNumber={frameNumber2} onChange={(e) => {setFrameNumber2(e.target.value)}} />
                <PolyList frame={frame2} polyIndex={polyIndex2} onChange={(e) => {setPolyIndex2(e.target.value)}} />
                <FrameVertexList frame={frame2} />
                <ColorList scene={scene} />
                poly area: {polyArea2}
                overlap: { overlap }
            </div>
        </div>
    );
}

export default App;
