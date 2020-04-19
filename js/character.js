
app.initCharacters = () => {

  // Load the 3D models, and use them to create instances
  // of game characters

  console.log('Loading characters...');

  // Keep track of characters we have added to the game
  app.characters = {};

  app.models = {
    cow: { url: 'assets/models/characters/Cow.gltf' },
    pug: { url: 'assets/models/characters/Pug.gltf' },
    llama: { url: 'assets/models/characters/Llama.gltf' },
    zebra: { url: 'assets/models/characters/Zebra.gltf' },
    horse: { url: 'assets/models/characters/Horse.gltf' },
    pig: { url: 'assets/models/characters/Pig.gltf' },
    sheep: { url: 'assets/models/characters/Sheep.gltf' },
    skeleton: { url: 'assets/models/characters/Skeleton.gltf', process: () => { } },
  };

  // Lets us run a callback when all models are loaded
  const modelManager = new THREE.LoadingManager();
  const gltfLoader = new THREE.GLTFLoader(modelManager);

  // Load all models
  for (const name in app.models) {

    // model is e.g. app.models.cow
    const model = app.models[name];

    gltfLoader.load(model.url, gltf => {
      model.gltf = gltf; // reference to the model data
      model.name = name; // to tell them apart internally

      // Build a lookup object of animation clips
      // for each model, keyed by clip name
      model.animations = {};
      model.gltf.animations.forEach(clip => {
        // console.log(name, clip.name);
        const clipName = clip.name.toLowerCase();
        model.animations[clipName] = clip;

        // TODO: change the duration properties directly in the model .gltf file
        // to avoid this special-case code
        if (clipName === 'walk' || clipName === 'walkslow') {
          clip.duration /= 2; // half the length of this animation!
        }

      }); // each animation


      // Annoying special-case code for skeleton
      // TODO: define special-case processing functions
      // inside the object for each model, i.e.
      // app.models.skeleton.process = () => {}
      if (name === 'skeleton') {
        gltf.scene.traverse(child => {
          if (child.type === 'SkinnedMesh') {
            child.material.metalness = 0; // too metal
            child.material.color.setRGB(0.7, 0.7, 0.5);
          }
        });
      } // skeleton

      // app.scene.add( model.gltf.scene );

      const clipNames = Object.keys(model.animations);
      console.log(`%c${name}`, 'font-size: 10pt; font-weight: bold; color: green', clipNames.join(', '));

    }); // gltf onload callback

  } // for each model

  modelManager.onLoad = () => {
    console.log('All models loaded!');

    new Player('player', app.models.cow, { position: new THREE.Vector3(0, 0, 0) });
    window.p = Player.one; // just for debugging!

    // Create some characters
    for (let i = 0; i < 20; i++) {

      // Find a random model to use
      const names = Object.keys(app.models);
      const randomIndex = Math.floor(Math.random() * names.length);
      const modelName = names[randomIndex];
      console.log(names, modelName);
      new Character(`${modelName}${i}`, app.models[modelName], {
        position: new THREE.Vector3(
          THREE.Math.randFloatSpread(100),
          0, // THREE.Math.randFloatSpread( 100 ),
          THREE.Math.randFloatSpread(100),
        ),
        // rotation: new Vector3()
      });

    } // add random characters


    // We should only start the animation/draw loop
    // after the models are loaded
    requestAnimationFrame(app.animate);

  }; // modelManager.onLoad
};  // app.initCharacters();


class Character {

  static all = {}; // keep track of all characters objs created

  static each = (callback) => {
    let i = 0;
    for (const key in Character.all) {
      const char = Character.all[key];
      callback(char, key, i);
      i++;
    }
  }

  defaultOptions = {
    position: new THREE.Vector3(), //{ x: 0, y: 0, z: 0 },
    rotation: new THREE.Vector3(), //{ x: 0, y: 0, z: 0 },
  };

  defaultState = {
    action: '',
    lastAction: '',
    // position: don't define here, it's in this.object.position
    velocity: new THREE.Vector3(),
    speed: 0
  };

  constructor(name, model, options = this.defaultOptions) {
    console.log('Character()', name, model, options);

    this.name = name;
    this.modelName = model.name; // ???
    this.opts = { ...this.defaultOptions, ...options };  // merge defaults with passed opts
    this.state = { ...this.defaultState }; // TODO: gotcha? Nested objects not cloned, copied by ref

    this.animation = {
      allActions: {},
      action: null,
      mixer: null
    };

    // Make a clone of the loaded model data
    this.modelClone = THREE.SkeletonUtils.clone(model.gltf.scene);
    this.object = new THREE.Object3D();
    // Why do we have to do this? It's not very clear, but
    // some object-related stuff (like collision detection
    // and positioning) doesn't work if you don't do it
    this.object.position.set(this.opts.position.x, this.opts.position.y, this.opts.position.z);
    this.object.add(this.modelClone);
    app.scene.add(this.object); // add to the game scene immediately

    // Create a bounding box object for each character
    this.box = new THREE.BoxHelper(this.modelClone, 0xFFFF00);
    this.box.name = 'boundingBox';
    this.box.geometry.computeBoundingBox(); // just once, so we have access to this.box.boundingBox
    this.box.visible = app.controls.debug;
    this.object.add(this.box);

    if (this.constructor === Character) {
      // Only run this code for Characters, not for the Player
      this.object.lookAt(Player.one.object.position);
    }

    this.constructor.all[name] = this;  // add new character to our list of characters


    // pass in original model
    this.initialiseAnimations(model);

    this.changeState('idle');

  } // constructor()


