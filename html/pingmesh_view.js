"use strict";
console.log("start script");

///////////////////
// functions
///////////////////

function randomRtt() {
    var gauss = d3.randomNormal(); // gaussian, mu=0, sigma=1
    var rtt = Math.abs(gauss() * 30) + 1; // gaussian, mu=1ms, sigma=30ms
    return Math.round(rtt * 100) / 100;
}

function setRandomRtt(idA, idB) {
    return (idA === idB ? 0 : randomRtt());
}

function generateIdString(src, dst) {
    return src.host + "_to_" + dst.host;
}

// key function to binding data for elements
function key(d) {
    return d.key;
}

function generateTitleString(d) {
    return d.src.host + " -> " + d.dst.host + ", Avg: " + d.rtt.avg + "[ms]";
}

function setColor(d) {
    if(d.dst.id === d.src.id) {
        return "white";
    } else {
        var rttScale = d3.scaleLinear()
            .domain([0, 100]) // input range : ping rtt ms
            .range([0, 1]);
        // change msec to sec
        // invert [0,1] -> [-1,0] and shift(+1)
        // because RdYlGn maps <0:Red / 0.5:Yellow / 1:Green>
        return d3.interpolateRdYlGn( 1 - rttScale(d.rtt.avg) );
    }
}

(function() {

    ///////////////////
    // variables
    // /////////////////

    // dataset
    var hosts = [
        "host11", "host12", "host21", "host22"//, "host31", "host32"
    ].sort(); // normalize order
    var numbered_hosts = hosts.map(function(d,i) {
        return { "id": i, "host": d };
    });
    var host_comb = d3.cross(numbered_hosts, numbered_hosts).map(function(d) {
        return {
            "key": generateIdString(d[0], d[1]), // data bind key
            "src": d[0],
            "dst": d[1],
            "rtt": {
                "min": 0, // TBA, NOW not used.
                "max": 0,
                "avg": setRandomRtt(d[0].id, d[1].id),
                "mdev": 0
            }
        };
    });

    var scs = 500; //svg canvas size (width = height: square canvas)
    var cs = scs / (hosts.length + 1); // "cell" size
    var scale = d3.scaleLinear()
        .domain([0, (hosts.length + 1) * cs]) // range of dataset
        .range([0, scs]); // range of svg canvas

    // console.log(hosts);
    // console.log(numbered_hosts);
    // console.log(host_comb);

    ///////////////////
    // Visualize Data
    ///////////////////

    var svg = d3.select("body")
        .append("svg")
        .attrs({"width": scs, "height": scs});

// TODO: Band Scales
// d3-scale/README.md at master · d3/d3-scale
// https://github.com/d3/d3-scale/blob/master/README.md#band-scales

// See Also: color scale
// d3/d3-scale-chromatic: Sequential, diverging and categorical color scales derived from ColorBrewer.
// https://github.com/d3/d3-scale-chromatic
// RdYlGn

    svg.selectAll("rect")
        .data(host_comb, key)
        .enter()
        .append("rect")
        .attrs({
            "x": function(d) { return scale((d.dst.id + 1) * cs); },
            "y": function(d) { return scale((d.src.id + 1) * cs); },
            "rx": scale(cs/5), // rounded corner
            "ry": scale(cs/5),
            "width": scale(cs),
            "height": scale(cs),
            "id": key,
            "fill": setColor
        })
        .style('stroke-width', scale(cs/20))
        .on("mouseover", function() {
            d3.select(this).style("stroke", "red");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(250)
                .style("stroke", "white");
        })
        .append("title") // tooltip
        .text(generateTitleString);

    // label
    svg.selectAll("text.src")
        .data(numbered_hosts)
        .enter()
        .append("text") // src(y) label
        .attrs({
            "class": "src",
            "x": scale(5),
            "y": function(d) { return scale((d.id + 1) * cs + cs/2); }
        })
        .text(function(d) { return d.host; });
    svg.selectAll("text.dst")
        .data(numbered_hosts)
        .enter()
        .append("text") // dst(x) label
        .attrs({
            "class": "dst",
            "x": function(d) { return scale((d.id + 1) * cs + 5); },
            "y": scale(cs - 5)
        })
        .text(function(d) { return d.host; });

    // update each ractangle by interval
    var t = d3.interval(function(elapsed) {
        var targetIndex = Math.floor(elapsed / 1000) % host_comb.length;
        // console.log("idToUpdate = " + target);
        var targetItem = host_comb[targetIndex];

        // start debug
        // select rect element by #id
        // var rectangles = svg.select("rect#" + targetItem.key)
        //     .data([targetItem], key);
        // console.log("update by " + targetItem.key);
        // console.log(rectangles)
        // end debug

        var update = svg.selectAll("rect").data([targetItem], key);
        var url = "http://localhost:9292/process/" + targetIndex;
        d3.json(url)
            .on('progress', function() {
                // console.log("on.progress");
                update.style('stroke', 'blue');
            })
            .on('load', function(json) {
                // update (update rect element by key function)
                // targetItem.rtt.avg = setRandomRtt(targetItem.src.id, targetItem.dst.id);
                targetItem.rtt.avg = json.avg;

                update
                    .transition()
                    .duration(500)
                    .styles({
                        "fill": setColor,
                        "stroke": "white"
                    })
                    .select("title") // update tooltip
                    .text(generateTitleString);
            })
            .on('error', function() {
                console.log("on.error");
                update
                    .transition()
                    .duration(500)
                    .styles({
                        'fill': 'black',
                        'stroke': 'white'
                    });
            })
            .get();

        // debug
        // if (elapsed > host_comb.length * 1000) t.stop();
    }, 1000); // delay 1sec

})(); // function call

console.log("end script");
