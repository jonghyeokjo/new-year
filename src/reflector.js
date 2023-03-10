import { UniformsUtils, UniformsLib, ShaderChunk } from "three";
import {
    Plane,
    Vector3,
    Vector4,
    Matrix4,
    PerspectiveCamera,
    WebGLRenderTarget,
    Math as TMath,
    LinearFilter,
    RGBAFormat,
} from "three";
import {
    ShaderMaterial,
    DoubleSide,
    Color,
    TextureLoader,
    RepeatWrapping,
} from "three";

class GroundSceneReflector {
    constructor(meshobject, renderer, scene, data) {
        var three_scene = scene;
        var mirrorObj = meshobject;

        if (!mirrorObj) {
            return;
        }

        this.renderer = renderer;
        this.data = data ? data : {};
        // this.renderer.alpha = true;

        this.data.textureWidth = this.data.textureWidth
            ? this.data.textureWidth
            : 256;
        this.data.textureHeight = this.data.textureHeight
            ? this.data.textureHeight
            : 256;
        this.data.intensity = this.data.intensity ? this.data.intensity : 0.5;
        this.data.invertedUV = this.data.invertedUV
            ? this.data.invertedUV
            : false;
        this.data.wrapOne = this.data.wrapOne
            ? this.data.wrapOne
            : { x: 1, y: 1 };
        this.data.wrapTwo = this.data.wrapTwo
            ? this.data.wrapTwo
            : { x: 1, y: 1 };
        this.data.color = this.data.color ? this.data.color : "#848485";

        var reflectorPlane = new Plane();
        var normal = new Vector3();
        var reflectorWorldPosition = new Vector3();
        var cameraWorldPosition = new Vector3();
        var rotationMatrix = new Matrix4();
        var lookAtPosition = new Vector3(0, 0, -1);
        var clipPlane = new Vector4();
        var viewport = new Vector4();

        var view = new Vector3();
        var target = new Vector3();
        var q = new Vector4();

        var textureMatrix = new Matrix4();
        var virtualCamera = new PerspectiveCamera();
        var renderTarget = new WebGLRenderTarget(
            this.data.textureWidth,
            this.data.textureHeight,
            {
                minFilter: LinearFilter,
                magFilter: LinearFilter,
                format: RGBAFormat,
            }
        );

        if (
            !TMath.isPowerOfTwo(this.data.textureWidth) ||
            !TMath.isPowerOfTwo(this.data.textureHeight)
        ) {
            renderTarget.texture.generateMipmaps = false;
        }

        var scope = mirrorObj;
        var color = this.data.color;
        var textureWidth = this.data.textureWidth;
        var textureHeight = this.data.textureHeight;
        var clipBias = 0;
        var shader = ReflectorShader;
        var recursion = 0;

        var material = undefined;
        mirrorObj.material = undefined;
        if (!mirrorObj.material) {
            material = new ShaderMaterial({
                uniforms: UniformsUtils.clone(shader.uniforms),
                fragmentShader: shader.fragmentShader,
                vertexShader: shader.vertexShader,
                side: DoubleSide,
                transparent: true,
                lights: true,
            });

            material.uniforms.intensity.value = this.data.intensity;
            material.uniforms.tDiffuse.value = renderTarget.texture;
            material.uniforms.color.value = new Color(this.data.color);
            material.uniforms.invertedUV.value = this.data.invertedUV;
            material.uniforms.textureMatrix.value = textureMatrix;

            if (this.data.textureOne) {
                var texture = new TextureLoader().load(this.data.textureOne);
                texture.wrapS = RepeatWrapping;
                texture.wrapT = RepeatWrapping;
                texture.repeat.set(this.data.wrapOne.x, this.data.wrapOne.y);
                material.uniforms.tOneFlag.value = true;
                material.uniforms.tOne.value = texture;
                material.uniforms.tOneWrapX.value = texture.repeat.x;
                material.uniforms.tOneWrapY.value = texture.repeat.y;
            }

            if (this.data.textureTwo) {
                var texture = new TextureLoader().load(this.data.textureTwo);
                texture.wrapS = RepeatWrapping;
                texture.wrapT = RepeatWrapping;
                texture.repeat.set(this.data.wrapTwo.x, this.data.wrapTwo.y);
                material.uniforms.tTwoFlag.value = true;
                material.uniforms.tSec.value = texture;
                material.uniforms.tTwoWrapX.value = texture.repeat.x;
                material.uniforms.tTwoWrapY.value = texture.repeat.y;
            }
            mirrorObj.material = material;
            this.material = material;
        }

        mirrorObj.onBeforeRender = function (renderer, scene, camera) {
            if ("recursion" in camera.userData) {
                if (camera.userData.recursion === recursion) return;
                camera.userData.recursion++;
            }

            reflectorWorldPosition.setFromMatrixPosition(scope.matrixWorld);
            cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
            rotationMatrix.extractRotation(scope.matrixWorld);
            normal.set(0, 0, 1);
            normal.applyMatrix4(rotationMatrix);
            view.subVectors(reflectorWorldPosition, cameraWorldPosition);
            // Avoid rendering when reflector is facing away

            // if ( view.dot( normal ) > 0 ) return;
            view.reflect(normal).negate();
            view.add(reflectorWorldPosition);
            rotationMatrix.extractRotation(camera.matrixWorld);
            lookAtPosition.set(0, 0, -1);
            lookAtPosition.applyMatrix4(rotationMatrix);
            lookAtPosition.add(cameraWorldPosition);
            target.subVectors(reflectorWorldPosition, lookAtPosition);
            target.reflect(normal).negate();
            target.add(reflectorWorldPosition);
            virtualCamera.position.copy(view);
            virtualCamera.up.set(0, 1, 0);
            virtualCamera.up.applyMatrix4(rotationMatrix);
            virtualCamera.up.reflect(normal);
            virtualCamera.lookAt(target);
            virtualCamera.near = camera.near;
            virtualCamera.far = camera.far; // Used in WebGLBackground
            virtualCamera.fov = camera.fov;
            virtualCamera.updateMatrixWorld();
            virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
            virtualCamera.userData.recursion = 0;
            // Update the texture matrix
            textureMatrix.set(
                0.5,
                0.0,
                0.0,
                0.5,
                0.0,
                0.5,
                0.0,
                0.5,
                0.0,
                0.0,
                0.5,
                0.5,
                0.0,
                0.0,
                0.0,
                1.0
            );

            textureMatrix.multiply(virtualCamera.projectionMatrix);
            textureMatrix.multiply(virtualCamera.matrixWorldInverse);
            textureMatrix.multiply(scope.matrixWorld);

            // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
            // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
            reflectorPlane.setFromNormalAndCoplanarPoint(
                normal,
                reflectorWorldPosition
            );
            reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

            clipPlane.set(
                reflectorPlane.normal.x,
                reflectorPlane.normal.y,
                reflectorPlane.normal.z,
                reflectorPlane.constant
            );

            var projectionMatrix = virtualCamera.projectionMatrix;
            q.x =
                (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) /
                projectionMatrix.elements[0];
            q.y =
                (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) /
                projectionMatrix.elements[5];
            q.z = -1.0;
            q.w =
                (1.0 + projectionMatrix.elements[10]) /
                projectionMatrix.elements[14];

            // Calculate the scaled plane vector
            clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
            // Replacing the third row of the projection matrix
            projectionMatrix.elements[2] = clipPlane.x;
            projectionMatrix.elements[6] = clipPlane.y;
            projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias;
            projectionMatrix.elements[14] = clipPlane.w;

            // Render

            scope.visible = false;

            var currentRenderTarget = renderer.getRenderTarget();

            // var currentVrEnabled = renderer.vr.enabled;
            var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

            // renderer.vr.enabled = false; // Avoid camera modification and recursion
            renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

            renderer.render(scene, virtualCamera, renderTarget, true);

            // renderer.vr.enabled = currentVrEnabled;
            renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

            renderer.setRenderTarget(currentRenderTarget);

            // Restore viewport

            var bounds = camera.bounds;

            if (bounds !== undefined) {
                var size = renderer.getSize();
                var pixelRatio = renderer.getPixelRatio();

                viewport.x = bounds.x * size.width * pixelRatio;
                viewport.y = bounds.y * size.height * pixelRatio;
                viewport.z = bounds.z * size.width * pixelRatio;
                viewport.w = bounds.w * size.height * pixelRatio;

                renderer.state.viewport(viewport);
            }
            scope.visible = true;
        };
    }
}
// 'vUv2 = textureMatrix * vec4( position, 1.0 );',
// 'vec4 reflection = texture2DProj( tDiffuse, vUv2 );',
// The if condition that was there before calculating colors or textures
// 'if(reflection.r == 1.0 && reflection.b == 1.0 && reflection.g == 1.0)',
//             '{',
//               'reflection.a = 0.0;',
//             '}',
// 'gl_FragColor = mix(gl_FragColor, vec4(c, 1.0), 1.0);',

//module.exports = {ReflectorShader, GroundSceneReflector};
export { GroundSceneReflector };
