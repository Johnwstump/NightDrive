
let CHUNK_LENGTH = 250;
let MAX_ALLEY_WIDTH = 5;
let NUM_STARS = 10000;
let BUILDING_POOL = 25;

let loader;
let car;
let starField;
let dirLight;

let drawPosX = [0, 0];
let drawGroundX = 0;
let availableBuildings = [];

init();
animate();

function init() {
    camera = new THREE.CombinedCamera(window.innerWidth / 2, window.innerHeight / 2, 75, 1, 100000, -500, 1000);
    camera.position.y = 20;
    camera.position.x = 100;
    camera.position.z = 35;

    scene = new THREE.Scene();


    // Set up Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xffffff);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;

    renderer._microCache = new MicroCache();
    renderer.setClearColor (0x05040f, 1)


    loader = new THREE.TextureLoader();

    addLights();
    loadMaterials();
    addStars();
    generateBuildings();
    buildCity();
    addCar();

    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);
}

/**
 * Creates and randomly places NUM_STARS vertices to serve as stars.
 */
function addStars(){
    let starsGeometry = new THREE.Geometry();

    for ( let i = 0; i < NUM_STARS; i++ ) {
        let star = new THREE.Vector3();
        star.x = THREE.Math.randFloatSpread( 80000 );
        star.y = THREE.Math.randFloatSpread( 60000) + 20000;
        star.z = -20000;

        starsGeometry.vertices.push( star );
    }

    let starsMaterial = new THREE.PointsMaterial( { color: 0x888888 } );

    starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
}

/**
 * Adds a car in
 */
