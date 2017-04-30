(function(ext) {

    if (typeof freesound !== 'undefined') {
        console.log('Freesound is already loaded');
        startExtension();
    } else {
        $.getScript('https://rawgit.com/g-roma/freesound.js/master/freesound.js', startExtension);
    }

    function startExtension() {

        var context = new AudioContext();

        // store audio buffers indexed by URL, to avoid re-downloading and decoding
        var buffers = {};
        // store query results indexed by query text, to avoid resending queries
        var queryResults = {};

        // this is my api token! you can get your own here:
        // http://www.freesound.org/apiv2/apply
        freesound.setToken("8IehtCE04v85z5zFauxSsFyqyXEfZg1q5GT3gDnS");

        ext.playSoundLike = function (query, callback) {
            // if we already have the result, skip sending the query
            if (queryResults[query]) {
                // if the query returned no results, bail out
                if (!queryResults[query].results) {
                    callback();
                    return;
                }
                playSoundFromUrl(queryResults[query].results[0].previews['preview-lq-mp3'], callback);
                return;
            }

            freesound.textSearch(query, {filter:'duration:[0.0 TO 4.0]', fields:'previews', page_size:5},
                function(sounds){
                    console.log(sounds.results);
                    if (!(sounds.results.length > 0)) {
                        console.log('no results from freesound');
                        queryResults[query] = 'none';
                        callback();
                        return;
                    }
                    playSoundFromUrl(sounds.results[0].previews['preview-lq-mp3'], callback);
                    queryResults[query] = sounds;
                },
                function (){
                    console.log("freesound query error")
                }
            );
        };

        function playSoundFromUrl(url, callback) {
            // if we've already downloaded and decoded the sound, play it
            if (buffers[url]) {
                playSound(buffers[url], callback);
                return;
            }

            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';

            request.onload = function() {
                context.decodeAudioData(request.response, 
                    function(buffer) {
                        buffers[url] = buffer;
                        playSound(buffer, callback);
                    },
                    function () {
                        console.log('error');
                        callback();
                    } 
                );
            }
            request.send();
        }

        function playSound(buffer, callback) {
            var source = context.createBufferSource(); 
            source.buffer = buffer;                    
            source.connect(context.destination);       
            source.start(0);     
            source.onended = function () {
                callback();
            }                      
        }

        // Cleanup function when the extension is unloaded
        ext._shutdown = function() {};

        // Status reporting code
        // Use this to report missing hardware, plugin or unsupported browser
        ext._getStatus = function() {
            return {status: 2, msg: 'Ready'};
        };

        // Block and block menu descriptions
        var descriptor = {
            blocks: [
                ['w', 'play a sound like %s until done', 'playSoundLike', 'meow']
            ]
        };

        // Register the extension
        ScratchExtensions.register('Freesound', descriptor, ext);
    };
})({});