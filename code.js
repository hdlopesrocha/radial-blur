var timeDomainCanvas;	
var frequencyCanvas;	
var visualizationCanvas;	
var audioContext;
var audioSource;
var analyser;
var frequencyData; 						
var timeDomainData;
var gl;
var shaderProgram;
var indicesLength;
var amplitudeLocation;
var frequencyLocation;
var timeLocation;
var samplerLocation;
var samplerSizeLocation;

$(document).ready(function() {
	timeDomainCanvas = document.getElementById("timeDomain");
	frequencyCanvas = document.getElementById("frequency");
	visualizationCanvas = document.getElementById("visualization");

	$("#myFile").change(function (event){
		var file = $(this)[0].files[0];
		if (file) {
			var reader = new FileReader();
			reader.readAsArrayBuffer(file);
			reader.onload = function(e) {
				playSound(e.target.result);
			};
		}
	});

	var vertCode = $("#vertexShader").html();
	var fragCode = $("#fragmentShader").html();

	download( "libs/simplex.glsl", function( simplex ) {
		initWebGL(
			vertCode.replace('#include<libs/noise>',simplex), 
			fragCode.replace('#include<libs/noise>',simplex)
		);
       	initScene();
       	loop(0);
	});

});

function initScene() {
	// get shader locations
	positionLocation = gl.getAttribLocation(shaderProgram, "position");
	amplitudeLocation = gl.getUniformLocation(shaderProgram, "amplitudes");
	frequencyLocation = gl.getUniformLocation(shaderProgram, "frequencies");
	timeLocation = gl.getUniformLocation(shaderProgram, "time");
	samplerLocation = gl.getUniformLocation(shaderProgram, "sampler");
	samplerSizeLocation = gl.getUniformLocation(shaderProgram, "samplerSize");

	gl.useProgram(shaderProgram);

	// initialize shader variables
            
	// init vertices and indices
	var vertices = [];
	var indices = [];
	var length = 2;

	vertices.push(0);
	vertices.push(0);
	vertices.push(0);
	vertices.push(1);
	vertices.push(1);
	vertices.push(0);
	vertices.push(1);
	vertices.push(1);

	indices.push(0);
	indices.push(1);
	indices.push(2);
	indices.push(3);
	indices.push(2);
	indices.push(1);


	console.log(vertices);

	// create vertex buffer
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0) ;
    gl.enableVertexAttribArray(positionLocation);

 	// create index buffer
    var indexBuffer = gl.createBuffer ();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    indicesLength = indices.length;


    const img = new Image();
	img.onload = function() {
	  gl.activeTexture(gl.TEXTURE0);
	  const tex = gl.createTexture();
	  gl.bindTexture(gl.TEXTURE_2D, tex);
	  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
	  gl.generateMipmap(gl.TEXTURE_2D);
	  gl.uniform1i(samplerLocation, 0);
	  gl.uniform2f(samplerSizeLocation, img.width, img.height);
	};
	img.src = 'bg.png';
}

function initWebGL(vertexShaderCode, fragmentShaderCode) {
	gl = visualizationCanvas.getContext('experimental-webgl');

	// compile vertex shader
	var vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader, vertexShaderCode);
	gl.compileShader(vertShader);
	var err1 = gl.getShaderInfoLog(vertShader);
	if(err1) {
		alert(err1);
	}

	// compile fragment shader
	var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragmentShaderCode);
	gl.compileShader(fragShader);
  var err2 = gl.getShaderInfoLog(fragShader);
  if(err2) {
    alert(err2);
  }

	// link shaders
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertShader);
	gl.attachShader(shaderProgram, fragShader);
	gl.linkProgram(shaderProgram);
}

function playSound(data) {
	audioContext = new AudioContext();
	audioSource = audioContext.createBufferSource(); 
	analyser = audioContext.createAnalyser();
	analyser.fftSize = 256;
	audioSource.connect(analyser).connect(audioContext.destination); 
	
	audioContext.decodeAudioData(data, function(buffer) {
		audioSource.buffer = buffer;
		audioSource.start(0);
	});

	frequencyData = new Uint8Array(analyser.frequencyBinCount); 						
	timeDomainData = new Uint8Array(analyser.frequencyBinCount);

	$("#myFile").remove();
}

function draw(time) {
	if(frequencyData) {
		analyser.getByteFrequencyData(frequencyData);
		drawArray(time, frequencyCanvas, frequencyData);
	}
	if(timeDomainData){
		analyser.getByteTimeDomainData(timeDomainData);
		drawArray(time, timeDomainCanvas, timeDomainData);
	}
	drawVisualization(time);
}

function drawVisualization(time) {
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0);

	gl.viewport(0.0, 0.0, visualizationCanvas.width, visualizationCanvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.uniform1f(timeLocation ,time);


	if(frequencyData){
		gl.uniform1iv(frequencyLocation ,frequencyData);
	}
	if(timeDomainData){
		gl.uniform1iv(amplitudeLocation, timeDomainData);
	}
	gl.drawElements(gl.TRIANGLES, indicesLength, gl.UNSIGNED_SHORT, 0);

}

function distance(p1, p2) {
	return Math.sqrt(Math.pow(p1[0]-p2[0],2)+Math.pow(p1[1]-p2[1],2));
}

function drawArray(time, canvas, array) {
	var canvasContext = canvas.getContext("2d");
	canvasContext.clearRect(0, 0, canvas.width, canvas.height);  
	canvasContext.beginPath();
	canvasContext.lineWidth = 2;
	canvasContext.strokeStyle = '#fff';

	var first = true;
	for (var i=0; i < array.length; ++i) {
		var x = (i/array.length)*canvas.width;
		var y = (array[i]/255)*canvas.height;
		if (first) {
			first = false;
			canvasContext.moveTo(x, canvas.height-y);
		} else {
			canvasContext.lineTo(x, canvas.height-y);
		}
	}
	canvasContext.stroke();
}
