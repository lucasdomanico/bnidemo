import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js'
import { XRHandModelFactory }       from 'three/addons/webxr/XRHandModelFactory.js';


let vr = (xr, rig) => {
  				let controller1 = xr.getController( 0 );
				rig.add( controller1 );

				let controller2 = xr.getController( 1 );
				rig.add( controller2 );

				const controllerModelFactory = new XRControllerModelFactory();
				const handModelFactory = new XRHandModelFactory();

				// Hand 1
				let controllerGrip1 = xr.getControllerGrip( 0 );
				controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
				rig.add( controllerGrip1 );

				let hand1 = xr.getHand( 0 );
				// hand1.addEventListener( 'pinchstart', onPinchStartLeft );
				// hand1.addEventListener( 'pinchend', () => {

				// 	scaling.active = false;

				// } );
				hand1.add( handModelFactory.createHandModel( hand1 ) );

				rig.add( hand1 );

				// Hand 2
				let controllerGrip2 = xr.getControllerGrip( 1 );
				controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
				rig.add( controllerGrip2 );

				let hand2 = xr.getHand( 1 );
				// hand2.addEventListener( 'pinchstart', onPinchStartRight );
				// hand2.addEventListener( 'pinchend', onPinchEndRight );
				hand2.add( handModelFactory.createHandModel( hand2 ) );
				rig.add( hand2 );
  alert('ok')
				//
}

export class CameraInputManager {
  constructor(camera, renderer, rig, options = {}) {
    this.camera = camera;
    this.renderer = renderer;
    this.rig = rig;
    this.mode = 'auto';

    this.deviceQuat = new THREE.Quaternion();
    this.worldTransform = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.PI / 2
    ); // apunta -Z, mobile apunta arriba

    this.filteredQuat = new THREE.Quaternion();
    this.currentQuat = new THREE.Quaternion();
    this.history = [];

    this.maxHistory = 10;
    this.smoothFactor = options.smoothFactor ?? 0.25;
    this.initialized = false;

    this.keys = {};
    this.rotationY = 0;
    this.velocity = 0.1;
    // this.camera.position.y = 1.6;
  }

  async init() {


    const isTouch = 'ontouchstart' in window;

  let supported = await navigator.xr?.isSessionSupported('immersive-vr')
    if (supported) {
        this.mode = 'vr';
        vr(this.renderer.xr, this.rig);
        console.log('Modo VR activado');
      } else if (isTouch) {
      this.mode = 'gyro';
      this.enableGyro();
      console.log('Modo GYRO activado');
    } else {
      this.mode = 'fps';
      this.enableKeyboard();
      console.log('Modo FPS activado');
    }
  }

  enableGyro() {
    const handleOrientation = (event) => {
      const alpha = THREE.MathUtils.degToRad(event.alpha || 0);
      const beta  = THREE.MathUtils.degToRad(event.beta  || 0);
      const gamma = THREE.MathUtils.degToRad(event.gamma || 0);

      const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
      this.deviceQuat.setFromEuler(euler);

      const worldQuat = this.worldTransform.clone().multiply(this.deviceQuat);

      // Quitar solo roll (Z) de forma quirúrgica
      const qEuler = new THREE.Euler().setFromQuaternion(worldQuat, 'YXZ');
      qEuler.z = 0; // quitar inclinación lateral
      const cleanQuat = new THREE.Quaternion().setFromEuler(qEuler);

      // Guardar en historial
      this.history.push(cleanQuat.clone());
      if (this.history.length > this.maxHistory) this.history.shift();

      this.filteredQuat.copy(this.history[0]);
      for (let i = 1; i < this.history.length; i++) {
        this.filteredQuat.slerp(this.history[i], 1 / (i + 1));
      }

      if (!this.initialized) {
        this.currentQuat.copy(this.filteredQuat);
        this.camera.quaternion.copy(this.filteredQuat);
        this.initialized = true;
      }
    };

    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then((response) => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        } else {
          alert('Permiso denegado para sensores de orientación');
        }
      });
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }

  enableKeyboard() {
    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup',   (e) => this.keys[e.key.toLowerCase()] = false);
  }

  update() {
    if (this.mode === 'gyro' && this.initialized) {
      this.currentQuat.slerp(this.filteredQuat, this.smoothFactor);
      this.camera.quaternion.copy(this.currentQuat);
    } else if (this.mode === 'fps') {
      // if (this.keys['a']) this.rotationY += 0.03;
      // if (this.keys['d']) this.rotationY -= 0.03;

      // const forward = new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY));

      // if (this.keys['w']) this.camera.position.add(forward.clone().multiplyScalar(this.velocity));
      // if (this.keys['s']) this.camera.position.add(forward.clone().multiplyScalar(-this.velocity));

      // this.camera.rotation.set(0, this.rotationY, 0);
    }
  }
}
