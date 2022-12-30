import * as THREE from "three";
import CSM from "three-csm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let model;
let mixer;
let snowBool = false;
let plane;
let planes = [];
let newPlanes;
let cloneChildren = 10;
const musicStart = document.getElementById("musicBtn");
const musicStop = document.getElementById("musicStopBtn");
const imgLink = document.getElementById("imgLink");

import loadGlb from "../src/asset/model/happyNewYaer.glb?url";
import loadTexture from "../src/asset/img/flow_2022-111-30_171147630.png?url";
import backMusic from "../src/asset/audio/bgSound.mp3?url";

export default function example() {
    const canvas = document.querySelector("#three-canvas");
    const renderer = new THREE.WebGLRenderer({
        canvas,
        //블록현상 해결
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    /**Scene */
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    camera.position.set(0.3, 1.77, 3);
    /**카메라가 해당 위치를 바라봄 */
    // camera.zoom = 0.5;

    /**카메라 렌더에 관한 속성을 변경했을 시 */
    camera.updateProjectionMatrix();
    /**orbitcontrols */
    scene.add(camera);

    // const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new THREE.Mesh(boxGeometry, material);
    // cube.position.set(0, 0, 200);

    // scene.add(cube);
    // const gui = new dat.GUI();
    // gui.add;

    /**조명설정 */
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
    directionalLight.position.set(10.5, 6, 14.8);
    scene.add(directionalLight);

    const hemLight = new THREE.HemisphereLight(0xffffff, 0x7e7d7c, 0.1);
    hemLight.position.set(-7.95, -50, -50);
    scene.add(hemLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 70);
    pointLight.position.set(-24.2, 30, 50);
    pointLight.castShadow = true;
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xffffff, 1, 70);
    pointLight2.position.set(-24.2, -22, 48);
    pointLight2.castShadow = true;
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xffffff, 1, 70);
    pointLight3.position.set(28, 10.5, 6);
    scene.add(pointLight3);

    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-20, 11, 18.1);
    scene.add(spotLight);

    const spotLight2 = new THREE.SpotLight(0xffffff);
    spotLight2.position.set(0, 10.5, -29);
    scene.add(spotLight2);

    const spotLight3 = new THREE.SpotLight(0xffffff);
    spotLight3.position.set(28, 10.5, 6);
    scene.add(spotLight3);

    new GLTFLoader().load(loadGlb, (gltf) => {
        gltf.scene.traverse((obj3d) => {
            if (obj3d.isMesh) {
                obj3d.castShadow = true;
            }
            if (obj3d.material) {
                obj3d.material.depthWrite = true;
                obj3d.material.alphaTest = 0.5;

                if (obj3d.material.map) {
                    obj3d.material.map.encoding = THREE.sRGBEncoding;
                }
            }
        });
        model = gltf.scene;
        model.position.set(0, 0.15, 0);
        const clips = gltf.animations;
        mixer = new THREE.AnimationMixer(model);
        const clip = THREE.AnimationClip.findByName(clips, "Hi");
        const action = mixer.clipAction(clip);
        action.play();
        const parent = new THREE.Object3D();
        parent.add(model);
        scene.add(parent);
    });
    camera.lookAt(0, 0, 0);

    const textureLoader = new THREE.TextureLoader();
    const textureImage = textureLoader.load(
        loadTexture,
        () => {
            console.log("로드완료");
        },
        () => {
            console.log("로드 중");
        },
        () => {
            console.log("로드 에러");
        }
    );
    textureImage.wrapS = textureImage.wrapT = THREE.RepeatWrapping;
    const planePiece = new THREE.SphereGeometry(0.1, 10, 10);
    const planeMat = new THREE.MeshBasicMaterial({
        color: "white",

        map: textureImage,

        side: THREE.DoubleSide,
    });
    const rand = Math.random;
    const controls = new OrbitControls(camera, renderer.domElement);
    /**오르비트 컨트롤 세팅  */
    //줌불가
    controls.enableZoom = false;
    //카메라 수직앵글 정도값
    controls.minPolarAngle = Math.PI / 2 - 0.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.5;
    const normalSound = new Audio();
    backMusic;
    normalSound.src = backMusic;
    normalSound.muted = true;

    setInterval(() => {
        if (snowBool) {
            for (let i = 0; i < 100; i++) {
                newPlanes = planes[i];
                newPlanes.rotation.x += newPlanes.rotation.dx;
                newPlanes.rotation.y += newPlanes.rotation.dy;
                newPlanes.rotation.z += newPlanes.rotation.dz;
                newPlanes.position.y -= 0.1;
                if (newPlanes.position.y < -0.6) newPlanes.position.y += 15;
            }
        } else {
            for (const a of scene.children) {
                if (a.type === "Mesh") {
                    planes = [];
                    scene.remove(a);
                }
            }
        }
    }, 32);

    /**이벤트 명령러*/
    window.addEventListener("resize", onWindowResize);
    musicStart.addEventListener("click", onStartMusic);
    musicStop.addEventListener("click", onStopMusic);
    imgLink.addEventListener("click", () => {
        window.open("http://pg-ander.com/", "_blank");
    });
    /**이벤트 함수*/
    function onStartMusic() {
        normalSound.play();
        normalSound.loop = true;
        normalSound.muted = false;
        musicStop.style.visibility = "visible";
        musicStart.style.visibility = "hidden";

        for (let i = 0; i < 100; i++) {
            plane = new THREE.Mesh(planePiece, planeMat);
            plane.name = plane;
            plane.rotation.set(rand(), rand(), rand());
            plane.rotation.dx = rand() * 0.1;
            plane.rotation.dy = rand() * 0.1;
            plane.rotation.dz = rand() * 0.1;

            plane.position.set(
                rand() * 10 - 5,
                0 + rand() * 15,
                rand() * 10 - 1
            );
            console.log(plane.position);
            plane.visible = true;
            scene.add(plane);
            planes.push(plane);
        }
        snowBool = true;
    }
    function onStopMusic() {
        normalSound.pause();
        normalSound.muted = true;
        musicStart.style.visibility = "visible";
        musicStop.style.visibility = "hidden";
        snowBool = false;
    }
    function onWindowResize() {
        const width = window.innerWidth || 1;
        const height = window.innerHeight || 1;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    /**창 크기가 변경될때 실행되는 함수*/
    let oldTime = Date.now();

    function animate() {
        renderer.render(scene, camera);
        requestAnimationFrame(animate);

        const newTime = Date.now();
        const deltaTime = newTime - oldTime;
        oldTime = newTime;
        if (mixer) {
            mixer.update(0.02);
        }
        if (model) {
            model.rotation.y += deltaTime * 0.0005;
        }
        // csm.update();
        controls.update();
        onWindowResize();
    }
    animate();
}
