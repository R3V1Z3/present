/* global $, jQuery, location, hljs, impress, HtmlWhitelistedSanitizer */
jQuery(document).ready(function() {

    // from here: http://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513#11582513
    function getURLParameter(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
    }

    // get gist url parameters
    var gist = getURLParameter('gist');
    if (!gist) {
        // stop execution here if no gist parameter specified
        throw new Error("Include gist= parameter in url to continue.");
    }
    
    // clear details contents and remove initial styles
    $('#details').remove();
    $('#fork').remove();
    $('link[rel=stylesheet]').remove();
    var filename = getURLParameter('filename');
    
    // var animation = 'rotate-10/scale+0.25';
    var animation = getURLParameter('animation');
    if (!animation) animation = '';
    
    // method for parsing content into slides
    var method = getURLParameter('method');
    if (!method) method = 'default';
    
    // get highlight.js style if provided
    var style = getURLParameter('style');
    if (!style) style = 'default';
    // add style reference to head to load it
    $('head').append('<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.5.0/styles/' + style.replace(/[^a-zA-Z0-9-_]+/ig, '') + '.min.css">');
    
    // add awesomeicons too
    $('head').append('<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.6.3/css/font-awesome.min.css">');
    
    // get css parameters
    var css = getURLParameter('css');
    if (!css) css = '2b37a8c1666b942ba8589c8a3a3ad0b1';
    var cssfilename = getURLParameter('cssfilename');

    function render(content) {
        var md = window.markdownit({
            html: true, // Enable HTML tags in source
            xhtmlOut: true, // Use '/' to close single tags (<br />).
            breaks: true, // Convert '\n' in paragraphs into <br>
            langPrefix: 'language-', // CSS language prefix for fenced blocks.
            linkify: true,
            typographer: true,
            quotes: '“”‘’',
            highlight: function(str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return '<pre class="hljs"><code>' +
                            hljs.highlight(lang, str, true).value +
                            '</code></pre>';
                    }
                    catch (__) {}
                }
                return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
            }
        });
        // add the impress div
        $("body").append('<div id="impress"></div>');
        $('#impress').html(md.render(content));
        
        // add slide codes for conversion to impress step divs
        add_slide_codes();
        // convert slides to step divs
        add_steps();
        // add effects to steps
        add_effects(animation);
    
        // attempt to replace stackedit icons with fontawesome
        document.body.innerHTML = document.body.innerHTML.replace(/i class="icon-/g, 'i class="fa fa-');
        impress().init();
    }
    
    function get_anim_array(animation) {
        // var animation = 'rotate-10/scale+0.25';

        // setup defaults
        var anim = { x: 0, y: 0, z: 0, rotate: 0, scale: 1};
        
        if ( animation.length > 0 ) {
            var split = animation.split('/');
            for (var i = 0; i < split.length; i++) {
                // get characters until + or - sign
                if ( split[i].split('-').length === 2 ) {
                    anim[ split[i].split('-')[0] ] = -(split[i].split('-')[1]);
                } else if ( split[i].split('+').length === 2 ) {
                    anim[ split[i].split('+')[0] ] = split[i].split('+')[1];
                } else if ( split[i].split(' ').length === 2 ) {
                    anim[ split[i].split(' ')[0] ] = split[i].split(' ')[1];
                } else {
                    // no + or - in string so use a default
                }
            }
        }
        return anim;
    }
    
    function add_effects(animation) {
        var anim = get_anim_array(animation);
        var scale = 1;
        var counter = 0;
        var rotate = 0;
        $('#impress .step').each(function() {
            $(this).attr( 'data-x', anim['x']);
            $(this).attr( 'data-y', anim['y']);
            $(this).attr( 'data-z', anim['z']);
            $(this).attr( 'data-rotate', rotate);
            $(this).attr( 'data-scale', scale);
            counter += 1;
            scale += Number(anim['scale']);
            rotate += Number(anim['rotate']);
            if ( rotate > 360 || rotate < 0 ) {
                rotate = 0;
            }
            console.log( rotate );
        });
    }
    
    function add_steps() {
        // convert slide codes to impress step divs
        document.body.innerHTML = document.body.innerHTML.replace('SLIDEOPEN', '<div class="step">');
        document.body.innerHTML = document.body.innerHTML.replace(/SLIDEOC/g, '</div><div class="step">');
        document.body.innerHTML = document.body.innerHTML.replace('SLIDECLOSE', '</div>');
        // remove last step div if it's empty
        var last_child = $('#impress .step:last-child').text();
        if ( last_child.length <= 1 ) {
            $('#impress .step:last-child').remove();
        }
    }
    
    function add_slide_codes() {
        // start impress first slide
        $("#impress").prepend('SLIDEOPEN'); // <div class="slide">
        
        if (method === 'default') {
            // iterate over p elements to add step divs as needed
            $('#impress').children('p').each(function() {
                var $next = $(this).next();
                var tagName = $next.prop("tagName");
                if ( $.inArray( tagName, [ "UL", "OL", "BLOCKQUOTE", "CODE", "PRE", "TABLE" ] ) >= 0 ) {
                    $next.after('SLIDEOC');
                } else if ( $.inArray( tagName, [ "HR" ] ) >= 0 ) {
                    $next.remove();
                    $(this).after('SLIDEOC');
                } else {
                    $(this).after('SLIDEOC');
                }
            });
            // iterate over header elements to add step divs
            $('#impress :header').each(function() {
                var $next = $(this).next();
                var tagName = $next.prop("tagName");
                if ( $.inArray( tagName, [ "UL", "OL", "BLOCKQUOTE", "CODE", "PRE", "TABLE", "HR" ] ) >= 0 ) {
                    $next.after('SLIDEOC');
                }
                // add slide code prior to the header if there's content before it
                var $prev = $(this).prev();
                tagName = $prev.prop("tagName");
                if ( $.inArray( tagName, [ "UL", "OL", "BLOCKQUOTE", "CODE", "PRE", "TABLE", "HR" ] ) >= 0 ) {
                    if ( $(this).text().indexOf('SLIDEOC') !== -1 ) {
                        $(this).before('SLIDEOC');
                    }
                }
            });
        } else if (method === 'newline') {
            $('#impress').children().each(function() {
                if ( $(this).is('p') ) {
                    $(this).html(function(i, html){
                        // replace ;: chars with br
                        html = html.replace(/[:;]/g, ':<br>');
                        // split at br tags and wrap content with slide divs
                        var txt = html.split('<br>');
                        for( var x = 0; x < txt.length; x++ ) {
                            $('#impress').append( 'SLIDEOC' + txt[x] );
                        }
                    });
                    // p tag contents moved to wrapper so remove original now
                    $(this).remove();
                } else {
                    $(this).before('SLIDEOC');
                }
            });
            
        }
        
        // close impress div
        $("#impress").append('SLIDECLOSE');
        
        // remove any hr tags at the beginning of steps
        $('#impress .step').children().each(function() {
            if ( $(this).is('hr') ) {
                $(this).remove();
            }
        });
        
    }

    function rendercss(content) {
        // attempt to sanitize CSS so hacker don't splode our website
        var parser = new HtmlWhitelistedSanitizer(true);
        var sanitizedHtml = parser.sanitizeString(content);
        // add imported css to head
        $('head').append('<style>' + sanitizedHtml + '</style>');
    }

    // http://stackoverflow.com/questions/9005572/pull-in-json-data/10454873#10454873
    $.ajax({
        url: 'https://api.github.com/gists/' + gist,
        type: 'GET',
        dataType: 'jsonp'
    }).success(function(gistdata) {
        var objects = [];
        if (!filename) {
            for (var file in gistdata.data.files) {
                if (gistdata.data.files.hasOwnProperty(file)) {
                    var o = gistdata.data.files[file].content;
                    if (o) {
                        objects.push(o);
                    }
                }
            }
        }
        else {
            objects.push(gistdata.data.files[filename].content);
        }
        render(objects[0]);
    }).error(function(e) {
        console.log('Error on ajax return.');
    });

    $.ajax({
        url: 'https://api.github.com/gists/' + css,
        type: 'GET',
        dataType: 'jsonp'
    }).success(function(gistdata) {
        var objects = [];
        if (!cssfilename) {
            for (var file in gistdata.data.files) {
                if (gistdata.data.files.hasOwnProperty(file)) {
                    var o = gistdata.data.files[file].content;
                    if (o) {
                        objects.push(o);
                    }
                }
            }
        }
        else {
            objects.push(gistdata.data.files[cssfilename].content);
        }
        rendercss(objects[0]);
    }).error(function(e) {
        console.log('Error on ajax return.');
    });

});