  initialiseAnimations(model) {

    const defaultAnimation = 'idle';

    this.animation.mixer = new THREE.AnimationMixer(this.modelClone);

    this.animation.mixer.addEventListener('finished', this.handleAnimationFinished);

    this.animation.mixer.addEventListener('finished', this.handleAnimationFinished);

    // Init all clips for this model's list of animations
    // (clips are controlled by the mixer, allow start/stop/xfade etc)
    for (const animName in model.animations) {
      const action = this.animation.mixer.clipAction(model.animations[animName]);
      action.name = animName; // for us to use later (to find out which animation finished)
      this.animation.allActions[animName] = action;
    } // for each animation

    // Start the default animation playing
    this.animation.action = this.animation.allActions[defaultAnimation];
    // this.animation.action.play();

  } // initialiseAnimations()


  changeAnimation(name) {

    this.animation.action.crossFadeTo(this.animation.allActions[name], 1, true);
    this.animation.action = this.animation.allActions[name];  // TODO: is this a problem???
    this.animation.name = name;
    this.animation.action.enabled = true;  // Gets disabled after last crossfade
    this.animation.action.timeScale = 1;
    this.animation.action.reset().play();

    if (name === 'death') {
      this.animation.action.setLoop(THREE.LoopOnce);
      this.animation.action.clampWhenFinished = true;
    }

  } // changeAnimation()

  handleAnimationFinished = (event) => {
    if (event.action.name === 'death') {
      this.object.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone(); // so all horses don't die at once
          child.material.wireframe = true;
        }
      })
    }
  }

  // This is the callback that runs whenever an animation finishes
  // We need to use this arrow function syntax to get the correct value of 'this'
  // inside this method, since it's a callback for the 'finished' event
  handleAnimationFinished = (event) => {

    console.log('ANIMATION FINISHED', event);

    switch (event.action.name) {
      case 'death':
        // Turn animal into a wireframe ghost
        // this.object.wireframe = true;
        console.log('this', this);
        this.object.traverse(child => {
          if (child.isMesh) {
            // Need to clone the material first, so we only wireframe THIS dead animal, not all
            // 'horses' or 'cows' in the scene (which are sharing material references by default)
            child.material = child.material.clone();
            child.material.wireframe = true;  // Turn all meshes (for this dead animal) into wireframes!
          }
        });
        this.changeState('walk');
        break;
    } // switch event.action.name


  } // handleAnimationFinished()


  // This is called by app.animate, i.e. every re-render (60 times/sec)
  update(deltaTime) {

    // this.object.position.x += this.state.velocity.x;
    // this.object.position.y += this.state.velocity.y;
    // this.object.position.z += this.state.velocity.z;
    // this.object.position.add( this.state.velocity );

    // Which direction are we currently facing in?
    const direction = new THREE.Vector3();
    this.object.getWorldDirection(direction);

    // Walk in that direction at a certain speed
    this.object.position.addScaledVector(direction, this.state.speed);

    this.animation.mixer.update(deltaTime); // update the playing animation

  } // update()


  changeState(state, opts = {}) {
    if (state === this.state.action) {
      return; // don't do anything if we're already in this state
    }

    this.state.lastAction = this.state.action;
    this.state.action = state;

    app.controls.playerState = state; // for debugging

    switch (state) {
      case 'walk':
        // this.state.velocity = new THREE.Vector3( 0, 0, 0.1 );
        this.state.speed = app.controls.walkSpeed;
        break;
      case 'idle':
        // this.state.velocity = new THREE.Vector3( 0, 0, 0.1 );
        this.state.speed = 0;
        break;

    } // switch( state )

    this.changeAnimation(opts.action || state);

  } // changeState()


} // class Character

class Player extends Character {
  static all = {};

  static one = null;
  static updateCount = 0;

  // override the character constructor with custom version
  constructor(...args) {
    super(...args); //call the constructor of the superclass
    if (!Player.one) {
      Player.one = this;
    }
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (Player.updateCount > 0) {
      Character.each(char => {
        if (this.collisionDetect(char)) {
          char.box.material.color.set(0xFF0000);
          char.changeState('death');
        }
      })
    }
    Player.updateCount++;

  }

  collisionDetect(other) {
    // not accurate enough! need to do bounding box intersection
    // return this.object.position.distanceToSquared(other.object.position) < 20;

    const playerBox = this.box.geometry.boundingBox.clone();
    const otherBox = other.box.geometry.boundingBox.clone();

    playerBox.applyMatrix4(this.object.matrixWorld);
    otherBox.applyMatrix4(other.object.matrixWorld);
    return playerBox.intersectsBox(otherBox);
  }
}
