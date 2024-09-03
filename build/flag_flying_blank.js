const drawingSpeedMultiplier = 0.5;
const zoomInDuration = 0.5;
const bounceOutDuration = 0.5;
const backgroundColor = 0xffffff;
const lineColor = 0x000000;
let amplitude = 0.35;
let frequencyX = 1.0;
let frequencyY = 0.3;
let speed = 0.6;
let waveLayers = 8;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(backgroundColor, 1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 1, 1).normalize();
scene.add(light);

const flagGroup = new THREE.Group();
scene.add(flagGroup);

const flagWidth = 12;
const flagHeight = (2 / 3) * flagWidth;
const segW = 30;
const segH = 20;

const rOuter = flagHeight / 3;
const rInner = rOuter * Math.sin(Math.PI / 10) / Math.cos(Math.PI / 5);

const starVertices = [];
for (let i = 0; i < 5; i++) {
    const outerAngle = ((i * 2 * Math.PI) / 5 - Math.PI / 2) + Math.PI;
    const innerAngle = (((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2) + Math.PI;
    starVertices.push(
        new THREE.Vector3(rOuter * Math.cos(outerAngle), rOuter * Math.sin(outerAngle), 0)
    );
    starVertices.push(
        new THREE.Vector3(rInner * Math.cos(innerAngle), rInner * Math.sin(innerAngle), 0)
    );
}

starVertices.push(starVertices[0]);

const starCanvas = document.createElement('canvas');
starCanvas.width = 1024;
starCanvas.height = 1024;
const starContext = starCanvas.getContext('2d');

starContext.fillStyle = 'red';
starContext.fillRect(0, 0, starCanvas.width, starCanvas.height);

starContext.fillStyle = 'yellow';
starContext.beginPath();
for (let i = 0; i < 5; i++) {
    const outerAngle = ((i * 2 * Math.PI) / 5 - Math.PI / 2);
    const innerAngle = (((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2);
    starContext.lineTo(
        512 + (rOuter * Math.cos(outerAngle)) * (1024 / flagWidth),
        512 + (rOuter * Math.sin(outerAngle)) * (1024 / flagHeight)
    );
    starContext.lineTo(
        512 + (rInner * Math.cos(innerAngle)) * (1024 / flagWidth),
        512 + (rInner * Math.sin(innerAngle)) * (1024 / flagHeight)
    );
}
starContext.closePath();
starContext.fill();

const starTexture = new THREE.CanvasTexture(starCanvas);

function drawLine(vertices, duration, onComplete) {
    const material = new THREE.LineBasicMaterial({ color: lineColor });
    const geometry = new THREE.BufferGeometry().setFromPoints([vertices[0], vertices[0]]);
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    let progress = 0;
    const numSegments = vertices.length;

    function animateLine() {
        progress += 1 / (duration * 60 * drawingSpeedMultiplier);
        if (progress > 1) progress = 1;

        const segment = Math.floor(progress * (numSegments - 1));
        const segmentProgress = progress * (numSegments - 1) - segment;

        if (segment < numSegments - 1) {
            const start = vertices[segment];
            const end = vertices[segment + 1];
            const currentPoint = start.clone().lerp(end, segmentProgress);

            const currentVertices = [...vertices.slice(0, segment + 1), currentPoint];
            line.geometry.setFromPoints(currentVertices);
        } else {
            line.geometry.setFromPoints(vertices);
            if (onComplete) onComplete();
        }

        if (progress < 1) {
            requestAnimationFrame(animateLine);
        }
    }

    animateLine();
}

const rectVertices = [
    new THREE.Vector3(-flagWidth / 2, flagHeight / 2, 0),
    new THREE.Vector3(flagWidth / 2, flagHeight / 2, 0),
    new THREE.Vector3(flagWidth / 2, -flagHeight / 2, 0),
    new THREE.Vector3(-flagWidth / 2, -flagHeight / 2, 0),
    new THREE.Vector3(-flagWidth / 2, flagHeight / 2, 0)
];

drawLine(rectVertices, 2, function () {
    drawLine(starVertices, 2, function () {
        const flagMaterial = new THREE.MeshLambertMaterial({
            map: starTexture,
            side: THREE.DoubleSide,
            wireframe: false,
        });
        const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight, segW, segH);
        const flagMesh = new THREE.Mesh(flagGeometry, flagMaterial);
        flagGroup.add(flagMesh);

        gsap.to(camera.position, {
            z: 8, duration: zoomInDuration, ease: "power2.inOut", onComplete: function () {
                gsap.to(camera.position, {
                    z: 10, duration: bounceOutDuration, ease: "elastic.out(1, 0.3)", onComplete: function () {
                        hideLines();
                        runEffectsLeftToRightWithShadow(flagMesh);
                    }
                });
            }
        });
    });
});

const hideLines = () => {
    scene.children = scene.children.filter((object) => {
        if (object.isLine) {
            scene.remove(object);
            return false;
        }
        return true;
    });
};

const runEffects = (flagMesh, amplitude = 0.2, frequencyX = 0.5, frequencyY = 0.3, speed = 0.5) => {
    const flagVertexArray = flagMesh.geometry.attributes.position.array;
    const time = Date.now() * speed / 50;

    for (let y = 0; y < segH + 1; y++) {
        for (let x = 0; x < segW + 1; x++) {
            const index = x + y * (segW + 1);
            flagVertexArray[index * 3 + 2] = Math.sin(frequencyX * x + time) * amplitude + Math.sin(frequencyY * y + time) * amplitude;
        }
    }

    flagMesh.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    window.requestAnimationFrame(() => runEffects(flagMesh, amplitude, frequencyX, frequencyY, speed));
};

const runEffectsLeftToRight = (flagMesh, amplitude = 0.5, frequencyX = 2.0, frequencyY = 1.5, speed = 1.0) => {
    const flagVertexArray = flagMesh.geometry.attributes.position.array;
    const time = Date.now() * speed / 50;

    for (let y = 0; y < segH + 1; y++) {
        for (let x = 0; x < segW + 1; x++) {
            const index = x + y * (segW + 1);

            const wavePhase = (x + y) * 0.5;

            let z = Math.sin(frequencyX * x + frequencyY * y + time - wavePhase) * amplitude;

            z += Math.sin(frequencyX * 0.5 * x + time * 0.5 - wavePhase * 0.5) * amplitude * 0.3;
            z += Math.sin(frequencyX * 1.5 * x + time * 1.5 - wavePhase * 1.5) * amplitude * 0.2;
            z += Math.sin(frequencyX * 0.75 * x + time * 0.75 - wavePhase * 0.75) * amplitude * 0.25;
            z += Math.sin(frequencyX * 1.25 * x + time * 1.25 - wavePhase * 1.25) * amplitude * 0.35;

            z += Math.sin(frequencyY * 0.5 * y + time * 0.5 - wavePhase * 0.5) * amplitude * 0.3;
            z += Math.sin(frequencyY * 1.5 * y + time * 1.5 - wavePhase * 1.5) * amplitude * 0.2;
            z += Math.sin(frequencyY * 0.75 * y + time * 0.75 - wavePhase * 0.75) * amplitude * 0.25;
            z += Math.sin(frequencyY * 1.25 * y + time * 1.25 - wavePhase * 1.25) * amplitude * 0.35;

            flagVertexArray[index * 3 + 2] = z;
        }
    }

    flagMesh.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    window.requestAnimationFrame(() => runEffectsLeftToRight(flagMesh, amplitude, frequencyX, frequencyY, speed));
};

const runEffectsLeftToRightWithShadow = (flagMesh) => {
    const flagVertexArray = flagMesh.geometry.attributes.position.array;
    const time = Date.now() * speed / 50;

    for (let y = 0; y < segH + 1; y++) {
        for (let x = 0; x < segW + 1; x++) {
            const index = x + y * (segW + 1);

            const wavePhase = (x + y) * 0.5;

            let z = Math.sin(frequencyX * x + frequencyY * y + time - wavePhase) * amplitude;

            for (let i = 1; i <= waveLayers; i++) {
                const freqFactor = i * 0.5;
                const ampFactor = 0.3 / i;
                z += Math.sin(frequencyX * freqFactor * x + time * freqFactor - wavePhase * freqFactor) * amplitude * ampFactor;
                z += Math.sin(frequencyY * freqFactor * y + time * freqFactor - wavePhase * freqFactor) * amplitude * ampFactor;
            }

            flagVertexArray[index * 3 + 2] = z;
        }
    }

    flagMesh.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    window.requestAnimationFrame(() => runEffectsLeftToRightWithShadow(flagMesh));
};

const gui = new dat.GUI();
const controls = {
    amplitude: amplitude,
    frequencyX: frequencyX,
    frequencyY: frequencyY,
    speed: speed,
    waveLayers: waveLayers
};

gui.add(controls, 'amplitude', 0, 1).name('Amplitude').onChange(value => amplitude = value);
gui.add(controls, 'frequencyX', 0, 5).name('Frequency X').onChange(value => frequencyX = value);
gui.add(controls, 'frequencyY', 0, 5).name('Frequency Y').onChange(value => frequencyY = value);
gui.add(controls, 'speed', 0, 2).name('Speed').onChange(value => speed = value);
gui.add(controls, 'waveLayers', 1, 10, 1).name('Wave Layers').onChange(value => waveLayers = value);

const guiContainer = gui.domElement.parentElement;
guiContainer.style.position = 'absolute';
guiContainer.style.top = '0';
guiContainer.style.right = '0';
guiContainer.style.zIndex = '9999';

camera.position.z = 10;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();