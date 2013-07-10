/* jshint browser: true */
/* global document, window, $, console, AudioContext, webkitAudioContext */

/**
* @file starfield.css
* @author Ng Guoyou
*/
(function () {
    'use strict';

    var canvas;
    var viewportWidth = $(window).width();
    var viewportHeight = $(window).height();
    var origin = [];
    origin["x"] = viewportWidth / 2;
    origin["y"] = viewportHeight / 2;

    // Starfield control parameters
    var rotation = false;
    var starcount = 64;
    var totalStarcount = starcount;
    var speedFactor = 0.1;
    var audify = false;
    var colorise = false;
    var hyperspace = false;

    // Mouse variables
    var mouseDown = false;
    var mouseX;
    var mouseY;

    var audio;

    $(document).ready(function () {
        loadAudioSourceFragmentURL();
        audio = new Audio($("#audio-element"));
        canvas = new Canvas();
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
        $("#starcontrol").hover(function () {
            $(this).stop().fadeTo(250, 1);
            $("#starcontrol-glow").css("box-shadow", "none");
        }, function () {
            $(this).fadeTo(500, 0);
        });

        /**
         * Mouse controls.
         */
        $('#starfield').mousedown(function (e) {
            e.originalEvent.preventDefault(); // Hack to bypass Chrome's cursor changing to text-select on drag
            $("#starfield").addClass("grabbing");
            $("#starfield").removeClass("grabbable");
            mouseX = e.pageX;
            mouseY = e.pageY;
            mouseDown = true;
        });

        $(document).mouseup(function () {
            $("#starfield").addClass("grabbable");
            $("#starfield").removeClass("grabbing");
            mouseDown = false;
        });

        $(document).mousemove(function (e) {
            if (e.pageX) {
                mouseX = e.pageX;
                mouseY = e.pageY;
            }
        });

        /**
         * UI controls for togglable buttons.
         *
         * @this The button div being clicked.
         */
        $('.control-toggle').click(function () {
            switch ($(this).attr("value")) {
            case "rotation":
                rotation = !rotation;
                break;
            case "audify":
                audify = audify ? false : true;
                if (audify && audio.loaded) {
                    updateSource();
                    audio.audioElement.load(); // Updates <audio>'s source URL
                    // Throws an `InvalidStateError: DOM Exception 11` because we can only start() and stop() a source once (I think)
                    // Ways around it might be to try recreating the AudioContext again (I tried but failed)
                    // Or figure out how to dynamically change the source on the fly
                    updateFragmentURL();
                } else {
                    // audio.audioElement.pause();
                }
                break;
            case "colorise":
                colorise = colorise ? false : true;
                break;
            case "hyperspace":
                hyperspace = hyperspace ? false : true;
                break;
            }

            $(this).toggleClass("control-active");
        });

        /**
         * UI controls for normal buttons.
         *
         * @this The button div being clicked.
         */
        $('.control-button').click(function () {
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
            case "share":
                shareVisualisation();
                break;
            }
        });
    });

    /**
     * Resizes canvas and recenters origin when the browser window is resized.
     */
    $(window).resize(function () {
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
        this.starlist = [];
        this.canvas = document.getElementById('starfield');

        if (this.canvas.getContext) {
            this.context = this.canvas.getContext('2d');
            this.setSize();
        }

        window.requestAnimFrame = (function () {
            return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
        })();
    }

    /**
     * Sets the size of the canvas to be that of the browser window
     */
    Canvas.prototype.setSize = function () {
        this.canvas.width  = $(window).width();
        this.canvas.height = $(window).height() - 5; // Hack around wrong height from jQuery
    };

    /**
     * Draws a single star. Currently stars are rects to save precious cycles.
     */
    Canvas.prototype.drawStar = function (star) {
        this.context.beginPath();
        this.context.fillStyle = "rgb(255, 255, 255)";

        if (hyperspace) {
            this.context.lineWidth = 2;
            this.context.strokeStyle = '#FFFFFF';
            this.context.moveTo(star.lastXPos, star.lastYPos);
            this.context.lineTo(star.xPos, star.yPos);
            this.context.stroke();
        } else {
            this.context.fillRect(star.xPos | 0, star.yPos | 0, star.radius, star.radius);
            this.context.closePath();
            this.context.fill();
        }
    };

    /**
     * Clears the canvas then iterates through starlist, a list of stars and draws them.
     *
     * @param starlist A list of stars to draw.
     */
    Canvas.prototype.drawStarfield = function () {
        if (hyperspace) {
            // Trails, fade current canvas. We do this instead of just painting a 0.1 opacity black rect over the canvas
            // because we want to preserve background transparancy for <body> background-color changes in colourise().
            // This approach is considerably slower than just painting a black rect.
            // In essence, we subtract 10% from the current canvas instead of adding 10% black over the canvas.
            this.context.globalCompositeOperation = "destination-out";
            this.context.fillStyle = "rgba(0, 0, 0, 0.1)";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.globalCompositeOperation = "source-over";
        } else {
            /* Speed up canvas clearing
               http://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing/6722031#6722031 */
            this.context.save();
            this.context.setTransform(1, 0, 0, 1, 0, 0);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.restore();
        }

        for (var i = 0; i < this.starlist.length; i++) {
            this.drawStar(this.starlist[i]);
        }
    };

    /**
     * Creates stars and stores them in this.starlist.
     *
     * @param starcount Number of stars to create.
     */
    Canvas.prototype.createStarfield = function (starcount) {
        var i;
        this.starlist = []; // Reset starlist for starcount reduction

        for (i = 0; i < starcount; i++) {
            var star = new Star(i);
            this.starlist[i] = star;
        }
    };

    /**
     * Iterates through this.starlist and updates their positions.
     * Also replaces them with new stars if they stray out of the viewport.
     */
    Canvas.prototype.updateStars = function () {
        if (audify && audio.loaded) {
            audio.update();

            if (audio.frequencyDataSum > audio.avgFreqSum * 1.3) {
                mouseX = origin["x"];
                mouseY = origin["y"];
                mouseDown = true;
            } else {
                mouseDown = false;
            }

            hyperspace = audio.intensity > 99;
            colorise = audio.intensityOverTime > 85 || audio.intensityOverTime < -85;
        }
        var star;
        for (var j = 0; j < this.starlist.length; j++) {
            star = this.starlist[j];
            star.update();

            if (star.xPos < 0 - star.radius ||
                star.xPos > viewportWidth ||
                star.yPos < 0 - star.radius ||
                star.yPos > viewportHeight) {

                if (this.starlist.length <= starcount) {
                    this.starlist[star.serial] = new Star(star.serial);
                    totalStarcount++;
                }
            }

            if (audify && audio.loaded) {
                if (audio.frequencyData[star.serial % audio.frequencyData.length] > audio.avgFreqSum / audio.analyser.fftSize * 1.1) {
                    // This bin is made for me, and it's hot!
                    star.radius = Math.min(star.radius * 1.05, 60);
                }
            }
        }
    };

    /**
     * Returns a HSV representation of the current 24-hour time.
     */
    Canvas.prototype.timeToHsv = function (date) {
        var seconds = date.getSeconds();
        var minutes = date.getMinutes();
        var hours   = date.getHours();

        var h = (seconds / 60 * 360);
        var s = (minutes / 60 * 100) + "%";
        var v = ((100 - Math.abs(12 - (hours % 23)) / 12.0 * 70) - 20) + "%";

        return [h, s, v];
    };

    Canvas.prototype.colorise = function () {
        var defaultBodyColor = $("body").css("background-color");

        setInterval(function () {
            if (colorise) {
                var date = new Date();
                var hsv = this.timeToHsv(date);
                var style = "hsl(" + hsv[0] + "," + hsv[1] + "," + hsv[2] + ")";

                $("body").css("background-color", style);
            } else {
                $("body").css("background-color", defaultBodyColor);
            }
        }.bind(this), 1000); // 1000 = 1s
    };

    /**
     * The drawing loop. Draws a new starfield and updates stars.
     */
    Canvas.prototype.draw = function () {
        this.updateStars(audio.intensityOverTime);
        this.drawStarfield();
        window.requestAnimFrame(this.draw.bind(this));
    };

    /**
     * Star object with attributes and audio functions.
     */
    function Star(serial) {
        this.serial        = serial; // 10032 is the worst
        this.initialRadius = 2;
        this.angle         = Math.random() * 360 / (Math.PI * 2); // Radians
        this.distance      = Math.random() * 20 - 10 + viewportHeight / 35; // Initial distance from origin
        this.radius        = this.initialRadius; // Initial size, radius is actually width/height of the now rect star
        this.dAngle        = rotation ? 0.5 / (this.distance) + 0.025 : 0; // Spiral
        this.dDistance     = (Math.random() * 10 + 5) * speedFactor; // Speed
        this.d2Distance    = Math.random() * 0.075 + 1.025; // Acceleration
        this.dRadius       = Math.random() * this.dDistance / 20; // Slower stars are farther out so their sizes increase less
        this.xPos          = origin["x"] + Math.cos(this.angle) * this.distance; // Initialise starting position
        this.yPos          = origin["y"] - Math.sin(this.angle) * this.distance;
        this.lastXPos      = this.xPos;
        this.lastYPos      = this.yPos;
    }

    /**
     * Advances the star by one step.
     */
    Star.prototype.update = function (intensityOverTime) {
        if (!mouseDown) {
            this.dDistance *= this.d2Distance * (typeof intensityOverTime === 'undefined' ? 1 : (intensityOverTime + 101) / 15);
            this.distance  += this.dDistance;
            this.angle     += this.dAngle;
            this.radius    += this.dRadius;
            this.lastXPos   = this.xPos;
            this.lastYPos   = this.yPos;
            this.xPos       = this.xPos + Math.cos(this.angle) * this.dDistance;
            this.yPos       = this.yPos - Math.sin(this.angle) * this.dDistance;
        } else {
            this.angle      = Math.PI - Math.atan2(mouseX - this.xPos, mouseY - this.yPos);
            this.lastXPos   = this.xPos;
            this.lastYPos   = this.yPos;
            this.xPos       = this.xPos + Math.cos(this.angle) * this.dDistance * speedFactor * (audio.loaded ? audio.intensityOverTime / -2 : 10);
            this.yPos       = this.yPos + Math.sin(this.angle) * this.dDistance * speedFactor * (audio.loaded ? audio.intensityOverTime / -2 : 10);
        }
    };

    /**
     * Handles all web audio-related stuff.
     *
     * Takes in a jQuery object representing the audio element.
     */
    function Audio(audioElement) {
        this.loaded = false;

        if (typeof AudioContext !== "undefined") {
            this.context = new AudioContext();
        } else if (typeof webkitAudioContext !== "undefined") {
            this.context = new webkitAudioContext();
        } else {
            console.log("Web Audio API not supported. Try Firefox >= 23 (not tested), Chrome >= 28 (older versions not tested), or Opera >= 15 (not tested)");
            console.log("Check out http://caniuse.com/audio-api");
            return;
        }

        this.audioElement     = audioElement.get(0);
        this.analyser         = this.context.createAnalyser();
        this.analyser.fftSize = 64;
        this.frequencyData    = new Uint8Array(this.analyser.frequencyBinCount);
        this.source           = null; // Initialised when audio element receives 'loadeddata' event


        // Visualisation variables
        this.frequencyDataSum  = 0;
        this.intensityOverTime = 0;
        this.intensity         = 0;
        this.avgFreqSum        = 0;
        this.avgFreqSumSamples = 0;

        audioElement.bind('loadeddata', function () {
            if (typeof source === 'undefined') {
                this.source = this.context.createMediaElementSource(this.audioElement);
                this.source.connect(this.analyser);
                this.analyser.connect(this.context.destination);
                this.audioElement.play();
            }
        }.bind(this));

        this.loaded = true;
    }

    Audio.prototype.update = function () {
        this.analyser.getByteFrequencyData(this.frequencyData);

        // Can't reduce a TypedArray
        this.frequencyDataSum = 0;
        for (var i = 0; i < this.frequencyData.length; i++) {
            this.frequencyDataSum += this.frequencyData[i];
        }

        this.avgFreqSum = (this.avgFreqSum * this.avgFreqSumSamples + this.frequencyDataSum) / (this.avgFreqSumSamples + 1);
        this.avgFreqSumSamples++;

        this.intensity = (this.frequencyDataSum > this.avgFreqSum * 1.1) ? 100 : - 100;
        this.intensityOverTime = Math.max(Math.min(this.intensityOverTime + (this.intensity / 2000), 100), -100);

        // $("#visualisation").text("avgSum: " + parseInt(this.avgFreqSum) + ", curSum: " + parseInt(this.frequencyDataSum) + ", int/dt: " + parseInt(this.intensityOverTime) + ", int: " + this.intensity);
    };

    function updateSource() {
        var audioSource = $("#audio-element source");
        var audioURL = $("#audio-url").val();
        audioSource.attr("src", audioURL);
    }

    function loadAudioSourceFragmentURL() {
        if (window.location.hash) {
            $("#audio-url").val(window.location.hash.substring(2));
            updateSource();
            audify = true;
            $("#control-toggle-audify").toggleClass("control-active", true);
        }
    }

    function updateFragmentURL(url) {
        url = url || $("#audio-url").val();
        window.location.hash = "!" + url;
    }

    function shareVisualisation() {
        window.prompt("Here's your h-h-hyperlink!", document.URL + "#!" + $("#audio-url").val());
    }
}());