function addCar(){
    loader.load(
        './Textures/car_texture.jpg',
        function (texture) {
            let objLoader = new THREE.OBJLoader();
            objLoader.setPath('./Models/');
            objLoader.load('car.obj', function (object) {
                    object.traverse(function (child) {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            child.material.map = texture;
                        }
                    });
                    object.position.y = -.65;
                    object.position.z = -5;
                    object.position.x = 100;
                    object.scale.z = 10;
                    object.scale.x = 10;
                    object.scale.y = 10;
                    object.rotateY(0);
                    object.castShadow = true;
                    object.receiveShadow = true;
                    scene.add(object);
                    car = object;
                    dirLight.target = car;
                }, function (xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                function (xhr) {
                    console.log('An error happened');
                });
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (xhr) {
            console.log('An error happened');
        });
}

/**
 * Adds an ambient and directional light
 */
function addLights(){
    let ambientLight = new THREE.AmbientLight(0xeeeeff, .5);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight (0xffffff, 1.5);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(100, 1000, -500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 2000;
    dirLight.shadow.camera.fov = 50;

    dirLight.shadow.camera.top = 75;
    dirLight.shadow.camera.bottom = -75;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadowBias = 0.02;
    scene.add(dirLight);
}

/**
 * Adds ground and buildings in the direction of travel(pos X) to CHUNK_LENGTH distance
 */
function buildCity(){
    let startX = drawPosX[0];

    while (drawPosX[0] < camera.position.x + CHUNK_LENGTH) {
        let building = availableBuildings.shift();
        building.position.x = drawPosX[0] + building._width / 2;
        building.position.y = building._height / 2;
        building.position.z = -35;
        scene.add(building);
        availableBuildings.push(building);

        drawPosX[0] += building._width + alleyWidth();
    }

    while (drawPosX[1] < drawPosX[0]){
        let building = availableBuildings.shift();
        building.position.x = drawPosX[1] + building._width / 2;
        building.position.y = building._height / 2;
        building.position.z = -55;
        scene.add(building);
        availableBuildings.push(building);
        drawPosX[1] += building._width + alleyWidth();
    }

    if (drawGroundX < startX + CHUNK_LENGTH){
        // Draw the sidewalk
        let sidewalk = getSidewalk(drawGroundX);
        scene.add(sidewalk);

        // Draw the curb between the sidewalk and road
        let curb = getCurb(drawGroundX);
        scene.add(curb);

        // Draw the road in front of the buildings
        let road = getRoad(drawGroundX, 0);
        scene.add(road);

        // Draw the road behind the buildings
        road = getRoad(drawGroundX, -90);
        scene.add(road);

        // Store working position
        drawGroundX += CHUNK_LENGTH;
    }
}

/**
 * Generates a random float representing the width of an alley between two buildings.
 * @Returns A random float between 0 and MAX_ALLEY_WIDTH
 */
function alleyWidth(){
    return Math.floor(Math.random() * MAX_ALLEY_WIDTH);
}

/**
 * Generates a random set of buildings to be reused when building city
 * and adds them to availableBuildings
 */
function generateBuildings(){
    for (let i = 0; i < BUILDING_POOL; i++){
        let buildingGroup = new THREE.Group();
        let height = randomHeight();
        let width = randomWidth();
        let depth = randomDepth();

        let geometry = new THREE.BoxBufferGeometry( width, height, depth);
        let r = Math.floor(Math.random() * 8);
        let material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(" + r + "%, " + r + "%, " + r + "%)")});
        let building = new THREE.Mesh(geometry, material);
        building.castShadow = true;
        building.receiveShadow = true;
        buildingGroup.add(building);


        // Select a semi-random window height and vertical spacing
        let windowHeight = Math.random() * 3 + 2;
        let verticalWindowGap = (Math.random() * 2) + 2;

        // Select a semi-random window width and horizontal spacing
        let windowWidth = Math.random() * 3 + 5;
        let horizontalWindowGap = (Math.random() * 2) + 2;

        // Calculate balanced vertical margins for the current building
        let numRows = Math.floor(height / (windowHeight + verticalWindowGap));
        let rowRemainder = height - ((windowHeight + verticalWindowGap) * numRows);

        // Calculate balanced horizontal margins for the current building
        let numCols = Math.floor(width / (windowWidth + horizontalWindowGap));
        let colRemainder = width - ((windowWidth + horizontalWindowGap) * numCols);

        // Set the initial y position
        // - height/2 sets to zero, windowHeight/2 starts at -x side of window, rowRemainder / 2 centers
        let yPos = - (height / 2) + (windowHeight / 2) + (rowRemainder / 2) + 1;

        // Pick a random value for window color for this building.
        r = Math.floor(Math.random() * 45 + 15);
        let windowMaterial = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(" + r + "%, " + r + "%, " + r + "%)")});
        // Brighten color for 'lit' windows.
        r += 40;
        let brightWindowMaterial = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(" + r + "%, " + r + "%, " + r + "%)")});

        // Place windows
        while (yPos + (windowHeight / 2) < height / 2){
            let xPos = - (width / 2) + (windowWidth / 2) + (colRemainder / 2) + 1;
            while ((xPos + windowWidth / 2) < width / 2){
                geometry = new THREE.PlaneBufferGeometry( windowWidth, windowHeight, 1);
                let window = new THREE.Mesh(geometry, Math.random() > .5 ? brightWindowMaterial : windowMaterial);
                window.position.z = depth / 2;
                window.position.x = xPos;
                window.position.y = yPos;
                buildingGroup.add(window);
                xPos += windowWidth + horizontalWindowGap;
            }
            yPos += verticalWindowGap + windowHeight;
        }

        buildingGroup._width = width;
        buildingGroup._height = height;

        buildingGroup.castShadow = true;
        buildingGroup.receiveShadow = true;

        availableBuildings.push(buildingGroup);
    }

}


/**
 * Creates a sidewalk plane of CHUNK_LENGTH width and places it
 * at posX.
 * @param {int} posX - The x position for this sidewalk plane.
 * @returns The sidewalk mesh
 */
function getSidewalk(posX){
    let material = renderer._microCache.get('sidewalk');
    let geometry = renderer._microCache.get('sidewalkGeo');
    let sidewalk = new THREE.Mesh(geometry, material);

    sidewalk.castShadow = false;
    sidewalk.receiveShadow = true;

    sidewalk.position.y = 0;
    sidewalk.position.z = -45;
    sidewalk.position.x = posX + (CHUNK_LENGTH / 2);
    return sidewalk;
}

/**
 * Creates a ground plane.
 * @param {int} posX - The x position for this ground plane.
 * @param {int} posZ - The x position for this ground plane.
 */
function getCurb(posX){
    let material = renderer._microCache.get('curb');
    let geometry = renderer._microCache.get('curbGeo');
    let curb = new THREE.Mesh(geometry, material);
    curb.castShadow = true;
    curb.receiveShadow = true;
    curb.position.y = -.25;
    curb.position.z = -12.5;
    curb.position.x = posX + (CHUNK_LENGTH / 2);
    return curb;
}

/**
 * Creates a ground plane.
 * @param {int} posX - The x position for this ground plane.
 * @param {int} posZ - The x position for this ground plane.
 */
function getRoad(posX, posZ){
    let material = renderer._microCache.get('road');
    let geometry = renderer._microCache.get('roadGeo');
    let road = new THREE.Mesh(geometry, material);
    road.castShadow = true;
    road.receiveShadow = true;
    road.position.y = -.5;
    road.position.z = posZ;
    road.position.x = posX + (CHUNK_LENGTH / 2);
    return road;
}

/**
 * Loads and caches the commonly used meshes, materials, and textures needed to draw the
 * city.
 */
function loadMaterials(){

    let material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(12%, 12%, 12%)")});
    renderer._microCache.set('sidewalk', material);

    material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(10%, 10%, 10%)")});
    renderer._microCache.set('curb', material);

    material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(3%, 3%, 3%)")});
    renderer._microCache.set('road', material);

    // Load ground geometry
    let geometry = new THREE.PlaneBufferGeometry(CHUNK_LENGTH, 65, 1, 3);
    geometry.rotateX( - Math.PI / 2);
    renderer._microCache.set('sidewalkGeo', geometry);

    geometry = new THREE.PlaneBufferGeometry(CHUNK_LENGTH, 25, 1, 3);
    geometry.rotateX( - Math.PI / 2);
    renderer._microCache.set('roadGeo', geometry);

    geometry = new THREE.PlaneBufferGeometry(CHUNK_LENGTH, .5, 1, 3);
    renderer._microCache.set('curbGeo', geometry);
}

/**
 * Randomly generates a building depth
 */
function randomDepth(){
    return (Math.random() * 2 + 1) * 8;
}

/**
 * Randomly generates a building width
 */
function randomWidth(){
    return (Math.random() * 2 + 4) * 10;
}

/**
 * Randomly generates a building height. Results are unevenly distributed,
 * with taller buildings appearing somewhat less frequently.
 */
function randomHeight(){
    var rand = Math.random() * 10;
    // 90% of the time building height is between 12 and 24
    if (rand <= 9){
        return 12 * (rand + 1);
    }
    else if (rand > 9){
        // 10% of the time building height is between 3 and 18
        return (Math.random() * 10 + 125);
    }
}
/**
 * Alters camera's aspect ratio on window resize
 */
function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Moves the car, starfield, directional light, and camera in
 * the direction of travel (pos X).
 */
function move(){
    dirLight.position.x += .25;
    if (car) {
        car.position.x += .25;
    }
    camera.translateX(.25);
    starField.position.x += .25;
}

/**
 * Updates the scene. Runs at a maximum of 60 times per second.
 */
function animate() {
    buildCity();
    move();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}