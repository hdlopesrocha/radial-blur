function scale(num, in_min, in_max, out_min, out_max) {
  var v = (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	return v > out_max ? out_max : v < out_min ? out_min : v;

}

  function myNoise3d(x,y,z) {
    let v = noise.simplex3(x, y, z);
    return 0.5*(v+1);
  }

  function myNoise3dx(x, y, z, it) {
    let pe = 0.5;
    let re = 0;
    for(let i=0 ; i < it; ++i) {
      re += pe*myNoise3d(x,y,z);
      pe*= 0.5;
    }
    return re;
  }


noise.seed(Math.random());

function drawPerlinToCanvas(context, canvas, time) {
	var imgData = context.createImageData(canvas.width, canvas.height);
	var data = imgData.data;

	var cp = Math.min(canvas.width, canvas.height)/8;

	for (var x = 0; x < canvas.width; x++) {
	  for (var y = 0; y < canvas.height; y++) {


	    var value = myNoise3dx(x/cp, y/cp, time/128,6);
			var contrast = 0.1;

			if(value<contrast){
				value = contrast;				
			} 
			value = (value-contrast)/(1-contrast);

			var index = (x*canvas.width+y)*4;
			data[index+0] = data[index+1] = data[index+2] = parseInt(value*255);
			data[index+3] = 255;
		}
	}
	context.putImageData( imgData, 0, 0 );     
}

function getPoint(cx,cy,cr,perc, time,dataArray,freqArray,isPlaying) {
	var i0 = parseInt(scale(perc,0,1,0, freqArray.length-1));
	var i1 = parseInt(scale(1-perc,0,1,0, freqArray.length-1));

	var f0 = freqArray[i0];
	var f1 = freqArray[i1];
	var f = (f0+f1)*0.2;
	if (isNaN(f)) {
		f = 0.0;
	}


	var sx = Math.sin(perc*2*Math.PI);
	var sy = Math.cos(perc*2*Math.PI);
	var sr = myNoise3dx(sx, sy, (time+f/256),6);


	return {
		x: cx + (4*sr*cr)*sx,			
		y: cy + (4*sr*cr)*sy
	};
}

function drawSpherePerlinToCanvas(context, canvas, time,dataArray,freqArray,isPlaying) {
		var colorR = parseInt(myNoise3dx(time,0,0,6)*255);
		var colorG = parseInt(myNoise3dx(0,time,0,6)*255);
		var colorB = parseInt(myNoise3dx(0,0,time,6)*255);		

		context.strokeStyle = 'rgba('+colorR+','+ colorG +','+colorB+',0.1)';
		context.beginPath();

		var cx = canvas.width/2; 
		var cy = canvas.height/2;
		var cr = Math.min(cx, cy)*0.25;

		var init = true;
		for(var perc = 0 ; perc < 1.000001 ; perc += 0.005) {
			var point = getPoint(cx,cy,cr, perc, time, dataArray,freqArray,isPlaying);	
			init ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y);
			init = false;		
		}

		context.stroke();
}

var time = 0;
var lastRender = 0;

function update(progress){
	time += progress;
}

function loop(timestamp) {
	var progress = timestamp - lastRender;

	update(progress);
	draw(time*0.001);

	lastRender = timestamp;
	window.requestAnimationFrame(loop);
}

window.AudioContext = window.AudioContext||window.webkitAudioContext;


function download(url, callback) {
  $.ajax({
    url: url,
    success: callback,
    dataType: "text"
  });
}

function createProjectionMatrix(angle, a, zMin, zMax) {
  var ang = Math.tan((angle*.5)*Math.PI/180);//angle*.5
  return [
     0.5/ang, 0 , 0, 0,
     0, 0.5*a/ang, 0, 0,
     0, 0, -(zMax+zMin)/(zMax-zMin), -1,
     0, 0, (-2*zMax*zMin)/(zMax-zMin), 0 
  ];
}

function createIdentityMatrix() {
	return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
}

function createLookAtMatrix(eye, center, up) {
	return mat4.lookAt(eye, center, up, null);
}
