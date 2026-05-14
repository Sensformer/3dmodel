import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTextLabel } from './scene.js';

export const CM_TO_UNIT = 0.01;

let carGroup;
let markerGroup;
let calibrationGroup;

export function createMarkers(scene, carParams) {
    if (markerGroup) scene.remove(markerGroup);
    if (!carParams.showMarkers) return;

    markerGroup = new THREE.Group();
    const range = carParams.markerRange;
    const H = carParams.height * CM_TO_UNIT;

    function drawLine(start, end, color) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: color }));
        markerGroup.add(line);
    }

    drawLine(new THREE.Vector3(-range, 0.01, 0), new THREE.Vector3(range, 0.01, 0), 0xff0000);
    drawLine(new THREE.Vector3(0, 0.01, -range), new THREE.Vector3(0, 0.01, range), 0x0000ff);

    for (let x = -range; x <= range; x += 1) {
        if (Math.abs(x) < 0.1) continue;
        const label = createTextLabel(`${x.toFixed(0)}m`, '#ffaaaa');
        label.position.set(x, 0.05, 0.2);
        markerGroup.add(label);
    }

    for (let z = -range; z <= range; z += 1) {
        if (Math.abs(z) < 0.1) continue;
        const label = createTextLabel(`${z.toFixed(0)}m`, '#aaaaff');
        label.position.set(0.2, 0.05, z);
        markerGroup.add(label);
    }

    const originLabel = createTextLabel('Origin(0,0)', '#ffffff');
    originLabel.position.set(0, 0.1, 0);
    markerGroup.add(originLabel);

    scene.add(markerGroup);
}

export function createCalibrationBoards(scene, carParams) {
    if (calibrationGroup) scene.remove(calibrationGroup);
    if (!carParams.showCalibration) return;

    calibrationGroup = new THREE.Group();
    
    const boardSize = 2.0;
    const gridSize = 1.5;
    const segments = 5;
    const margin = (boardSize - gridSize) / 2;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const pxPerMeter = size / boardSize;
    const step = 0.3 * pxPerMeter;
    const startOffset = margin * pxPerMeter;

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(startOffset + i * step, startOffset + j * step, step, step);
            }
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    const boardGeo = new THREE.PlaneGeometry(boardSize, boardSize);
    const boardMat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });

    const L = carParams.length * CM_TO_UNIT;
    const W = carParams.width * CM_TO_UNIT;
    
    // UI显示的是偏移值（标定布边缘距离车身边缘的距离）
    const frontBackOffset = (carParams.calibrationFrontBackOffset || 20) * CM_TO_UNIT;
    const sideOffset = (carParams.calibrationSideOffset || 20) * CM_TO_UNIT;

    // 标定布中心位置 = 车身边缘 + 偏移值 + 标定布半宽
    // 这样标定布边缘到车身边缘的距离正好等于UI设置的偏移值
    const frontX = L / 2 + frontBackOffset + boardSize / 2;      // 车头标定布中心位置
    const backX = -(L / 2 + frontBackOffset + boardSize / 2);    // 车尾标定布中心位置
    const sideZ = W / 2 + sideOffset + boardSize / 2;            // 车身侧面标定布中心位置

    const positions = [
        { x: frontX, z: sideZ },      // 右前
        { x: frontX, z: -sideZ },     // 左前
        { x: backX, z: sideZ },       // 右后
        { x: backX, z: -sideZ }       // 左后
    ];

    positions.forEach(pos => {
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.rotation.x = -Math.PI / 2;
        board.position.set(pos.x, 0.02, pos.z);
        board.receiveShadow = true;
        calibrationGroup.add(board);
    });

    scene.add(calibrationGroup);
}

