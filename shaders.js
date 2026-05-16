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
    varying vec2 vUv;

    void main() {
        vec2 centered = vUv - 0.5;
        float r = length(centered) * 2.0;

        if (r > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }

        float phi = atan(centered.y, centered.x);
        float theta = r * radians(hFOV) / 2.0;
        theta = min(theta, 3.14159 / 2.0 - 0.001);

        vec3 dir;
        dir.x = sin(theta) * cos(phi);
        dir.y = sin(theta) * sin(phi);
        dir.z = cos(theta);

        float focalLength = 0.5 / tan(radians(hFOV) / 2.0);

        float u = dir.x / (focalLength * dir.z) + 0.5;
        float v = dir.y / (focalLength * dir.z) + 0.5;

        if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
            gl_FragColor = texture2D(tDiffuse, vec2(u, v));
        }
    }
`;
