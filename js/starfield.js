/**
* @file starfield.css
* @author Ng Guoyou
*/

var canvas;
var viewportWidth = $(window).width();
var viewportHeight = $(window).height();
origin = [];
origin["x"] = viewportWidth / 2;
origin["y"] = viewportHeight / 2;

// RIFFWAVE.js
var audio = new Audio();
var wave = new RIFFWAVE();
var data = [];
audio.volume = 0.4;
wave.header.sampleRate = 8000; // set sample rate to 8KHz
wave.header.numChannels = 2; // two channels (stereo)

// Starfield control parameters
var rotation = false;
var starcount = 25;
var speedFactor = 1;
var audify = false;
var sampleLength = 500;
var colorise = false;

// Mouse variables
var mouseDown = false;
var usingTouch = false;
var mouseX;
var mouseY;

$(document).ready(function() {
    canvas = new Canvas();
    canvas.init();
    canvas.createStarfield(starcount);
    canvas.draw();
    canvas.colorise();

    /**
     * Fades the settings box out on load.
     */
    $("#starcontrol").fadeTo(10000, 0);

    /**
     * Fades the settings box in on mouse hover, and fades it out on mouseout.
     */
    $("#starcontrol").hover(function() {
        $(this).stop().fadeTo(250, 1);
        $("#starcontrol-glow").css("box-shadow", "none");
    }, function() {
        $(this).fadeTo(500, 0);
    });

    /**
     * Mouse controls.
     */
    $('#starfield').mousedown(function(e) {
        e.originalEvent.preventDefault(); // Hack to bypass Chrome's cursor changing to text-select on drag
        $("#starfield").css("cursor", "move");
        mouseX = e.pageX;
        mouseY = e.pageY;
        mouseDown = true;
    });

    $(document).mouseup(function() {
        $("#starfield").css("cursor", "auto");
        mouseDown = false;
    });

    $(document).mousemove(function(e) {
        if(e.pageX) {
            mouseX = e.pageX;
            mouseY = e.pageY;
        }
    });

    /**
     * Touch events
     */
    $('#starfield').touchstart(function(e) {
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        mouseX = touch.pageX;
        mouseY = touch.pageY;
        mouseDown = true;

        if (!usingTouch) {
            $("#starcontrol-glow").css("box-shadow", "none");
            $("#starcontrol").stop().fadeTo(150, 1);
            $(".button").toggleClass("touchbutton");
            $(".infobutton").toggleClass("hide");
            $(".audiocontrol").toggleClass("hide");
            usingTouch = true;
        }
    });

    $(document).touchend(function() {
        mouseDown = false;
    });

    $(document).touchmove(function(e) {
        e.preventDefault();
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        mouseX = touch.pageX;
        mouseY = touch.pageY;
    });

    /**
     * UI controls for togglable buttons.
     *
     * @this The button div being clicked.
     */
    $('.control-toggle').click(function() {
        switch ($(this).attr("value")) {
        case "rotation":
            rotation = !rotation;
            break;
        case "audify":
            audify = !audify;
            break;
        case "colorise":
            colorise = !colorise;
            break;
        }

        $(this).toggleClass("control-active");
    });

    /**
     * UI controls for normal buttons.
     *
     * @this The button div being clicked.
     */
    $('.control-button').click(function() {
        switch ($(this).attr("value")) {
        // Starcount
        case "starcount-add":
            starcount = Math.floor(starcount * 1.61);
            console.log(starcount);
            canvas.createStarfield(starcount);
            break;
        case "starcount-sub":
            starcount = Math.ceil(starcount / 1.61);
            console.log(starcount);
            canvas.createStarfield(starcount);
            break;

        // Speed factor
        case "starspeed-add":
            speedFactor *= 1.61;
            console.log(speedFactor);
            break;
        case "starspeed-sub":
            speedFactor /= 1.61;
            console.log(speedFactor);
            break;

        // Audify sample length
        case "audify-add":
            sampleLength *= 1.61;
            console.log(sampleLength);
            break;
        case "audify-sub":
            sampleLength /= 1.61;
            console.log(sampleLength);
            break;
        }
    });
});

/**
 * Resizes canvas and recenters origin when the browser window is resized.
 */
$(window).resize(function() {
    viewportWidth = $(window).width();
    viewportHeight = $(window).height();
    origin = [];
    origin["x"] = viewportWidth / 2;
    origin["y"] = viewportHeight / 2;
    canvas.setSize();
});

/**
 * The starfield itself.
 */
