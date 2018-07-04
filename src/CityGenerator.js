let CHUNK_LENGTH = 250;
let MAX_ALLEY_WIDTH = 5;

let loader;
let car;
let starField;

let drawPosX = [0, 0];
let drawGroundX = 0;
let availableBuildings = [];
let usedBuildings = [];


let dirLight;

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

    usedBuildings[0] = [];
    usedBuildings[1] = [];

    addLights();
    loadMaterials();
    addStars();
    generateBuildings();
    buildCity();
    addCar();

    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);
}

function addStars(){
    let starsGeometry = new THREE.Geometry();

    for ( let i = 0; i < 10000; i++ ) {
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

function addCar(){
    let spriteMap = loader.load(
        './Textures/Car.png',
        function (texture) {
            let spriteMaterial = new THREE.SpriteMaterial( { map: texture, color: 0xffffff } );
            car = new THREE.Sprite( spriteMaterial );
            car.position.z = 0;
            car.position.y = 4.25;
            car.position.x = 100;

            dirLight.target = car;
            car.scale.set(11, 4, 1);
            scene.add( car );
            console.log("Car added. Position is " + car.position.x + " " + car.position.y + " " + car.position.z);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (xhr) {
            console.log('An error happened');
        });
}

/**
 * Adds the hemisphere and direcitonal light used for lighting the city
 */
function addLights(){
    let ambientLight = new THREE.AmbientLight(0xeeeeff, 1);
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


    var helper = new THREE.CameraHelper( dirLight.shadow.camera );
    scene.add( helper );


}

/**
 * Adds a 'chunk' of buildings.
 * @param {int} startX - The x position for the 'lower-left' corner of this chunk.
 *                       The chunk will generate in the positive direction away from this point.
 * @param {int} startZ - The z position for the 'lower-left' corner of this chunk.
 *                       The chunk will generate in the positive direction away from this point.
 */
function buildCity(){
    let startX = drawPosX[0];

    while (drawPosX[0] < camera.position.x + CHUNK_LENGTH) {
        let building = availableBuildings.shift();
        building.position.x = drawPosX[0] + building._width / 2;
        building.position.y = building._height / 2;
        building.position.z = -35;
        scene.add(building);
        usedBuildings[0].push(building);

        drawPosX[0] += building._width + alleyWidth();
    }

    while (drawPosX[1] < drawPosX[0]){
        let building = availableBuildings.shift();
        building.position.x = drawPosX[1] + building._width / 2;
        building.position.y = building._height / 2;
        building.position.z = -55;
        scene.add(building);
        usedBuildings[1].push(building);
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

function cleanupBuildings(){
    if (!car){
        return;
    }

    let leftBorder = car.position.x - 250;
    while (usedBuildings[0][0].position.x < leftBorder){
        availableBuildings.push(usedBuildings[0].shift());
    }

    while (usedBuildings[1][1].position.x < leftBorder){
        availableBuildings.push(usedBuildings[1].shift());
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
    let building;

    for (let i = 0; i < 25; i++){
        let height = randomHeight();
        let width = randomWidth();

        // Standard cube building
        geometry = new THREE.BoxBufferGeometry( width, height, randomDepth());
        let r = Math.floor(Math.random() * 8);
        material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(" + r + "%, " + r + "%, " + r + "%)")});
        building = new THREE.Mesh(geometry, material);

        building._width = width;
        building._height = height;

        building.castShadow = true;
        building.receiveShadow = true;

        availableBuildings.push(building);
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
 * Noise function used to mottle ground texture comes
 * from https://github.com/ashima/webgl-noise, (C) Ashima Arts and Stefan Gustavson.
 * Used with permission.
 */
function loadMaterials(){

    material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(12%, 12%, 12%)")});
    renderer._microCache.set('sidewalk', material);

    material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(10%, 10%, 10%)")});
    renderer._microCache.set('curb', material);

    material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb(3%, 3%, 3%)")});
    renderer._microCache.set('road', material);

    // Load ground geometry
    geometry = new THREE.PlaneBufferGeometry(CHUNK_LENGTH, 65, 1, 3);
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
    // Min depth is 1, Max depth is ~3.
    return (Math.random() * 2 + 1) * 8;
}
/**
 * Randomly generates a building width
 */
function randomWidth(){
    // Min width is 1, Max width is 3
    return (Math.random() * 2 + 4) * 10;
}
/**
 * Randomly generates a building height. Results are unevenly distributed,
 * with taller buildings appearing somewhat less frequently.
 */
function randomHeight(){
    var rand = Math.random() * 10;
    // 90% of the time building height is between 20 and 100
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
 * Updates the scene. Runs at a maximum of 60 times per second.
 */
function animate(){
    buildCity();
    cleanupBuildings();
    requestAnimationFrame(animate);
    dirLight.position.x += .35;
    car.position.x += .35;
    camera.translateX(.35);
    starField.position.x += .35;
    renderer.render(scene, camera);
}