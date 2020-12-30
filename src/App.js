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
    const [frameNumber, setFrameNumber] = React.useState(0);
    const [polyIndex, setPolyIndex] = React.useState(null);

    const frame = scene.frames[frameNumber];
    return (
        <div className="App">
            <div className="toolbar">
                <button onClick={() => Scene.fromURL('/scene1.bin').then(setScene)}>Load</button>
            </div>
            <Canvas frame={frame} highlight={polyIndex} scale={2} />
            <FrameList scene={scene} frameNumber={frameNumber} onChange={(e) => {setFrameNumber(e.target.value)}} />
            <PolyList frame={frame} polyIndex={polyIndex} onChange={(e) => {setPolyIndex(e.target.value)}} />
            <FrameVertexList frame={frame} />
            <ColorList scene={scene} />
        </div>
    );
}

export default App;
