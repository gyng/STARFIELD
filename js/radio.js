window.location.hash = "!http://r-a-d.io/main.mp3";
setInterval(updateSong, 10000);
setInterval(updateSongLength, 1000);

var start, end, cur;

function updateSong() {
    var url = "http://r-a-d.io/api.php";
    $.getJSON(url + "?callback=?", null, function(json) {
        $("#radio-dj").text(json.dj);
        $("#radio-now-playing").text(json.np);

        start = json.start;
        end = json.end;
        cur = json.cur;
    });
}

function updateSongLength() {
    var cur = new Date().getTime() / 1000;
    var elasped = cur - start;
    var curMin = Math.floor(elasped / 60);
    var curSec = ('0' + Math.floor(elasped % 60)).slice(-2);

    var songLength = end - start;
    var songMin = Math.floor(songLength / 60);
    var songSec = ('0' + Math.floor(songLength % 60)).slice(-2);

    $("#radio-song-status").text(curMin + ":" + curSec + "/" + songMin + ":" + songSec);
}