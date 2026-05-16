import GUI from 'lil-gui';
import { createCar, createMarkers, createCalibrationBoards } from './car.js';
import { updateAllCameras, updateCameraOrientation, cameraInstallation } from './camera.js';

export function initGUI(scene, carParams, createCarCallback, updateAllCamerasCallback, updateCameraProjectionCallback, updateFovDisplayModeCallback) {
    const gui = new GUI();
    let modelController;

    const dimensionFolder = gui.addFolder('0. 车模尺寸');
    dimensionFolder.add(carParams, 'length', 200, 600).name('车长 (cm)').onChange(() => createCarCallback());
    dimensionFolder.add(carParams, 'width', 100, 300).name('车宽 (cm)').onChange(() => createCarCallback());
    dimensionFolder.add(carParams, 'height', 100, 250).name('车高 (cm)').onChange(() => createCarCallback());
    dimensionFolder.add(carParams, 'cabinRatio', 0.1, 1.0).name('车厢比例').onChange(() => createCarCallback());
    dimensionFolder.add(carParams, 'camHeight', 20, 200).name('相机安装高度 (cm)').onChange(() => updateAllCamerasCallback());
    dimensionFolder.add(carParams, 'camDepth', -10, 30).name('相机嵌入深度 (cm)').onChange(() => updateAllCamerasCallback());
    dimensionFolder.add(carParams, 'markerRange', 5, 100).name('标尺显示范围 (m)').onChange(() => createMarkers(scene, carParams));
    dimensionFolder.add(carParams, 'showMarkers').name('显示距离标尺').onChange(() => createMarkers(scene, carParams));
    dimensionFolder.add(carParams, 'showCalibration').name('显示标定布').onChange(() => createCalibrationBoards(scene, carParams));

    const calibrationFolder = gui.addFolder('0.5 标定布位置');
    calibrationFolder.add(carParams, 'calibrationFrontBackOffset', 5, 100).name('前后偏移 (cm)').onChange(() => createCalibrationBoards(scene, carParams));
    calibrationFolder.add(carParams, 'calibrationSideOffset', 5, 100).name('侧方偏移 (cm)').onChange(() => createCalibrationBoards(scene, carParams));

    const fovFolder = gui.addFolder('1. 相机视距与 FOV');
    fovFolder.add(carParams, 'viewDistance', 1, 200).name('统一视距 (m)').onChange(() => updateCameraProjectionCallback());
    fovFolder.add(carParams, 'focalLength', 1.0, 10.0).name('焦距 (mm)').onChange(() => updateCameraProjectionCallback());
    fovFolder.add(carParams, 'hFOV', 10, 190).name('统一水平视场角 (deg)').onChange(() => updateCameraProjectionCallback());
    fovFolder.add(carParams, 'vFOV', 10, 190).name('统一垂直视场角 (deg)').onChange(() => updateCameraProjectionCallback());
    fovFolder.add(carParams, 'fovDisplayMode', ['Lines', 'Box', 'Both', 'None']).name('视场显示方式').onChange(() => updateFovDisplayModeCallback());
    fovFolder.add(carParams, 'fovDisplayDistance', 1, 50).name('视场显示距离 (m)').onChange(() => updateFovDisplayModeCallback());
    modelController = fovFolder.add(carParams, 'cameraModel').name('当前成像模型').listen();
    modelController.domElement.style.pointerEvents = 'none';

    const yawFolder = gui.addFolder('2. 水平安装角');
    ['front', 'back', 'left', 'right'].forEach(key => {
        const labelMap = { front: '前', back: '后', left: '左', right: '右' };
        yawFolder.add(carParams, `${key}Yaw`, -180, 180).name(`${labelMap[key]}相机 (deg)`).onChange(v => {
            cameraInstallation[key].yaw = v;
            updateCameraOrientation(key);
        });
    });
    yawFolder.close();

    const pitchFolder = gui.addFolder('3. 垂直安装角');
    ['front', 'back', 'left', 'right'].forEach(key => {
        const labelMap = { front: '前', back: '后', left: '左', right: '右' };
        pitchFolder.add(carParams, `${key}Pitch`, -90, 90).name(`${labelMap[key]}相机 (deg)`).onChange(v => {
            cameraInstallation[key].pitch = v;
            updateCameraOrientation(key);
        });
    });

    const skyFolder = gui.addFolder('4. 虚拟环境控制');
    skyFolder.close();

    return { gui, skyFolder, modelController };
}

export function initViewSelector(gui, carParams, controls) {
    let controlsEnabled = true;
    gui.add(carParams, 'activeView', ['Main', 'Front', 'Back', 'Left', 'Right']).name('当前视角').onChange(v => {
        controlsEnabled = (v === 'Main');
        controls.enabled = controlsEnabled;
    });
}
