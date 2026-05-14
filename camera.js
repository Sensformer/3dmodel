import * as THREE from 'three';
import { CM_TO_UNIT } from './car.js';

const sensors = {};
const helpers = {};
const fovPyramids = {};
let carCamerasRef = null;

export const cameraInstallation = {
    front: { yaw: 0, pitch: -20 },
    back: { yaw: 180, pitch: -20 },
    left: { yaw: -90, pitch: -20 },
    right: { yaw: 90, pitch: -20 }
};

export function initCarCameras(scene, carParams) {
    const carCameras = {
        front: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100),
        back: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100),
        left: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100),
        right: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    };

    carCamerasRef = carCameras;

    const sensorGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 16);
    const sensorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 });

    Object.keys(carCameras).forEach(key => {
        scene.add(carCameras[key]);
        const sensor = new THREE.Mesh(sensorGeo, sensorMaterial);
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0x0077ff }));
        lens.position.set(0, 0.06, 0);
        sensor.add(lens);
        scene.add(sensor);
        sensors[key] = sensor;

        const helper = new THREE.CameraHelper(carCameras[key]);
        scene.add(helper);
        helpers[key] = helper;

        const pyramidMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const fovPyramid = new THREE.Mesh(new THREE.BufferGeometry(), pyramidMat);
        fovPyramid.visible = false;
        scene.add(fovPyramid);
        fovPyramids[key] = fovPyramid;
    });

    return carCameras;
}

export function updateAllCameras(carCameras, carParams) {
    const L = carParams.length * CM_TO_UNIT;
    const W = carParams.width * CM_TO_UNIT;
    const h = carParams.camHeight * CM_TO_UNIT;
    const d = carParams.camDepth * CM_TO_UNIT;

    carCameras.front.position.set(L/2 + 0.05 - d, h, 0);
    carCameras.back.position.set(-L/2 - 0.05 + d, h, 0);
    carCameras.left.position.set(0, h, W/2 + 0.05 - d);
    carCameras.right.position.set(0, h, -W/2 - 0.05 + d);

    Object.keys(carCameras).forEach(key => {
        updateCameraOrientation(key);
        if (sensors[key]) sensors[key].position.copy(carCameras[key].position);
    });
}

export function updateCameraOrientation(key) {
    if (!carCamerasRef) return;
    const cam = carCamerasRef[key];
    const install = cameraInstallation[key];
    const sensor = sensors[key];
    const helper = helpers[key];

    const yawRad = THREE.MathUtils.degToRad(install.yaw);
    const pitchRad = THREE.MathUtils.degToRad(install.pitch);

    const direction = new THREE.Vector3(1, 0, 0);
    const euler = new THREE.Euler(0, yawRad, pitchRad, 'YXZ');
    direction.applyEuler(euler);

    const target = new THREE.Vector3().copy(cam.position).add(direction);
    cam.lookAt(target);
    cam.updateMatrixWorld();

    if (sensor) {
        sensor.lookAt(target);
        sensor.rotateX(Math.PI / 2);
    }
    if (helper) helper.update();
}

export function updateCameraProjection(carCameras, carParams, fisheyeMaterial, modelController) {
    const hFOV = carParams.hFOV;
    const vFOV = carParams.vFOV;

    let modelId;
    if (hFOV < 90) {
        carParams.cameraModel = 'Pinhole (针孔)';
        modelId = 0;
    } else if (hFOV < 160) {
        carParams.cameraModel = 'Kannala-Brandt (鱼眼)';
        modelId = 1;
    } else {
        carParams.cameraModel = 'Equidistant (等距)';
        modelId = 2;
    }

    if (modelController) modelController.updateDisplay();

    fisheyeMaterial.uniforms.hFOV.value = hFOV;
    fisheyeMaterial.uniforms.vFOV.value = vFOV;
    fisheyeMaterial.uniforms.cameraModel.value = modelId;

    const hRad = THREE.MathUtils.degToRad(hFOV);
    const vRad = THREE.MathUtils.degToRad(vFOV);

    const aspect = Math.tan(hRad / 2) / Math.tan(vRad / 2);
    const verticalFOV = 2 * Math.atan(Math.tan(hRad / 2) / aspect) * (180 / Math.PI);

    Object.values(carCameras).forEach(cam => {
        cam.fov = verticalFOV;
        cam.aspect = aspect;
        cam.far = carParams.viewDistance;
        cam.updateProjectionMatrix();
    });

    Object.values(helpers).forEach(helper => helper.update());
    updateFovPyramids(carCameras, carParams);
}

export function updateFovDisplayMode(carCameras, carParams) {
    const displayMode = carParams.fovDisplayMode;

    Object.keys(helpers).forEach(key => {
        helpers[key].visible = (displayMode === 'Lines' || displayMode === 'Both');
    });

    Object.keys(fovPyramids).forEach(key => {
        fovPyramids[key].visible = (displayMode === 'Box' || displayMode === 'Both');
    });

    if (displayMode === 'Box' || displayMode === 'Both') {
        updateFovPyramids(carCameras, carParams);
    }
}

function updateFovPyramids(carCameras, carParams) {
    const hFOV = carParams.hFOV;
    const vFOV = carParams.vFOV;
    const distance = carParams.fovDisplayDistance;

    const halfH = Math.tan(THREE.MathUtils.degToRad(vFOV / 2));
    const halfW = Math.tan(THREE.MathUtils.degToRad(hFOV / 2));

    Object.keys(carCameras).forEach(key => {
        const cam = carCameras[key];
        const pyramid = fovPyramids[key];

        if (!pyramid) return;

        const camPos = cam.position.clone();
        const direction = new THREE.Vector3();
        cam.getWorldDirection(direction);

        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3();
        right.crossVectors(direction, up).normalize();

        const correctedRight = right.clone().negate();

        const farCenter = camPos.clone().add(direction.clone().multiplyScalar(distance));

        const p1 = farCenter.clone()
            .add(correctedRight.clone().multiplyScalar(halfW * distance))
            .add(up.clone().multiplyScalar(-halfH * distance));
        const p2 = farCenter.clone()
            .add(correctedRight.clone().multiplyScalar(-halfW * distance))
            .add(up.clone().multiplyScalar(-halfH * distance));
        const p3 = farCenter.clone()
            .add(correctedRight.clone().multiplyScalar(-halfW * distance))
            .add(up.clone().multiplyScalar(halfH * distance));
        const p4 = farCenter.clone()
            .add(correctedRight.clone().multiplyScalar(halfW * distance))
            .add(up.clone().multiplyScalar(halfH * distance));

        const vertices = new Float32Array([
            camPos.x, camPos.y, camPos.z,
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z,
            p3.x, p3.y, p3.z,
            p4.x, p4.y, p4.z
        ]);

        const indices = [
            0, 1, 2,
            0, 2, 3,
            0, 3, 4,
            0, 4, 1,
            1, 2, 3,
            1, 3, 4
        ];

        pyramid.geometry.dispose();
        pyramid.geometry = new THREE.BufferGeometry();
        pyramid.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        pyramid.geometry.setIndex(indices);
    });
}

export function getActiveCamera(mainCamera, carCameras, carParams) {
    if (carParams.activeView === 'Main') {
        return mainCamera;
    }
    return carCameras[carParams.activeView.toLowerCase()];
}
