var q = d3.select('#query').attr('value') || getParameterByName('q'),
    num_bins = 50,
    chart,
    data = [];

var target = document.getElementById('spinner');

// pick the color according to the site
function color(c){
  switch(c){
    case 'reddit.com':
      return '#ff4500';
      break;
    case 'facebook.com':
      return '#0A64A4';
      break;
    case 'twitter.com':
      return '#00B060';
      break;
    default:
      return '#000000';
  }
};

function draw(site){
  var requrl = 'https://iwg82nsry4.execute-api.us-east-1.amazonaws.com/dev/reddit?q=' + encodeURIComponent(q);
  var spinner = new Spinner().spin(target);

  d3.xhr(requrl)
    .header('Content-Type', 'application/json')
    .get(
      function(err, rawData) {
        if (err || !rawData.response || rawData.response == "[]") {
          if (err) {
            console.error(err);
          }
          spinner.stop();
          d3.select('#query').attr('value', 'Invalid query: please try a url.');
          return;
        }
        var this_data = JSON.parse(rawData.response);

        if(typeof this_data[0] === 'undefined'){
          spinner.stop();
          return 0;
        }

        // output all data as a string...
        //console.log(JSON.stringify(data));

        data = data.concat(this_data);
        if(chart){
          d3.select('svg').remove();
        }

        // sort everything
        data.sort(function(a, b){
          return a.created - b.created;
        });

        // figure out the bin sizing
        var start = data[0].created,
            end = data[data.length-1].created,
            bin_size = Math.floor((end - start)/num_bins);

        // add cartesian info to data
        var bin_pos = 0,
            bin_time = start,
            curY = 0,
            maxCScore = 0,
            maxYScore = 0;
        for(var i=0; i<data.length; i++){
          var created = data[i].created;
          while(created > bin_time + bin_size){
            bin_time += bin_size;
            bin_pos += 1;
            curY = 0;
          }
          if(bin_pos > num_bins -1)
            bin_pos = num_bins - 1; // correct for the last bin
          data[i].x = bin_pos;
          data[i].y = curY;
          curY +=1;
          maxCScore = Math.max(maxCScore, data[i].score);
          maxYScore = Math.max(maxYScore, data[i].y);
        }

        // create the chart
        chart = d3.select('#chart').append('svg')
        .attr('viewBox', '-1 -1 ' + (num_bins+2) + ' ' + (maxYScore+3))
        .attr('preserveAspectRatio', 'xMaxYMax meet'),
          rects = chart.selectAll('rect').data(data);

        // add axes
        chart.append('line')
        .attr('class', 'line')
        .attr('x1', 0)
        .attr('x2', num_bins)
        .attr('y1', maxYScore+1)
        .attr('y2', maxYScore+1);
        chart.append('text')
        .attr('class', 'axesText')
        .attr('x', 0)
        .attr('y', maxYScore+1.5)
        .text((new Date(1000*start)).toLocaleString());
        chart.append('text')
        .attr('class', 'axesText')
        .attr('x', num_bins)
        .attr('y', maxYScore+1.5)
        .attr('text-anchor', 'end')
        .text((new Date(1000*end)).toLocaleString());

        // stop the spinner
        spinner.stop();

        // add the comment rectangles
        rects.enter().append('rect')
        .attr('x', function(d){ return d.x; })
        .attr('y', function(d){ return 0; })
        .attr('width', 1)
        .attr('height', 1)
        .style('fill-opacity', 1e-6)
        .style('fill', function(d){ return color(d.site) })
        .transition().duration(300).delay(function(d){ return d.x*10; }).ease('elastic')
        .attr('x', function(d){ return d.x; })
        .attr('y', function(d){ return maxYScore - d.y; })
        .attr('width', 1)
        .attr('height', 1)
        .style('fill-opacity', function(d){ return rectOpacity(d.score); });
        // create the mouse events
        rects
        .on('mouseover', function(d){
          d3.select(this)
          .style('fill-opacity', 1)
          .style('cursor', 'pointer');
          div.transition()
          .duration(250)
          .style("opacity", 1);
        })
        .on('mousemove', function(d){
          var offset = {x: 14, y: -5};
          if(d3.event.pageX + 120 > window.innerWidth)
            offset.x = -144;
          div.html('<i>' + (new Date(1000*d.created)).toLocaleString() + '</i><br><b>' + d.author + ' (' + d.score + ')</b><br>' + d.comment)
          .style('left', (d3.event.pageX + offset.x) + 'px')
          .style('bottom', (window.innerHeight - (d3.event.pageY + offset.y)) + 'px');
        })
        .on('mouseout', function(d){
          d3.select(this)
          .style('fill-opacity', function(d){ return rectOpacity(d.score); })
          .style('fill', function(d){ return color(d.site) })
          .style('cursor', 'pointer');
          div.transition()
          .duration(250)
          .style("opacity", 1e-6);
        })
        .on('mouseup', function(d){
          console.log(d.site + d.link);
          window.location = 'http://' + d.site + d.link;
        });
        // create the tooltip
        var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 1e-6);

        // helper method to set the opacity of each rect according to comment score
        function rectOpacity(score){
          return 0.2 + (score/maxCScore)*0.8;
        }

        // output all data as a string...
        //console.log(JSON.stringify(data));
      }
    );
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// if we have a query param, then do stuff!
if(q && q !== '') {
  d3.select('#query').attr('value', q);
  draw('reddit.com');
  //draw('facebook.com');
} else {
  d3.select('#query').attr('value', 'Please enter a search query (preferably a url).');
}
