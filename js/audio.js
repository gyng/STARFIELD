/* jshint browser: true */
/* global console, AudioContext, webkitAudioContext */

/**
* @file audio.js
* @author Ng Guoyou
*/

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
        console.log("Web Audio API not supported. Try Chrome >= 28, Firefox >= 23, or Opera >=15. (both FF & Opera untested).");
        console.log("Check out http://caniuse.com/audio-api");
        return void 0;
    }

    this.audioElement     = audioElement.get(0);
    this.analyser         = this.context.createAnalyser();
    this.analyser.fftSize = 64;
    this.frequencyData    = new Uint8Array(this.analyser.frequencyBinCount);
    this.source           = void 0; // Initialised when audio element receives 'loadeddata' event

    // Visualisation variables
    this.frequencyDataSum  = 0;
    this.intensityOverTime = 0;
    this.intensity         = 0;
    this.stdDev            = 0;

    // Sliding window
    this.slidingWindowMaxSize = 60;
    this.slidingAvgFreq       = [0];
    this.slidingAvgFreqSum    = 0;

    this.currentWindowMaxSlices    = 60;
    this.currentWindowSlice        = 0;
    this.currentWindowSliceSamples = 0;

    audioElement.bind('loadeddata', function () {
        if (typeof source === 'undefined') {
            this.source = this.context.createMediaElementSource(this.audioElement);
            this.source.connect(this.analyser);
            this.analyser.connect(this.context.destination);
            this.audioElement.play();
            this.loaded = true;
        }
    }.bind(this));
}

Audio.prototype.update = function () {
    this.analyser.getByteFrequencyData(this.frequencyData);

    // Current frequency sum (can't reduce a typed array)
    this.frequencyDataSum = 0;
    for (var i = 0; i < this.frequencyData.length; i++) {
        this.frequencyDataSum += this.frequencyData[i];
    }

    // Current window slice sum
    this.currentWindowSlice += this.frequencyDataSum;
    this.currentWindowSliceSamples++;

    // Add/remove sliding window if needed
    if (this.currentWindowSliceSamples >= this.currentWindowMaxSlices) {
        this.slidingAvgFreq.splice(0, this.slidingAvgFreq.length - this.slidingWindowMaxSize + 1);
        this.slidingAvgFreq.push(Math.floor(this.currentWindowSlice / this.currentWindowSliceSamples));
        this.currentWindowSlice = 0;
        this.currentWindowSliceSamples = 0;
    }

    var slidingWindowSum = this.slidingAvgFreq.reduce(function (previous, current) { return previous + current; });
    var slidingWindowMean = slidingWindowSum / this.slidingAvgFreq.length;

    // Variance of sliding window contents
    var diffSum = this.slidingAvgFreq.reduce(function (previous, current) { return previous + Math.pow(current - slidingWindowMean, 2); });
    this.stdDev = Math.sqrt(diffSum / this.slidingAvgFreq.length);
    this.slidingAvgFreqSum = slidingWindowSum / this.slidingAvgFreq.length;

    this.intensity = (this.frequencyDataSum > this.slidingAvgFreqSum + this.stdDev * 0.1) ? 100 : -100;
    this.intensityOverTime = Math.max(Math.min(this.intensityOverTime + (this.intensity / 2000), 100), -100);

    /*
    $("#debug").text(
        "slidingAvgSum: " + parseInt(this.slidingAvgFreqSum) +
        ", curSum: " + parseInt(this.frequencyDataSum) +
        ", int/dt: " + parseInt(this.intensityOverTime) +
        ", int: " + this.intensity +
        ", curSlice: " + this.currentWindowSlice +
        ", curSliceSamples: " + this.currentWindowSliceSamples +
        ", stdDev: " + this.stdDev);
    */
};