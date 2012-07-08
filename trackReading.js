// ==ClosureCompiler==
// @output_file_name trackReading.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// @formatting pretty_print
// @externs_url http://closure-compiler.googlecode.com/svn/trunk/contrib/externs/jquery-1.4.3.js
// @js_externs var _gaq;
// ==/ClosureCompiler==
/**
 * @preserve Copyright (c) 2012 Lukas Grebe.
Source is available at https://github.com/LukasGrebe/trackReading
See also: http://performancetracking.de/2012/06/05/lesen-eines-artikels-als-conversion-messen

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @expose
 */
performancetracking = performancetracking || {};

/**
 * @expose
 */
performancetracking.jQuery = performancetracking.jQuery || jQuery || console.error('jQuery not found. Set up via performancetracking.jQuery = ...');



/**
 * Starts Reading Tracking
 * @expose
 * @param {function(Object, ...[*]):boolean} trackingCallback Function to call to execute Tracking.
 * @param {string} contentElementSelector jQuery Selector for single DOM element to be tracked.
 */
performancetracking.trackReading = function(trackingCallback, contentElementSelector) {

    /**
     * Progression Bucketing Size in Percent (>0..1) of Article to track time taken to get thus far
     * @const
     * @type {number}
     */
    var progressBucketSize = 0.1;

    /**
     * Location of the end of the Content on the Screen to count as "scrolled to bottom".
     * Value should be between 0 and 1.
     * Setting this Value:
     *   1.0 the end of the content is at the bottom of the screen (user is looking at Article)
     *   0.5 the end of the content is in the middle of the screen (user can see End of Article smack in the middle)
     *   0.0 indicates the end of the content must be at the very top Top of Screen (user is looking at Comments)
     * @const
     * @type {number}
     */
    var contentEndOnScreenFactor = 0.8;

    if (typeof trackingCallback != 'function') {
        console.error("'trackingCallback' parameter of trackReading is not a function");
    }

    //get ContentElement
    var contentElement = performancetracking.jQuery(contentElementSelector);

    if (contentElement.length != 1) {
        console.warn('Found 0 or more than 1 content Element with ID:', contentElementSelector);
        return;
    }

    /**
     * Get number of Words in Content
     * @type {number}
     */
    var wordCount = contentElement.text().split(/\W*\s+\W*/).length;

    /**
     * Save 'now' time variable to calculate reading time later
     * @type {number}
     */
    var beginning = (new Date()).getTime();

    /**
     * Remember furthest the user has Scrolled
     * @type {number}
     */
    var maxBucket = 0;

    /**
     * Check if the Callback function should be called. Is updated to callback return value.
     * false might make sense once 100% of the article has been scrolled to stop tracking.
     * @type {boolean}
     */
    var executeCallback = true;

    // Check the location and track user

    function trackLocation() {

        var secondsSinceStart = Math.round(((new Date()).getTime() - beginning) / 1000);

        //Get jQuery Variable of User Window
        var jQWindow = performancetracking.jQuery(window);

        //calculate lowest Point visible to User (respecting contentEndOnScreenFactor)
        var viewCutOff = (jQWindow.height()) * contentEndOnScreenFactor + jQWindow.scrollTop();

        // define end
        var contentEnd = contentElement.offset().top + contentElement.height();

        //define Current Progress
        var progress = viewCutOff / contentEnd;

        //define Current Bucket.
        var bucket = Math.floor(progress / progressBucketSize) * progressBucketSize;

        // calculate WPM for current bucket. This assumes equally distributed Text!
        var wordsPerMinute = wordCount * (bucket < 1.0 ? bucket : 1.0) / (secondsSinceStart / 60);

        if (executeCallback) {
            executeCallback = trackingCallback({
                'currentBucket': bucket,
                'maxBucket': maxBucket,
                'secondsSinceStart': secondsSinceStart,
                'wpm': wordsPerMinute
            });
        }

        //Has the User ever Scrolled this far? This is set after callback so callback can also determine this event.
        if (bucket > maxBucket) {
            maxBucket = bucket;
        }
    }

    // Timeout Variable
    var scrollSampleTimer = 0;

    // Track the scrolling and track location
    performancetracking.jQuery(window).scroll(function() {
        if (scrollSampleTimer) {
            clearTimeout(scrollSampleTimer);
        }
        // Give user 100ms time to "complete" his scrolling. dont fire at every scrolled pixel.
        scrollSampleTimer = setTimeout(trackLocation, 100);
    });
};

/**
 * @param {{currentBucket: number, maxBucket: number, secondsSinceStart: number, wpm: number}} trackingArgs Tracking parameters
 * @param {boolean} debug if debug should be used.
 * @return {boolean} False if this callback function should no longer be called.
 * @expose
 */
performancetracking.trackReading.ga = function(trackingArgs, debug) {
    /**
     * Internal function to push data to GA or console
     * @param {Array} data The data array to be pushed to _gaq.
     */
    function doPush(data) {
        if (debug) {
            console.log('trackReading would push:', data);
        } else {
            _gaq.push(data);
        }
    }

    /**
     * function return value
     * @type {boolean}
     */
    var keepCallingTracking = true;

    /**
     * Only track if a new Bucket hast been reached.
     *
     * Change this if you have a nice logic to track scrolling back through the Content.
     * This could be used to tracking skimming of the content and subsequent reading…
     */
    if (trackingArgs.currentBucket > trackingArgs.maxBucket) {
        /**
         *@type{string}
         */
        var bucketPercentString = '';
        if (trackingArgs.currentBucket >= 1.0) {
            if (0.0 === trackingArgs.maxBucket) {
                /**
                 * max so far is 0, current is >=1 therefore, the entire article
                 * is shown in one or less scroll. - No reliable Tracking…
                 */
                bucketPercentString = '(100%)';
            } else {
                // Set Buckets > 100% to 100%.
                bucketPercentString = '100%';

                /**
                 * End of Content reached. Calculate WPM
                 * Test around, or consult http://en.wikipedia.org/wiki/Words_per_minute#Reading_and_comprehension
                 * for applicable wpm Threshold.
                 * NOTE: With a current Bucket below 100% (1.0), wpm would assume evenly distributed text.
                 */
                var readertype = (trackingArgs.wpm > 500) ? 'Scanner' : 'Reader';
                doPush(['_setCustomVar', 5, 'ReaderType', readertype, 3]);
                keepCallingTracking = false;
            }
        } else {
            //no Special case, generate % String
            bucketPercentString = Math.floor(trackingArgs.currentBucket * 100).toString() + '%';
        }

        doPush(['_trackEvent', 'Reading', 'Progress', bucketPercentString, trackingArgs.secondsSinceStart]);
    }

    return keepCallingTracking;
};

/**
 * @param {{currentBucket: number, maxBucket: number, secondsSinceStart: number, wpm: number}} trackingArgs Tracking parameters
 * @return {boolean} False if this callback function should no longer be called.
 * @expose
 */
performancetracking.trackReading.debug_ga = function(trackingArgs) {
    return performancetracking.trackReading.ga(trackingArgs, true);
};
