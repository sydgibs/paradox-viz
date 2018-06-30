if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var SCREEN_WIDTH = window.innerWidth,
    SCREEN_HEIGHT = window.innerHeight,

    r = 450,

    mouseX = 0, mouseY = 0,

    windowHalfX = window.innerWidth / 2,
    windowHalfY = window.innerHeight / 2,

    /* camera click and drag rotation */
    dragging,
    initial_phi, initial_theta,
    initial_mouseX, initial_mouseY,
    phi = 0, theta = 0,

    camera_radius = 100,

    camera, scene, renderer;


init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera( 80, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 3000 );
    camera.position.z = 100;

    scene = new THREE.Scene();

    var i, line, vertex1, vertex2, material;

    var geometry = new THREE.SphereGeometry( 5, 32, 32 );

    red_material = new THREE.MeshBasicMaterial( { color: 0xf32b11 } );
    blue_material = new THREE.MeshBasicMaterial( { color: 0x3540f1 } );
    green_material = new THREE.MeshBasicMaterial( { color: 0x10e265 } );
    cyan_material = new THREE.MeshBasicMaterial( { color: 0x10f2e2 } );

    red_mesh = new THREE.Mesh( geometry, red_material );
    blue_mesh = new THREE.Mesh( geometry, blue_material );
    green_mesh = new THREE.Mesh( geometry, green_material );
    cyan_mesh = new THREE.Mesh( geometry, cyan_material );
    blue_mesh.scale.x = blue_mesh.scale.y = blue_mesh.scale.z = 0.5;
    green_mesh.scale.x = green_mesh.scale.y = green_mesh.scale.z = 0.5;
    cyan_mesh.scale.x = cyan_mesh.scale.y = cyan_mesh.scale.z = 0.5;

    blue_mesh.position.x = 10;
    green_mesh.position.y = 10;
    cyan_mesh.position.z = 10;
    //mesh.userData.originalScale = p[ 0 ];
    //mesh.rotation.y = Math.random() * Math.PI;
    //mesh.updateMatrix();
    scene.add( red_mesh );
    scene.add( blue_mesh );
    scene.add( green_mesh );
    scene.add( cyan_mesh );

    scene.add( meshLineBetween( new THREE.Vector3(15, 15, 15), new THREE.Vector3(15, -15, 15) ) );
    scene.add( meshLineBetween( new THREE.Vector3(10, 0, 0), new THREE.Vector3(8, 0, -6) ) );
    scene.add( meshLineBetween( new THREE.Vector3(-10, 0, 0), new THREE.Vector3(0, 7, 7) ) );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    document.body.appendChild( renderer.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    document.addEventListener( 'mouseup', onDocumentMouseUp, false );
    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    document.addEventListener( 'touchmove', onDocumentTouchMove, false );

    window.addEventListener( 'resize', onWindowResize, false );
}

function meshLineBetween(start_point, end_point) {
    grey_material = new THREE.MeshBasicMaterial( { color: 0xbbbbbb } );
    grey_material.side = THREE.DoubleSide;
    var radius = start_point.length();
    var start_dir = start_point.normalize();
    var end_dir = end_point.normalize();
    geometry = createArcStripGeometry(start_dir, end_dir, 100 /* segments */, radius, 0.5 /* width */);
    magic_line_mesh = new THREE.Mesh( geometry, grey_material );
    magic_line_mesh.setDrawMode( THREE.TriangleStripDrawMode );
    return magic_line_mesh;
}

/* start_dir and end_dir must be normalized. radius is the radius of the sphere the line lies on */
function createArcStripGeometry(start_dir, end_dir, num_segments, radius, line_width) {

    var geometry = new THREE.BufferGeometry();
    var vertices = [];
    var indices = [];

    var cos_angle = start_dir.dot(end_dir);
    var omega = Math.acos(cos_angle);
    var start_point = start_dir.clone().multiplyScalar(radius);
    var end_point = end_dir.clone().multiplyScalar(radius);
    var perpendicular_width = start_dir.clone().cross(end_dir).normalize().multiplyScalar(line_width);
    for ( var facing = 0; facing < 1 /* for now, only do one side */; facing++ ) {
	/* There are num_segments + 1 vertices on the curved line. */
	for ( var i = 0; i <= num_segments; i++ ) {
	    var t = i/num_segments;
	    /* slerp */
	    var c0 = Math.sin((1-t)*omega) / Math.sin(omega);
	    var c1 = Math.sin(t*omega) / Math.sin(omega);
	    var point = start_point.clone().multiplyScalar(c0).add(end_point.clone().multiplyScalar(c1));
	    var point0 = point.clone().add(perpendicular_width);
	    // this last clone isn't necessary but keeps the code parallel with the point0 code.
	    var point1 = point.clone().sub(perpendicular_width);
	    vertices.push(point0.x, point0.y, point0.z);
	    vertices.push(point1.x, point1.y, point1.z);
	}
	//Now, if facing is 1, do the triangle strip again but opposite facing.
	perpendicular_width.multiplyScalar(-1);
    }


    geometry.addAttribute('position', new THREE.Float32BufferAttribute( vertices, 3 ) );

    return geometry;
}

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function onDocumentMouseMove( event ) {

    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;
    if (dragging) {
	theta = initial_theta + 0.01 * (mouseX - initial_mouseX);
	phi = initial_phi + 0.01 * (mouseY - initial_mouseY);
	if (phi > Math.PI / 2) {
	    phi = Math.PI / 2;
	}
	if (phi < -(Math.PI / 2)) {
	    phi = -(Math.PI / 2);
	}
    }
    document.getElementById("debug").innerHTML = ("Phi/pi: " + (phi/Math.PI) + " Theta/pi: " + (theta/Math.PI));
}

function onDocumentMouseDown( event ) {

    initial_phi = phi;
    initial_theta = theta;
    initial_mouseX = mouseX;
    initial_mouseY = mouseY;
    dragging = true;

}

function onDocumentMouseUp( event ) {

    dragging = false;

}

// TODO make touches work the same as mouse drags
// or use https://github.com/mrdoob/three.js/blob/master/examples/js/controls/OrbitControls.js
// or trackball controls.
function onDocumentTouchStart( event ) {

    if ( event.touches.length > 1 ) {

	event.preventDefault();

	mouseX = event.touches[ 0 ].pageX - windowHalfX;
	mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}

function onDocumentTouchMove( event ) {

    if ( event.touches.length == 1 ) {

	event.preventDefault();

	mouseX = event.touches[ 0 ].pageX - windowHalfX;
	mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}

function animate() {

    requestAnimationFrame( animate );

    render();

}

function render() {

    r = camera_radius;
    tr = r * Math.cos(phi);
    camera.position.x = tr * Math.cos(theta);
    camera.position.y = r * Math.sin(phi);
    camera.position.z = tr * Math.sin(theta);
    camera.lookAt( scene.position );

    renderer.render( scene, camera );
}
