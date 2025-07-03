import React, { useState, useRef, useEffect } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

const vertebraeList = [
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7',
    'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
    'L1', 'L2', 'L3', 'L4', 'L5',
    'S1', 'S2', 'S3', 'S4', 'S5',
    'Co1', 'Co2', 'Co3', 'Co4'
];

const Viewer = () => {
    const [labels, setLabels] = useState([]);
    const [selectedVertebra, setSelectedVertebra] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [viewportUpdate, setViewportUpdate] = useState(0);

    const viewerRef = useRef(null);


    useEffect(() => {
        if (!imageFile) return;

        const element = viewerRef.current;
        const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(imageFile);

        cornerstone.enable(element);

        let onWheel;

        cornerstone.loadImage(imageId).then((image) => {
            cornerstone.displayImage(element, image);
            setImageLoaded(true);


            onWheel = (e) => {
                e.preventDefault();
                const viewport = cornerstone.getViewport(element);
                const delta = e.deltaY < 0 ? 0.1 : -0.1;
                viewport.scale = Math.min(Math.max(viewport.scale + delta, 0.1), 20);
                cornerstone.setViewport(element, viewport);
            };

            element.addEventListener('wheel', onWheel);
        });

        return () => {
            if (element) {
                element.removeEventListener('wheel', onWheel);
                cornerstone.disable(element);
            }
            setImageLoaded(false);
            setLabels([]);
        };
    }, [imageFile]);


    useEffect(() => {
        if (!imageLoaded) return;

        const element = viewerRef.current;
        const onImageRendered = () => {
            setViewportUpdate((v) => v + 1);
        };

        element.addEventListener('cornerstoneimagerendered', onImageRendered);

        return () => {
            element.removeEventListener('cornerstoneimagerendered', onImageRendered);
        };
    }, [imageLoaded]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file || !file.name.toLowerCase().endsWith('.dcm')) {
            alert('Please upload a valid .dcm file.');
            return;
        }
        setImageFile(file);
    };

    const handleClick = (e) => {
        if (!imageLoaded || !selectedVertebra) return;

        const rect = viewerRef.current.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const { x: imageX, y: imageY } = cornerstone.canvasToPixel(viewerRef.current, {
            x: canvasX,
            y: canvasY,
        });

        const enabledElement = cornerstone.getEnabledElement(viewerRef.current);
        const { image } = enabledElement;


        if (
            imageX < 0 || imageX >= image.columns ||
            imageY < 0 || imageY >= image.rows
        ) {
            return;
        }

        setLabels((prev) => [...prev, { imageX, imageY, vertebra: selectedVertebra }]);
    };


    const handleEdit = (index) => {
        const newLabel = prompt('Edit vertebra label:', labels[index].vertebra);
        if (newLabel && vertebraeList.includes(newLabel)) {
            const updated = [...labels];
            updated[index].vertebra = newLabel;
            setLabels(updated);
        } else if (newLabel) {
            alert('Invalid vertebra label.');
        }
    };

    const handleDelete = (index) => {
        const updated = [...labels];
        updated.splice(index, 1);
        setLabels(updated);
    };

    const exportLabels = () => {
        const blob = new Blob([JSON.stringify(labels, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'spine_labels.json';
        a.click();
    };

    const renderLabels = () => {
        if (!imageLoaded) return null;

        const enabledElement = cornerstone.getEnabledElement(viewerRef.current);
        if (!enabledElement) return null;

        return labels.map((label, index) => {
            const { x, y } = cornerstone.pixelToCanvas(viewerRef.current, {
                x: label.imageX,
                y: label.imageY,
            });

            return (
                <div
                    key={index}
                    style={{
                        position: 'absolute',
                        top: y,
                        left: x,
                        background: 'rgb(14, 14, 130)',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontSize: '0.6rem',
                        transform: 'translate(-50%, -50%)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'auto',
                    }}
                    title="Double-click to edit, right-click to delete"
                    onDoubleClick={() => handleEdit(index)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        handleDelete(index);
                    }}
                >
                    {label.vertebra}
                </div>
            );
        });
    };

    return (
        <div className='m-4'>
            {/* Upload and vertebra selection */}
            <div className="mb-3 d-flex justify-content-center align-items-center gap-3">
                <input
                    type="file"
                    accept=".dcm"
                    onChange={handleFileChange}
                    className="form-control"
                    style={{ maxWidth: '250px' }}
                />
                <select
                    className="form-select"
                    value={selectedVertebra}
                    onChange={(e) => setSelectedVertebra(e.target.value)}
                    style={{ maxWidth: '180px' }}
                >
                    <option value="">Select Vertebra</option>
                    {vertebraeList.map((v) => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                </select>
                <button
                    className="btn btn-success"
                    onClick={exportLabels}
                    disabled={!imageLoaded}
                >
                    Export as JSON
                </button>
            </div>


            {/* Viewer container */}
            <div className="viewer-container"
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '500px',
                    border: '1px solid gray',
                    cursor: imageLoaded ? 'crosshair' : 'default',
                    userSelect: 'none',
                    overflow: 'hidden'
                }}
                onClick={handleClick}
            >
                <div
                    ref={viewerRef}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                    {renderLabels()}
                </div>
            </div>
        </div>
    );
};

export default Viewer;
