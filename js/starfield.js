/* jshint browser: true */
/* global document, window, $, MIDI, console */

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
    var starcount = 25;
    var totalStarcount = starcount;
    var speedFactor = 0.1;
    var audify = false;
    var colorise = false;
    var hyperspace = false;

    // Mouse variables
    var mouseDown = false;
    var usingTouch = false;
    var mouseX;
    var mouseY;

    $(document).ready(function () {
        canvas = new Canvas();
        canvas.createStarfield(starcount);
        canvas.draw();
        canvas.colorise();

        // MIDI.js
        MIDI.loadPlugin({
            soundfontUrl: "js/MIDI.js/soundfont/",
            instrument: "acoustic_grand_piano",
            callback: function () {
                    MIDI.setVolume(0, 127);
                }
        });

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
         * Touch events
         */
        $('#starfield').touchstart(function (e) {
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

        $(document).touchend(function () {
            mouseDown = false;
        });

        $(document).touchmove(function (e) {
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
        $('.control-toggle').click(function () {
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
            case "hyperspace":
                hyperspace = !hyperspace;
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
            this.context.fillStyle = "rgba(0, 0, 0, 0.1)"; // Trails
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
                        star.audify(0); // left
                    } else {
                        star.audify(1); // right
                    }
                }

                this.starlist[star.serial] = new Star(star.serial);
                totalStarcount++;
            }
        }
    };

    /**
     * Returns a HSV representation of the current 24-hour time.
     * Modified from colck.js
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
        var hsvptr = this.timeToHsv;
        var defaultBodyColor = $("body").css("background-color");

        setInterval(function () {
            if (colorise) {
                var date = new Date();
                var hsv = hsvptr(date);
                var style = "hsl(" + hsv[0] + "," + hsv[1] + "," + hsv[2] + ")";

                if (hyperspace) {
                    // For hyperspace flashes
                    this.context.fillStyle = style;
                    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
                }

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
        this.updateStars();
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
        this.distance      = Math.random() * 20 - 10 + viewportHeight / 25; // Initial distance from origin
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
    Star.prototype.update = function () {
        if (!mouseDown) {
            this.dDistance *= this.d2Distance;
            this.distance  += this.dDistance;
            this.angle     += this.dAngle;
            this.radius    += this.dRadius;
            this.lastXPos   = this.xPos;
            this.lastYPos   = this.yPos;
            this.xPos       = this.xPos + Math.cos(this.angle) * this.dDistance;
            this.yPos       = this.yPos - Math.sin(this.angle) * this.dDistance;
        } else {
            this.angle = Math.PI - Math.atan2(mouseX - this.xPos, mouseY - this.yPos);
            this.lastXPos   = this.xPos;
            this.lastYPos   = this.yPos;
            this.xPos  = this.xPos + Math.cos(this.angle) * this.dDistance;
            this.yPos  = this.yPos + Math.sin(this.angle) * this.dDistance;
        }
    };

    /**
     * Beeps or boops according to the position and size of the star.
     * Uses MIDI.js
     *
     * @param channel Which speaker to ping (left = 0, right = 1)
     */
    Star.prototype.audify = function (channel) {
        var chords = {
            I:   [48, 52, 55, 60, 64, 67, 72],
            ii:  [50, 53, 57, 62, 65, 69, 74],
            iii: [52, 55, 59, 64, 67, 71, 76],
            IV:  [41, 45, 48, 53, 57, 60, 65],
            V:   [43, 47, 50, 55, 59, 62, 67],
            vi:  [45, 48, 52, 57, 60, 64, 69],
            vii: [47, 50, 53, 59, 62, 65, 71]
        };

        var chordMap = ['I', 'ii', 'iii', 'IV', 'vi', 'vii'];

        // var chordFrequency = starcount;
        var delay          = 0; // Play one note every quarter second
        // var maxNote        = 108;
        // var minNote        = 21;
        var range          = 87 * Math.max(speedFactor, 1); // maxNote - minNote, affected by speed
        //var note           = Math.floor((this.xPos / viewportWidth) * range / 2 +
        //                      (this.serial + 1) / (starcount + 1) * (range * 4) / 2); // The MIDI note
        var note           = Math.floor(
            (((totalStarcount % starcount) + 1) / starcount) * range / 2 +
            (this.xPos / viewportWidth) * range / 2); // The MIDI note
        var velocity       = Math.max(Math.min(400 * speedFactor, 300), 50); // How hard the note hits

        if (totalStarcount % starcount === 0) {
            var l = chordMap.length;
            var chord = chords[chordMap[((totalStarcount * 1.1) ^ l) % (l - 1)]];
            MIDI.chordOn(channel, chord, velocity, delay);
            MIDI.chordOff(channel, chord, delay + 1);
        } else {
            // Play the note
            MIDI.noteOn(channel, note, velocity, delay);
            MIDI.noteOff(channel, note, delay + 0.1);
        }
    };
}());