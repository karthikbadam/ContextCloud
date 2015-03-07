var w = 300,
    h = 200;

var words = [],
    max,
    scale = 1,
    complete = 0,
    keyword = "",
    tags,
    fontSize,
    maxLength = 30,
    fetcher;

var layout = d3.layout.cloud()
    .timeInterval(10)
    .size([w, h])
    .fontSize(function (d) {
        return fontSize(+d.value);
    })
    .text(function (d) {
        return d.key;
    })
    .on("end", draw);

var svg = d3.select("body").append("svg")
    .attr("id", "chrome-extension-viz")
    .attr("width", w)
    .attr("height", h);

var background = svg.append("g"),
    vis = svg.append("g")
    .attr("transform", "translate(" + [w >> 1, h >> 1] + ")");

var stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall)$/,
    punctuation = /[!"&()*+,-\.\/:;<=>?\[\\\]^`\{|\}~]+/g,
    wordSeparators = /[ \f\n\r\t\v\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\u3031-\u3035\u309b\u309c\u30a0\u30fc\uff70]+/g,
    discard = /^(@|https?:|\/\/)/,
    htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g,
    matchTwitter = /^https?:\/\/([^\.]*\.)?twitter\.com/;

function parseHTML(d) {
    parseText(d.replace(htmlTags, " ").replace(/&#(x?)([\dA-Fa-f]{1,4});/g, function (d, hex, m) {
        return String.fromCharCode(+((hex ? "0x" : "") + m));
    }).replace(/&\w+;/g, " "));
}

function getURL(url, callback) {
    statusText.text("Fetching… ");

    if (matchTwitter.test(url)) {
        var iframe = d3.select("body").append("iframe").style("display", "none");
        d3.select(window).on("message", function () {
            var json = JSON.parse(d3.event.data);
            callback((Array.isArray(json) ? json : json.results).map(function (d) {
                return d.text;
            }).join("\n\n"));
            iframe.remove();
        });
        iframe.attr("src", "http://jsonp.jasondavies.com/?" + encodeURIComponent(url));
        return;
    }

    try {
        if (location.protocol !== "https:" || /^https:/.test(url)) d3.text(url, function (text) {
            if (text == null) proxy(url, callback);
            else callback(text);
        });
        else proxy(url, callback);
    } catch (e) {
        proxy(url, callback);
    }
}

function proxy(url, callback) {
    d3.text("//www.jasondavies.com/xhr?url=" + encodeURIComponent(url), callback);
}

function flatten(o, k) {
    if (typeof o === "string") return o;
    var text = [];
    for (k in o) {
        var v = flatten(o[k], k);
        if (v) text.push(v);
    }
    return text.join(" ");
}

var sortedTags;

function parseText(text) {
    tags = {};
    var cases = {};
    text.split(wordSeparators).forEach(function (word) {
        //if (discard.test(word)) return;
        word = word.replace(punctuation, "");
        if (stopWords.test(word.toLowerCase())) return;
        word = word.substr(0, maxLength);
        cases[word.toLowerCase()] = word;
        tags[word = word.toLowerCase()] = (tags[word] || 0) + 1;
    });
  
    
    sortedTags = d3.entries(tags) 
        .sort(function (a, b) {
        return b.value - a.value;
    });
    
    tags = d3.entries(tags);
    
    tags.forEach(function (d) {
        d.key = cases[d.key];
    });
    
    generate();
}

function generate() {
    words = [];
    fontSize = d3.scale.log().range([10, 30]);
    if (sortedTags.length) fontSize.domain([+sortedTags[sortedTags.length - 1].value || 1, +sortedTags[0].value]);

    layout.stop().words(tags).start();
}

function draw(data, bounds) {
    scale = bounds ? Math.min(
        w / Math.abs(bounds[1].x - w / 2),
        w / Math.abs(bounds[0].x - w / 2),
        h / Math.abs(bounds[1].y - h / 2),
        h / Math.abs(bounds[0].y - h / 2)) / 2 : 1;

    words = data;

    var text = vis.selectAll("text")
        .data(words, function (d) {
            return d.text.toLowerCase();
        });

    text.transition()
        .duration(100)
        .attr("transform", function (d) {
            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .style("font-size", function (d) {
            return d.size + "px";
        });

    text.enter().append("text")
        .attr("text-anchor", "middle")
        .attr("transform", function (d) {
            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .style("font-size", "1px")
        .transition()
        .duration(10)
        .style("font-size", function (d) {
            return d.size + "px";
        });
    
    text.style("font-family", function (d) {
            return d.font;
        })
        .style("fill", function (d) {
            return "#333"; 
            //fill(d.text.toLowerCase());
        })
        .text(function (d) {
            return d.text;
        });
    
    var exitGroup = background.append("g")
        .attr("transform", vis.attr("transform"));
    
    var exitGroupNode = exitGroup.node();
    
    text.exit().each(function () {
        exitGroupNode.appendChild(this);
    });
    
    exitGroup.transition()
        .duration(100)
        .style("opacity", 1e-6)
        .remove();
    vis.transition()
        .delay(100)
        .duration(75)
        .attr("transform", "translate(" + [w >> 1, h >> 1] + ")scale(" + scale + ")");

}

// Converts a given word cloud to image/png.
function downloadPNG() {
    var canvas = document.createElement("canvas"),
        c = canvas.getContext("2d");
    canvas.width = w;
    canvas.height = h;
    c.translate(w >> 1, h >> 1);
    c.scale(scale, scale);
    words.forEach(function (word, i) {
        c.save();
        c.translate(word.x, word.y);
        c.rotate(word.rotate * Math.PI / 180);
        c.textAlign = "center";
        c.fillStyle = fill(word.text.toLowerCase());
        c.font = word.size + "px " + word.font;
        c.fillText(word.text, 0, 0);
        c.restore();
    });
    d3.select(this).attr("href", canvas.toDataURL("image/png"));
}

function downloadSVG() {
    d3.select(this).attr("href", "data:image/svg+xml;charset=utf-8;base64," + btoa(unescape(encodeURIComponent(
        svg.attr("version", "1.1")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML))));
}