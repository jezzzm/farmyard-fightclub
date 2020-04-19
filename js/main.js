
// Everything starts here

const app = {}; // global namespace object

app.controls = {
  spotlightColour: '#FFFFFF',
  debug: false,
  playerState: '',
  walkSpeed: 0.3,
  cameraPOV: 'world',
};

app.init = () => {
  console.log('Initialising...');

  app.gui = new dat.GUI(); // control panel!

  app.gui.addColor(app.controls, 'spotlightColour').onChange(val => {
    app.spotlight.color.setStyle(val);
  });

  app.gui.add(app.controls, 'debug').onChange(val => {
    Character.each(c => c.box.visible = val);
    Player.one.box.visible = val;
  });

  app.gui.add(app.controls, 'walkSpeed', 0, 1);

  app.gui.add(app.controls, 'playerState').listen();

  app.scene = new THREE.Scene();

  app.width = window.innerWidth;
  app.height = window.innerHeight;

  app.camera = new THREE.PerspectiveCamera(
    60, // field of view
    app.width / app.height, // aspect ratio
    1, // near field
    2000 // far field
  );

  app.camera.position.set(11, 6, 18); // where is the camera?
  app.camera.lookAt(app.scene.position); // what are we looking at?

  app.renderer = new THREE.WebGLRenderer();
  app.renderer.setSize(app.width, app.height);

  document.getElementById('output').appendChild(app.renderer.domElement);

  // Mouse control of the camera
  app.cameraControls = new THREE.OrbitControls(
    app.camera,
    app.renderer.domElement
  );

  // Make a spotlight
  app.spotlight = new THREE.SpotLight(0xFFFFFF);
  app.spotlight.position.set(-10, 60, 10);
  app.scene.add(app.spotlight);

  app.ambient = new THREE.AmbientLight(0xEEEEEE);
  app.scene.add(app.ambient);

  // // Make a cube
  // const cubeGeometry = new THREE.BoxGeometry( 4, 4, 4 );
  // const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF8F00 });
  //
  // const cube = new THREE.Mesh( cubeGeometry, cubeMaterial );
  // cube.position.set( 10, 10, 5 );
  // app.scene.add( cube );

  // app.axes = new THREE.AxesHelper( 40 );
  // app.scene.add( app.axes );

  // Land! "It is good to have land"

  app.landTexture = new THREE.TextureLoader().load('assets/textures/grasslight-big.jpg');
  app.landTexture.wrapS = app.landTexture.wrapT = THREE.RepeatWrapping;
  app.landTexture.repeat.set(50, 50);
  app.landTexture.anisotropy = 16; //???

  app.landGeometry = new THREE.PlaneGeometry(1000, 1000);
  app.landMaterial = new THREE.MeshLambertMaterial({
    // color: 0x4abb33,
    // color: 0xFF0000,
    map: app.landTexture
  });

  app.land = new THREE.Mesh(app.landGeometry, app.landMaterial);
  app.land.rotation.x = -0.5 * Math.PI;
  app.scene.add(app.land);


  // Add a sky(box)
  app.scene.background = new THREE.CubeTextureLoader().load([
    'assets/backgrounds/sky/xpos.png', 'assets/backgrounds/sky/xneg.png',
    'assets/backgrounds/sky/ypos.png', 'assets/backgrounds/sky/yneg.png',
    'assets/backgrounds/sky/zpos.png', 'assets/backgrounds/sky/zneg.png'
  ]);

  // Add stats panel
  app.stats = new Stats();
  document.getElementById('stats').appendChild(app.stats.domElement);

  // Start the main draw/animation loop
  // Now started after models load in character.js
  // requestAnimationFrame( app.animate );

  app.initCharacters();  // run the setup code in characters.js

  app.initScenery();

  app.initKeys();  // setup keyboard handlers

  app.initAudio();


}; // app.init()

app.lastAnimateTime = 0;

app.animate = (now) => {

  now *= 0.001; // convert ms to seconds, for the animation mixer
  const deltaTime = now - app.lastAnimateTime;
  app.lastAnimateTime = now;

  // Deal with held-down keys that trigger repeating actions
  // TODO: use a changeState instead? ('turning')
  app.keys.handleHeldKeys();

  if (app.controls.cameraPOV === 'player') {
    // keep looking in correct direction as the player moves
    const charPos = Player.one.object.position.clone();
    charPos.add(new THREE.Vector3(0, 10, 0));
    app.camera.lookAt(charPos);
  }

  Player.one.update(deltaTime);

  Character.each(c => c.update(deltaTime));

  app.stats.update();
  app.renderer.render(app.scene, app.camera); // actually draw the scene
  requestAnimationFrame(app.animate);

}; // app.animate()


window.addEventListener('load', app.init);

window.addEventListener('resize', () => {
  app.width = window.innerWidth;
  app.height = window.innerHeight;
  app.camera.aspect = app.width / app.height;
  app.camera.updateProjectionMatrix();
  app.renderer.setSize(app.width, app.height);
});

app.lib = {
  randArray(array) {
    const index = THREE.Math.randInt(0, array.length - 1);
    return array[index];
  },
};
