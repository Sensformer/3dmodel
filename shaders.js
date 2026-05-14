export const fisheyeVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const fisheyeFragmentShader = `
    uniform sampler2D tDiffuse;
    uniform float hFOV;
    uniform float vFOV;
    uniform int cameraModel;
    varying vec2 vUv;

    void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        
        if (cameraModel == 0) {
            gl_FragColor = texture2D(tDiffuse, vUv);
            return;
        }
        
        float aspect = tan(radians(hFOV) / 2.0) / tan(radians(vFOV) / 2.0);
        uv.x *= aspect;
        
        float r = length(uv);
        
        if (r > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
        
        float phi = atan(uv.y, uv.x);
        
        float fovH = radians(hFOV);
        float fovV = radians(vFOV);
        
        float maxFOV = max(fovH, fovV);
        
        float theta;
        if (cameraModel == 1) {
            float r2 = r * r;
            float r4 = r2 * r2;
            float r6 = r4 * r2;
            float r8 = r6 * r2;
            theta = r * (1.0 + 1.0 * r2 + 0.8 * r4 + 0.5 * r6 + 0.3 * r8) * (maxFOV / 2.0);
        } else {
            theta = r * (maxFOV / 2.0) * 2.0;
        }
        
        theta = clamp(theta, 0.0, 3.1415926535 / 2.0);
        
        float tanTheta = tan(theta);
        
        vec2 dir;
        dir.x = tanTheta * cos(phi);
        dir.y = tanTheta * sin(phi);
        
        float scaleX = 1.0 / (2.0 * tan(fovH / 2.0));
        float scaleY = 1.0 / (2.0 * tan(fovV / 2.0));
        
        vec2 texUv;
        texUv.x = 0.5 + dir.x * scaleX;
        texUv.y = 0.5 + dir.y * scaleY;
        
        if (texUv.x < 0.0 || texUv.x > 1.0 || texUv.y < 0.0 || texUv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
            gl_FragColor = texture2D(tDiffuse, texUv);
        }
    }
`;
