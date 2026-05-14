import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export function initScene() {
    const scene = new THREE.Scene();
    return scene;
}

export function initRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;
    document.body.appendChild(renderer.domElement);
    return renderer;
}

export function initMainCamera() {
    const mainCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    mainCamera.position.set(6, 4, 6);
    return mainCamera;
}

export function initRenderTarget() {
    return new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
    });
}

export function initLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(-5, 5, -5);
    scene.add(spotLight);

    return directionalLight;
}

export function initGround(scene) {
    const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    scene.add(gridHelper);

    const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.1
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
}

export function initSky(scene, renderer, skyFolder, directionalLight) {
    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    const sun = new THREE.Vector3();

    const effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 2,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };

    function updateSky() {
        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = effectController.turbidity;
        uniforms['rayleigh'].value = effectController.rayleigh;
        uniforms['mieCoefficient'].value = effectController.mieCoefficient;
        uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        uniforms['sunPosition'].value.copy(sun);
        renderer.toneMappingExposure = effectController.exposure;

        directionalLight.position.copy(sun).multiplyScalar(10);
    }

    skyFolder.add(effectController, 'turbidity', 0.0, 20.0, 0.1).name('大气浑浊度').onChange(updateSky);
    skyFolder.add(effectController, 'rayleigh', 0.0, 4, 0.001).name('瑞利散射').onChange(updateSky);
    skyFolder.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).name('米氏散射系数').onChange(updateSky);
    skyFolder.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).name('米氏散射方向').onChange(updateSky);
    skyFolder.add(effectController, 'elevation', 0, 90, 0.1).name('太阳高度角').onChange(updateSky);
    skyFolder.add(effectController, 'azimuth', -180, 180, 0.1).name('太阳方位角').onChange(updateSky);
    skyFolder.add(effectController, 'exposure', 0, 3, 0.0001).name('曝光强度').onChange(updateSky);

    updateSky();

    return { sky, sun, effectController };
}

export function createTextLabel(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    ctx.fillStyle = color;
    ctx.font = 'Bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 44);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.25, 1);
    return sprite;
}