export function createCar(scene, carParams, updateAllCamerasCallback) {
    if (carGroup) scene.remove(carGroup);
    carGroup = new THREE.Group();

    const L = carParams.length * CM_TO_UNIT;
    const W = carParams.width * CM_TO_UNIT;
    const H = carParams.height * CM_TO_UNIT;

    const bodyMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xcc0000, metalness: 0.9, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.1
    });
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.2 });
    const windowMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0x000000, transparent: true, opacity: 0.7, metalness: 1.0, roughness: 0, transmission: 0.5
    });
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailLightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    const mainBodyH = H * 0.45;
    const mainBody = new THREE.Mesh(
        new RoundedBoxGeometry(L, mainBodyH, W, 6, 0.2),
        bodyMaterial
    );
    mainBody.position.y = mainBodyH / 2;
    mainBody.castShadow = true;
    carGroup.add(mainBody);

    const cabinH = H * 0.55;
    const cabinL = L * carParams.cabinRatio;
    const cabinW = W * 0.85;

    const cabinShape = new THREE.Shape();
    const cL = cabinL;
    const cH = cabinH;
    
    cabinShape.moveTo(-cL/2, -cH/2);
    cabinShape.lineTo(cL/2, -cH/2);
    cabinShape.quadraticCurveTo(cL/2, cH/2, 0, cH/2);
    cabinShape.lineTo(-cL/2, cH/2);
    cabinShape.lineTo(-cL/2, -cH/2);

    const extrudeSettings = {
        depth: cabinW,
        bevelEnabled: false,
        curveSegments: 32
    };

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, extrudeSettings);
    const cabin = new THREE.Mesh(cabinGeo, bodyMaterial);
    
    cabin.position.set(-L * (1 - carParams.cabinRatio) * 0.1, mainBodyH + cH / 2, -cabinW / 2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    const glassShape = new THREE.Shape();
    const gL = cL * 0.99;
    const gH = cH * 0.98;
    glassShape.moveTo(-gL/2, -gH/2);
    glassShape.lineTo(gL/2, -gH/2);
    glassShape.quadraticCurveTo(gL/2, gH/2, 0, gH/2);
    glassShape.lineTo(-gL/2, gH/2);
    glassShape.lineTo(-gL/2, -gH/2);

    const glassExtrudeSettings = { ...extrudeSettings, depth: cabinW * 1.01 };
    const glassGeo = new THREE.ExtrudeGeometry(glassShape, glassExtrudeSettings);
    const glass = new THREE.Mesh(glassGeo, windowMaterial);
    glass.position.set(cabin.position.x, cabin.position.y, -(cabinW * 1.01) / 2);
    carGroup.add(glass);

    const headlightGeo = new RoundedBoxGeometry(L * 0.02, mainBodyH * 0.3, W * 0.2, 2, 0.02);
    const leftLight = new THREE.Mesh(headlightGeo, lightMaterial);
    leftLight.position.set(L/2, mainBodyH * 0.7, W * 0.3);
    carGroup.add(leftLight);
    const rightLight = new THREE.Mesh(headlightGeo, lightMaterial);
    rightLight.position.set(L/2, mainBodyH * 0.7, -W * 0.3);
    carGroup.add(rightLight);

    const tailLightGeo = new RoundedBoxGeometry(L * 0.02, mainBodyH * 0.25, W * 0.25, 2, 0.02);
    const leftTail = new THREE.Mesh(tailLightGeo, tailLightMaterial);
    leftTail.position.set(-L/2, mainBodyH * 0.8, W * 0.3);
    carGroup.add(leftTail);
    const rightTail = new THREE.Mesh(tailLightGeo, tailLightMaterial);
    rightTail.position.set(-L/2, mainBodyH * 0.8, -W * 0.3);
    carGroup.add(rightTail);

    const mirrorGeo = new RoundedBoxGeometry(L * 0.05, mainBodyH * 0.25, W * 0.15, 2, 0.03);
    const leftMirror = new THREE.Mesh(mirrorGeo, bodyMaterial);
    leftMirror.position.set(L * 0.15, H * 0.7, W * 0.52);
    carGroup.add(leftMirror);
    const rightMirror = new THREE.Mesh(mirrorGeo, bodyMaterial);
    rightMirror.position.set(L * 0.15, H * 0.7, -W * 0.52);
    carGroup.add(rightMirror);

    function createWheel(x, z) {
        const wheelGroup = new THREE.Group();
        const radius = mainBodyH * 0.6;
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, W * 0.15, 32), wheelMaterial);
        tire.rotation.x = Math.PI / 2;
        wheelGroup.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, W * 0.16, 16), rimMaterial);
        rim.rotation.x = Math.PI / 2;
        wheelGroup.add(rim);
        wheelGroup.position.set(x, radius * 0.8, z);
        wheelGroup.castShadow = true;
        return wheelGroup;
    }
    carGroup.add(createWheel(L * 0.3, W * 0.5));
    carGroup.add(createWheel(L * 0.3, -W * 0.5));
    carGroup.add(createWheel(-L * 0.3, W * 0.5));
    carGroup.add(createWheel(-L * 0.3, -W * 0.5));

    scene.add(carGroup);
    createMarkers(scene, carParams);
    createCalibrationBoards(scene, carParams);
    updateAllCamerasCallback();
}

export function getCarGroup() {
    return carGroup;
}
