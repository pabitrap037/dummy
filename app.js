// Get the canvas element
const canvas = document.getElementById("renderCanvas");




// Create the Babylon.js engine
const engine = new BABYLON.Engine(canvas, true);




function parseURLParameters() {
    const params = new URLSearchParams(window.location.search);

    const pointsParam = params.get('points');
    const sizesParam = params.get('sizes');
    const messagesParam = params.get('messages');

    const points = pointsParam ? JSON.parse(pointsParam) : [];
    const sizes = sizesParam ? JSON.parse(sizesParam) : [];
    const messages = messagesParam ? JSON.parse(messagesParam) : [];

    return { points, sizes, messages };
}

function createWireBox(center, edgeSize, message, scene) {
    // Create a box
    const box = BABYLON.MeshBuilder.CreateBox("wireBox", { size: edgeSize }, scene);

    // Set the box position to the provided center
    box.position = center;

    // Create a bright green material
    const wireMaterial = new BABYLON.StandardMaterial("wireMaterial", scene);
    wireMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Bright green
    wireMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0); // Bright green
    wireMaterial.wireframe = true; // Set wireframe mode

    // Apply the material to the box
    box.material = wireMaterial;

    box.actionManager = new BABYLON.ActionManager(scene);
    box.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnLeftPickTrigger,
            function () {
                // Update the description text
                description.text = `${message}\nCenter: (${center.x}, ${center.y}, ${center.z})`;

                // Show the panel
                panel.isVisible = true;

                if (scene.activeCamera instanceof BABYLON.ArcRotateCamera) {
                    scene.activeCamera.target = center;
                }
            }
        )
    );

    return box;
}

function showAxis(size, scene, startingPoint = new BABYLON.Vector3(0, 0, 0)) {
    const makeTextPlane = function (text, color, textSize) {
        const dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
        dynamicTexture.hasAlpha = true;
        dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color, "transparent", true);

        const plane = new BABYLON.Mesh.CreatePlane("TextPlane", textSize, scene, true);
        plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
        plane.material.backFaceCulling = false;
        plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
        plane.material.diffuseTexture = dynamicTexture;

        return plane;
    };

    const axisX = BABYLON.Mesh.CreateLines("axisX", [
        startingPoint,
        startingPoint.add(new BABYLON.Vector3(size, 0, 0)),
        startingPoint.add(new BABYLON.Vector3(size * 0.95, 0.05 * size, 0)),
        startingPoint.add(new BABYLON.Vector3(size, 0, 0)),
        startingPoint.add(new BABYLON.Vector3(size * 0.95, -0.05 * size, 0))
    ], scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    const xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = startingPoint.add(new BABYLON.Vector3(0.9 * size, -0.05 * size, 0));

    const axisY = BABYLON.Mesh.CreateLines("axisY", [
        startingPoint,
        startingPoint.add(new BABYLON.Vector3(0, size, 0)),
        startingPoint.add(new BABYLON.Vector3(-0.05 * size, size * 0.95, 0)),
        startingPoint.add(new BABYLON.Vector3(0, size, 0)),
        startingPoint.add(new BABYLON.Vector3(0.05 * size, size * 0.95, 0))
    ], scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    const yChar = makeTextPlane("Y", "green", size / 10);
    yChar.position = startingPoint.add(new BABYLON.Vector3(0, 0.9 * size, -0.05 * size));

    const axisZ = BABYLON.Mesh.CreateLines("axisZ", [
        startingPoint,
        startingPoint.add(new BABYLON.Vector3(0, 0, size)),
        startingPoint.add(new BABYLON.Vector3(0, -0.05 * size, size * 0.95)),
        startingPoint.add(new BABYLON.Vector3(0, 0, size)),
        startingPoint.add(new BABYLON.Vector3(0, 0.05 * size, size * 0.95))
    ], scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    const zChar = makeTextPlane("Z", "blue", size / 10);
    zChar.position = startingPoint.add(new BABYLON.Vector3(0, 0.05 * size, 0.9 * size));

    return {
        xChar: xChar,
        yChar: yChar,
        zChar: zChar
    };
}

function computeCentroidOfVisibleMeshes(meshes) {
    let totalCentroid = new BABYLON.Vector3(0, 0, 0);
    let visibleCount = 0;

    meshes.forEach(mesh => {
        // Ensure the bounding info is up-to-date
        mesh.computeWorldMatrix(true);

        // Check if the mesh is visible
        if (mesh.isVisible) {
            const meshCentroid = mesh.getBoundingInfo().boundingBox.centerWorld;
            totalCentroid.addInPlace(meshCentroid);
            visibleCount++;
        }
    });

    // Average out the centroids
    if (visibleCount > 0) {
        totalCentroid.scaleInPlace(1 / visibleCount);
    }

    return totalCentroid;
}


function addMeshCentroidClickHandler(mesh, centroid) {
    mesh.actionManager = new BABYLON.ActionManager(scene);
    mesh.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnLeftPickTrigger,
            function () {
                if (scene.activeCamera instanceof BABYLON.ArcRotateCamera) {
                    scene.activeCamera.target = centroid;
                }
            }
        )
    );
}

// Create a basic scene
const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);  // Set the background color to black
    const axisLabels = showAxis(2, scene);

    engine.runRenderLoop(function () {
        // Make the text always face the camera
        axisLabels.xChar.lookAt(camera.position);
        axisLabels.yChar.lookAt(camera.position);
        axisLabels.zChar.lookAt(camera.position);

        scene.render();
    });

    // Create a camera
    const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", -Math.PI / 2, Math.PI / 2, 10, new BABYLON.Vector3(0, 0, 0), scene);
    camera.panningSensibility = 0;
    camera.attachControl(canvas, true);


    // Create a light
    const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);

    // Load a 3D model
    BABYLON.SceneLoader.ImportMesh("", "http://localhost:8000/models/f-15/", "F-15E.glb", scene, function (meshes) {
        // This callback is executed when the model is loaded
        // You can manipulate the loaded meshes or perform other actions here
        meshes.forEach(mesh => {
            if (mesh.name.startsWith("Плоскость")) {
                mesh.isVisible = false;
            }

        });
        const centroid = computeCentroidOfVisibleMeshes(meshes);

        meshes.forEach(mesh => {
            if (mesh.isVisible) {
                addMeshCentroidClickHandler(mesh, centroid);
            }
        });
        console.log("Model loaded!");
    });

    return scene;
};


// Call the createScene function
const scene = createScene();

const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

const panel = new BABYLON.GUI.StackPanel();
panel.width = "320px";
panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
advancedTexture.addControl(panel);

const header = new BABYLON.GUI.TextBlock();
header.text = "Box Details";
header.height = "40px";
header.color = "white";
panel.addControl(header);

const description = new BABYLON.GUI.TextBlock();
description.height = "180px";
description.color = "white";
panel.addControl(description);

// Initially hide the panel
panel.isVisible = false;

const { points, sizes, messages } = parseURLParameters();

for (let i = 0; i < points.length; i++) {
    const center = new BABYLON.Vector3(...points[i]);
    const edgeSize = sizes[i];
    const message = messages[i];
    createWireBox(center, edgeSize, message, scene);
}

// Render the scene
engine.runRenderLoop(function () {
    scene.render();
});

// Resize the engine when the window is resized
window.addEventListener("resize", function () {
    engine.resize();
});


