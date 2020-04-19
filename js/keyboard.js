
// Keyboard event handlers and state management goes here

app.initKeys = () => {
  console.log('Initialising keys...');

  app.keys = {
    trackedKeys: {
      ArrowUp: true,
      ArrowDown: true,
      ArrowLeft: true,
      ArrowRight: true,
      c: true, // toggle camera pov from world to player
    },

    state: {},  // which keys are currently held?
  };

  app.keys.handleKey = (ev, pressed) => {

    const player = Player.one;

    switch (ev.key) {

      case 'ArrowUp':
        if (pressed) {
          player.changeState('walk');
        } else {
          player.changeState('idle');
        }
        break;

      case 'ArrowDown':
        if (pressed) {
          console.log('DOWN pressed!');
          // TODO: work out in changeState how to pass on the correct
          // options object to the call the changeAnimation
          player.changeState('walk', { speedScale: -1 });
        } else {
          console.log('DOWN released!');
        }
        break;

      case 'ArrowLeft':
      case 'ArrowRight':
        // prevent default case, as actually handled in `handleHeldKeys`
        console.log(`${ev.key} ${pressed ? 'pressed' : 'released'}`);
        break;

      case 'c':
        if (pressed) {
          console.log('c pressed');
          if (app.controls.cameraPOV === 'world') {
            app.controls.cameraPOV = 'player';
            app.cameraControls.saveState(); // remember the world pov angle and zoom we had before
            player.object.add(app.camera); // camera follows palyer
            app.camera.position.set(0, 10, -20);
          } else {
            app.controls.cameraPOV = 'world'
            player.object.remove(app.camera);
            app.cameraControls.reset(); // back to where we ledft with savecStae()
          }
          console.log('Camera POV', app.controls.cameraPOV);
        }
        break;
      default:
        console.log('Key not handled: ', ev.key);
        break;
    }
  };


  // Deal with the keys that we need to run code for
  // repeatedly, i.e. they keep triggering actions for
  // as long as they are held (not just when they're first
  // pressed or released)
  app.keys.handleHeldKeys = () => {

    const turnIncrement = 0.03;
    const player = Player.one;

    if (app.keys.state.ArrowLeft) {
      player.object.rotateY(turnIncrement);
    } else if (app.keys.state.ArrowRight) {
      player.object.rotateY(-turnIncrement);
    }

  } // handleHeldKeys()


  // This event fires repeatedly, for as long as the key is held down
  // The rate of repeat depends on your system's key repeat rate setting
  document.addEventListener('keydown', ev => {

    if (!(ev.key in app.keys.trackedKeys)) {
      return; // early return for keys we're not supposed to track
    }

    ev.stopPropagation(); // don't send keys like arrow keys to camera controls

    if (app.keys.state[ev.key]) {
      return; // ignore keypress events which are not the first press event (i.e. held)
    }

    app.keys.state[ev.key] = true;
    app.keys.handleKey(ev, true); // handle first press event for this key
  });


  document.addEventListener('keyup', ev => {
    ev.stopPropagation();
    app.keys.state[ev.key] = false;  // no longer held down!
    app.keys.handleKey(ev, false);  // call handleKey again, but pressed=false
  });


}; // app.initKeys();
