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

    /* cayley state */
    sphere_radius = 10,
    cayley_orientation,
    paint_point = new THREE.Vector3( sphere_radius * 1.01, 0, 0 ),
    paint_up_axis = new THREE.Vector3( 0, 1, 0 ),
    paint_right_axis = new THREE.Vector3( 0, 0, 1 ),
    paint_angle = Math.acos(1/3),
    cursor_pivot = new THREE.Object3D(),

    cayley_path = [],

    camera_radius = 50,

    camera, scene, renderer;

init();
animate();

function init() {
    
    cayley_orientation = new THREE.Quaternion();

    camera = new THREE.PerspectiveCamera( 80, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 3000 );
    camera.position.z = 100;

    scene = new THREE.Scene();

    var i, line, vertex1, vertex2, material;

    var geometry = new THREE.SphereGeometry( 1, 32, 32 );
    var cursor_geometry = new THREE.CircleGeometry(1, 32);

    sphere_material = new THREE.MeshBasicMaterial( { color: 0x60a3bc } );
    cursor_material = new THREE.MeshBasicMaterial( { color: 0xd63031 } );

    sphere_mesh = new THREE.Mesh( geometry, sphere_material );

    sphere_mesh.position.x = 0;
    sphere_mesh.scale.x = sphere_mesh.scale.y = sphere_mesh.scale.z = sphere_radius;
    scene.add( sphere_mesh );

    cursor_mesh = new THREE.Mesh( cursor_geometry, cursor_material );
    cursor_mesh.position.x = paint_point.x;
    cursor_mesh.position.y = paint_point.y;
    cursor_mesh.position.z = paint_point.z;
    cursor_mesh.scale.x = cursor_mesh.scale.y = cursor_mesh.scale.z = 0.75;
    cursor_mesh.rotation.y = Math.PI / 2;
    cursor_pivot.add(cursor_mesh);
    scene.add( cursor_pivot );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    renderer.setClearColor(0x171717, 1.0);
    document.body.appendChild( renderer.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    document.addEventListener( 'mouseup', onDocumentMouseUp, false );
    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    document.addEventListener( 'touchmove', onDocumentTouchMove, false );
    document.addEventListener( 'keydown', onDocumentKeyDown, false );

    window.addEventListener( 'resize', onWindowResize, false );
}

function meshLineMultiply(start_point, end_point, axis /* not needed */) {
    grey_material = new THREE.MeshBasicMaterial( { color: 0x218c74 } );
    grey_material.side = THREE.DoubleSide;
    var radius = start_point.length();
    var start_dir = start_point.normalize();
    var end_dir = end_point.normalize();
    geometry = createArcStripGeometry(start_dir, end_dir, 100 /* segments */, radius, 0.3 /* width */);
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

function onDocumentKeyDown( event ) {
    if ( event.key === "ArrowLeft" && cayley_path[0] !== "R") {
	var quaternion = new THREE.Quaternion();
	cayleyAdvance( quaternion.setFromAxisAngle( paint_up_axis, -paint_angle ) );
	logStep("L");
    } else if ( event.key === "ArrowRight" && cayley_path[0] !== "L") {
	var quaternion = new THREE.Quaternion();
	cayleyAdvance( quaternion.setFromAxisAngle( paint_up_axis, paint_angle ) );
	logStep("R");
    } else if ( event.key === "ArrowUp" && cayley_path[0] !== "D") {
	var quaternion = new THREE.Quaternion();
	cayleyAdvance( quaternion.setFromAxisAngle( paint_right_axis, paint_angle ) );
	logStep("U");
    } else if ( event.key === "ArrowDown" && cayley_path[0] !== "U") {
	var quaternion = new THREE.Quaternion();
	cayleyAdvance( quaternion.setFromAxisAngle( paint_right_axis, -paint_angle ) );
	logStep("D");
    }
}

// rotate the sphere and add a new line
function cayleyAdvance( quat ) {
    var cur = paint_point.clone().applyQuaternion( cayley_orientation );
    cayley_orientation.premultiply( quat );
    var next = paint_point.clone().applyQuaternion( cayley_orientation );
    scene.add( meshLinePreMultiply( cur, next, new THREE.Vector3(quat.x, quat.y, quat.z) ) );
    refreshCursorTransformation();
}

function logStep( step ) {
    cayley_path.unshift(step);
    document.getElementById("path-display").innerHTML = "Cayley Path: <br> &lt;" + cayley_path.join(", ") + "&gt;";
    document.getElementById("function-display").innerHTML = "Cayley Function: <br>" + cayley_path.map(x => x.toLowerCase() + "(").join("") + "c" + ")".repeat(cayley_path.length);

}

function refreshCursorTransformation() {
    cursor_pivot.setRotationFromQuaternion( cayley_orientation );
}

function meshLinePreMultiply(start_point, end_point, axis) {
    grey_material = new THREE.MeshBasicMaterial( { color: 0x218c74 } );
    grey_material.side = THREE.DoubleSide;
    var radius = start_point.length();
    var start_dir = start_point.normalize();
    var end_dir = end_point.normalize();
    axis.normalize();
    geometry = createAxisArcStripGeometry(start_dir, end_dir, axis, 100 /* segments */, radius, 0.3 /* width */);
    magic_line_mesh = new THREE.Mesh( geometry, grey_material );
    magic_line_mesh.setDrawMode( THREE.TriangleStripDrawMode );
    return magic_line_mesh;
}

/* start_dir, end_dir, and axis must be normalized. radius is the radius of the sphere the line lies on */
function createAxisArcStripGeometry(start_dir, end_dir, axis, num_segments, radius, line_width) {

    var geometry = new THREE.BufferGeometry();
    var vertices = [];
    var indices = [];

    var perpendicular_width = start_dir.clone().cross(end_dir).normalize().multiplyScalar(line_width);

    start_dir.multiplyScalar(radius);
    end_dir.multiplyScalar(radius);
    var axis_proj = axis.clone().multiplyScalar(axis.dot(start_dir));
    start_dir = start_dir.sub(axis_proj);
    end_dir = end_dir.sub(axis_proj);
    radius = start_dir.length();
    start_dir.normalize();
    end_dir.normalize();

    var cos_angle = start_dir.dot(end_dir);
    var omega = Math.acos(cos_angle);
    var start_point = start_dir.clone().multiplyScalar(radius);
    var end_point = end_dir.clone().multiplyScalar(radius);
    for ( var facing = 0; facing < 1 /* for now, only do one side */; facing++ ) {
	/* There are num_segments + 1 vertices on the curved line. */
	for ( var i = 0; i <= num_segments; i++ ) {
	    var t = i/num_segments;
	    /* slerp */
	    var c0 = Math.sin((1-t)*omega) / Math.sin(omega);
	    var c1 = Math.sin(t*omega) / Math.sin(omega);
	    var point = start_point.clone().multiplyScalar(c0).add(end_point.clone().multiplyScalar(c1)).add(axis_proj);
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

// TODO: make touches work the same as mouse drags
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
