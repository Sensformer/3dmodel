import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fisheyeVertexShader, fisheyeFragmentShader } from './shaders.js';
import { initScene, initRenderer, initMainCamera, initRenderTarget, initLights, initGround, initSky } from './scene.js';
import { createCar, CM_TO_UNIT } from './car.js';
import { initCarCameras, updateAllCameras, updateCameraProjection, getActiveCamera, updateCameraOrientation, updateFovDisplayMode } from './camera.js';
import { initGUI, initViewSelector } from './gui.js';

export const carParams = {
    length: 450,
    width: 180,
    height: 140,
    camHeight: 120,
    camDepth: 0,
    cabinRatio: 0.9,
    viewDistance: 20,
    fovDisplayDistance: 10,
    markerRange: 10,
    showMarkers: true,
    showCalibration: true,
    calibrationFrontBackOffset: 20,
    calibrationSideOffset: 20,
    focalLength: 1.7,
    hFOV: 185,
    vFOV: 185,
    cameraModel: 'Equidistant (等距)',
    fovDisplayMode: 'Lines',
    frontYaw: 0, backYaw: 180, leftYaw: 90, rightYaw: -90,
    frontPitch: -30, backPitch: -30, leftPitch: -30, rightPitch: -30,
    activeView: 'Main'
};

let scene, mainCamera, renderer, renderTarget, directionalLight;
let carCameras, fisheyeMaterial, postScene, postCamera, quad;
let controls, modelController;

function init() {
    scene = initScene();
    renderer = initRenderer();
    mainCamera = initMainCamera();
    renderTarget = initRenderTarget();

    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    fisheyeMaterial = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: renderTarget.texture },
            hFOV: { value: 185 },
            vFOV: { value: 185 },
            cameraModel: { value: 2 }
        },
        vertexShader: fisheyeVertexShader,
        fragmentShader: fisheyeFragmentShader
    });

    quad = new THREE.Mesh(quadGeometry, fisheyeMaterial);
    postScene = new THREE.Scene();
    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene.add(quad);

    controls = new OrbitControls(mainCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;

    directionalLight = initLights(scene);
    initGround(scene);

    const { gui, skyFolder, modelController: mc } = initGUI(
        scene,
        carParams,
        () => createCar(scene, carParams, () => updateAllCameras(carCameras, carParams)),
        () => updateAllCameras(carCameras, carParams),
        () => updateCameraProjection(carCameras, carParams, fisheyeMaterial, modelController),
        () => updateFovDisplayMode(carCameras, carParams)
    );

    modelController = mc;

    initSky(scene, renderer, skyFolder, directionalLight);
    carCameras = initCarCameras(scene, carParams);

    initViewSelector(gui, carParams, controls);

    const saveImage = { action: () => {
        renderer.render(scene, getActiveCamera(mainCamera, carCameras, carParams));
        const link = document.createElement('a');
        link.download = 'camera-view.jpg';
        link.href = renderer.domElement.toDataURL('image/jpeg', 0.95);
        link.click();
    }};
    gui.add(saveImage, 'action').name('📷 保存3D视图');

    const saveFullScreen = { action: () => {
        html2canvas(document.body).then(canvas => {
            const link = document.createElement('a');
            link.download = 'full-screen.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        });
    }};
    gui.add(saveFullScreen, 'action').name('🖼️ 保存整个界面');

    updateCameraProjection(carCameras, carParams, fisheyeMaterial, modelController);
    updateFovDisplayMode(carCameras, carParams);
    createCar(scene, carParams, () => updateAllCameras(carCameras, carParams));

    animate();

    window.addEventListener('resize', onWindowResize);
}

function animate() {
    requestAnimationFrame(animate);

    if (carParams.activeView === 'Main') {
        controls.update();
    }

    const activeCam = getActiveCamera(mainCamera, carCameras, carParams);

    if (carParams.activeView === 'Main') {
        renderer.render(scene, activeCam);
    } else {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, activeCam);
        renderer.setRenderTarget(null);
        renderer.render(postScene, postCamera);
    }
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    mainCamera.aspect = aspect;
    mainCamera.updateProjectionMatrix();

    renderTarget.setSize(width, height);
    renderer.setSize(width, height);
}

init();