function Canvas() {
    var canvas;
    var context;
    this.starlist = [];

    this.init = function() {
        this.canvas = document.getElementById('starfield');

        if (this.canvas.getContext) {
            this.context = this.canvas.getContext('2d');
            this.setSize();
        }
    }

    /**
     * Sets the size of the canvas to be that of the browser window
     */
    this.setSize = function() {
        this.canvas.width  = $(window).width();
        this.canvas.height = $(window).height() - 5; // Hack around wrong height from jQuery
    }

    /**
     * Draws a single star. Currently stars are rects to save precious cycles.
     */
    this.drawStar = function(star) {
        this.context.beginPath();
        this.context.fillStyle = "rgb(255, 255, 255)";
        // arc(x, y, radius, startAngle, endAngle, anticlockwise)
        //this.context.arc(star.xPos, star.yPos, star.radius, 0, Math.PI*2, true);
        this.context.fillRect(star.xPos, star.yPos, star.radius, star.radius);
        this.context.closePath();
        this.context.fill();
    }

    /**
     * Clears the canvas then iterates through starlist, a list of stars and draws them.
     *
     * @param starlist A list of stars to draw.
     */
    this.drawStarfield = function(starlist) {
        var i;

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (i = 0; i < this.starlist.length; i++) {
            this.drawStar(this.starlist[i]);
        }
    }

    /**
     * Creates stars and stores them in this.starlist.
     *
     * @param starcount Number of stars to create.
     */
    this.createStarfield = function(starcount) {
        var i;
        this.starlist = []; // Reset starlist for starcount reduction

        for (i = 0; i < starcount; i++) {
            var star = new Star(i);
            star.init();
            this.starlist[i] = star;
        }
    }

    /**
     * Iterates through this.starlist and updates their positions.
     * Also replaces them with new stars if they stray out of the viewport.
     */
    this.updateStars = function() {
        var i;
        var star;

        for (i = 0; i < this.starlist.length; i++) {
            star = this.starlist[i];
            star.update();

            if (star.xPos < 0 - star.radius ||
                star.xPos > viewportWidth ||
                star.yPos < 0 - star.radius ||
                star.yPos > viewportHeight) {

                // Replace star if it's out of viewport
                if (audify) {
                    if (star.xPos - origin["x"] < 0) {
                        star.audify("left");
                    } else {
                        star.audify("right");
                    }
                }

                var star = new Star(star.serial);
                star.init();
                this.starlist[star.serial] = star;
            }
        }
    }

    /**
     * Returns a HSV representation of the current 24-hour time.
     * Modified from colck.js
     */
    this.timeToHsv = function(date) {
        var seconds = date.getSeconds();
        var minutes = date.getMinutes();
        var hours = date.getHours();

        var h = (seconds / 60 * 360);
        var s = (minutes / 60 * 100) + "%";
        var v = ((100 - Math.abs(12 - (hours % 23)) / 12.0 * 70) - 20) + "%";

        return [h, s, v];
    }

    this.colorise = function() {
        var hsvptr = this.timeToHsv;
        var defaultBodyColor = $("body").css("background-color");

        setInterval(function() {
            if (colorise) {
                var date = new Date();
                var hsv = hsvptr(date);
                $("body").css("background-color", "hsl(" + hsv[0] + "," + hsv[1] + "," + hsv[2] + ")");
            } else {
                $("body").css("background-color", defaultBodyColor);
            }
        }, 1000); // 1000 = 1s
    }

    /**
     * The drawing loop. Draws a new starfield and updates stars.
     */
    var ptr = this;
    this.draw = function() {
        //setInterval(function() {
            ptr.drawStarfield();
            ptr.updateStars();
            window.requestAnimFrame(ptr.draw);
        //}, 16); // 60fps ~= 16.667
    }

    /**
     * window.requestAnimationFrame() shim
     */
    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function( callback ){
                window.setTimeout(callback, 1000 / 60);
              };
    })();
}

/**
 * Star object with attributes and audio functions.
 */
function Star(serial) {
    this.serial = serial; // 10032 is the worst
    this.angle;
    this.distance;
    this.initialRadius = 2;
    this.radius;
    this.dAngle;
    this.dDistance;
    this.d2Distance
    this.dRadius;
    this.xPos;
    this.yPos;

    this.init = function() {
        this.angle = Math.random() * 360 / (Math.PI * 2); // Radians
        // Initial distance from origin
        this.distance = Math.random() * 20 - 10 + viewportHeight / 25;
        // Initial size, radius is actually width/height of the now rect star
        this.radius = this.initialRadius;
        // Spiral
        this.dAngle = rotation ? 0.5 / (this.distance) + 0.025 : 0;
        // Speed
        this.dDistance = (Math.random() * 10 + 5) * speedFactor;
        // Acceleration
        this.d2Distance = Math.random() * 0.075 + 1.025;
        // Slower stars are farther out so their sizes increase less
        this.dRadius = Math.random() * this.dDistance / 20;
        // Initialise starting position
        this.xPos = origin["x"] + Math.cos(this.angle) * this.distance;
        this.yPos = origin["y"] - Math.sin(this.angle) * this.distance;
    }

    /**
     * Advances the star by one step.
     */
    this.update = function() {
        if (!mouseDown) {
            this.dDistance *= this.d2Distance;
            this.distance += this.dDistance;
            this.angle += this.dAngle;
            this.radius += this.dRadius;
            this.xPos = this.xPos + Math.cos(this.angle) * this.dDistance;
            this.yPos = this.yPos - Math.sin(this.angle) * this.dDistance;
        } else {
            this.angle = Math.PI - Math.atan2(mouseX - this.xPos, mouseY - this.yPos);
            this.xPos = this.xPos + Math.cos(this.angle) * this.dDistance;
            this.yPos = this.yPos + Math.sin(this.angle) * this.dDistance;
        }
    }

    /**
     * Beeps or boops according to the position and size of the star.
     * Uses RIFFWAVE.js
     *
     * @param direction Which speaker to ping ("left", "right")
     */
    this.audify = function(direction) {
        var i = 0;
        if (direction == "right") {
            while (i<sampleLength*(this.radius/this.initialRadius)) {
              data[i++] = 0;
              data[i++] = 128+Math.round(127*Math.sin(i/(this.dDistance * this.yPos/viewportHeight))); // right speaker
            }
        } else if (direction == "left") {
            while (i<sampleLength*(this.radius/this.initialRadius)) {
              data[i++] = 128+Math.round(127*Math.sin(i/(this.dDistance * this.yPos/viewportHeight))); // left speaker
              data[i++] = 0;
            }
        }

        wave.Make(data); // make the wave file
        audio.src = wave.dataURI; // set audio source
        audio.play(); // we should hear two tones one on each speaker
    }
}