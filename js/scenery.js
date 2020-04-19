
app.initScenery = () => {


  app.scenery = {};

  const OBJFile = 'assets/models/scenery/trees.obj';
  const MTLFile = 'assets/models/scenery/trees.mtl';
  const PNGFilePrefix = 'assets/models/scenery/';

  app.sceneryCount = 20;

  app.addScenery = name => {
    if (!(name in app.scenery.models)) {
      return console.error('Scenery model not defined:', name);
    }
    const itemClone = app.scenery.models[name].clone();
    const spread = 100;
    itemClone.position.set(
      THREE.MathUtils.randFloatSpread(spread),
      0, // THREE.MathUtils.randFloatSpread(spread),
      THREE.MathUtils.randFloatSpread(spread)
    );
    itemClone.scale.set(10, 10, 10);
    app.scene.add(itemClone);
  };


  const sceneryManager = new THREE.LoadingManager();
  sceneryManager.onLoad = () => {
    const names = Object.keys(app.scenery.models);
    for (let i = 0; i < app.sceneryCount; i++) {
      app.addScenery(app.lib.randArray(names));
    }
  };

  var textureLoader = new THREE.TextureLoader();

  new THREE.MTLLoader()
    .load(MTLFile, function (materials) {
      materials.preload();
      new THREE.OBJLoader(sceneryManager)
        .setMaterials(materials)
        .load(OBJFile, function (object) {
          object.position.set(0, 0, 0);
          app.scenery = object;
          app.scenery.models = {}; // naughty
          object.traverse(o => {
            if (o.isMesh) {
              const name = o.material.name;
              // Now have to manually load each texture for each model and manually
              // attach it to the material and it's so fucking barbaric
              const texture = textureLoader.load(`${PNGFilePrefix}${name}.png`);
              o.position.set(0, 0, 0);
              o.material.map = texture;
              o.material.shininess = 0; // !!!!
              app.scenery.models[o.material.name] = o; // add to lookup object:
            }
          });
        }); // load OBJ
    }); // load MTL

}; // app.initScenery()
