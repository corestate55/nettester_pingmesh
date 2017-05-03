"use strict";
console.log("start script");

///////////////////
// functions
///////////////////

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

function generateErrorTitleString(d) {
    return generateTitleString(d) + " (ERROR)";
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

function updateGrid(url, svg, targetItem) {
    // update (update rect element by key function)
    var update = svg.selectAll("rect").data([targetItem], key);
    d3.json(url)
        .on('beforesend', function() {
            // select to update
            update.style('stroke', 'mediumblue')
        })
        .on('progress', function() {
            // updating
            update.style('stroke', 'cyan');
        })
        .on('load', function(json) {
            // finish updating
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
                })
                .select("title") // update tooltip
                .text(generateErrorTitleString);
        })
        .timeout(4500)
        .get();
}

(function() {

    ///////////////////
    // variables
    ///////////////////

    // dataset
    var hosts = [
        "host11", "host12", "host21", "host22", "host31", "host32"
    ].sort(); // normalize order
    var numbered_hosts = hosts.map(function(d,i) {
        return { "id": i+1, "host": d };
    });
    var host_comb = d3.cross(numbered_hosts, numbered_hosts).map(function(d) {
        return {
            "key": generateIdString(d[0], d[1]), // data bind key
            "src": d[0],
            "dst": d[1],
            "rtt": {
                "min": 0,
                "max": 0,
                "avg": 0,
                "mdev": 0
            }
        };
    });

    var scs = 500; //svg canvas size (width = height: square canvas)
    var gridScale = d3.scaleBand()
        .domain(Array.from(Array(hosts.length + 1).keys()))
        .range([0, scs])
        .paddingInner(0.05)
        .paddingOuter(0.1);
    var gridWidth = gridScale.bandwidth();

    ///////////////////
    // Visualize Data
    ///////////////////

    var svg = d3.select("body")
        .append("svg")
        .attrs({"width": scs, "height": scs});

// See Also: Band Scales
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
            "x": function(d) { return gridScale(d.dst.id); },
            "y": function(d) { return gridScale(d.src.id); },
            "rx": gridWidth/5, // rounded corner
            "ry": gridWidth/5,
            "width": gridWidth,
            "height": gridWidth,
            "id": key,
            "fill": setColor
        })
        .style('stroke-width', gridWidth/20)
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
            "x": gridScale(0),
            "y": function(d) { return gridScale(d.id) + gridWidth/2; }
        })
        .text(function(d) { return d.host; });
    svg.selectAll("text.dst")
        .data(numbered_hosts)
        .enter()
        .append("text") // dst(x) label
        .attrs({
            "class": "dst",
            "x": function(d) { return gridScale(d.id); },
            "y": gridScale(0) + gridWidth
        })
        .text(function(d) { return d.host; });

    // update each rectangle by interval
    var t = d3.interval(function(elapsed) {
        var targetIndex = Math.floor(elapsed / 1000) % host_comb.length;
        var targetItem = host_comb[targetIndex];

        if (targetItem.src.id !== targetItem.dst.id) {
            var url = "http://localhost:9292/process/" + targetIndex;
            updateGrid(url, svg, targetItem)
        }

        // debug
        // if (elapsed > host_comb.length * 1000) t.stop();
    }, 1000); // delay 1sec

})(); // function call

console.log("end script");
