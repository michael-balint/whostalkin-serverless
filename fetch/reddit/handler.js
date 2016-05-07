'use strict';

var request         =   require('request'),
    comment_length  =   144,
    max_links       =   3,
    max_comments    =   200;

/*
 * getData: returns reddit comments relevant to a search conducted
 *          using the 'q' parameter, comments are time-stamped and
 *          have their score attached
 */

let getRedditComments = (json, comments, link) => {
  if(json != undefined){
    if(json.body){
      var len = comment_length;
      var append = '...';
      if(json.body.length <= len+1){
        len = json.body.length;
        append = '';
      }
      var comment = {
        'site': 'reddit.com',
        'author': json.author,
        'comment': json.body.substring(0, len) + append,
        'score': json.ups - json.downs,
        'created': json.created_utc,
        'link': link + json.id
      };
      comments.push(comment);
    }
    if(json.data){
      getRedditComments(json.data, comments, link);
    }
    if(json.children){
      for(var i=0; i<json.children.length; i++){
        getRedditComments(json.children[i], comments, link);
      }
    }
    if(json.replies){
      if(json.replies.data)
        getRedditComments(json.replies, comments, link);
    }
    return 1;
  }
};

let getLink = (json) => {
  var link = '';
  //console.log(json);
  try{
    link = json.data.children[0].data.permalink;
  } catch(err){
  }
  return link;
}

// TODO: figure out how to limit to most recent comments
module.exports.handler = (event, context, cb) => {
  // construct the query
  var redditAPI = 'http://reddit.com/search.json?limit=' + max_links + '&sort=top&q=';
  var queryString = event.q;
  var queryUrl = redditAPI + queryString;
  // make the search request
  // console.log('conducting query for: ' + queryUrl);
  request(
    {
      uri:  queryUrl,
      method: 'GET',
      headers: { 'User-Agent': 'Amplify' },
      json: true
    },
    function(error, response, body){
      if(response.statusCode == '200'){
        // get the links for each post
        var links = [],
            comments = [],
            completed = 0,
            len = 0;
        if(body.data){
          // we have muliple links, crawl each one
          let children = body.data.children;
          for(var i=0; i<children.length; i++){
            if(children[i].data.permalink){
              console.log(children[i].data.permalink);
              links.push('http://reddit.com/' + children[i].data.permalink);
            }
          }
          // now get the comments for each link
          len = Math.min(links.length, max_links);
          for(var i=0; i<len; i++){
            queryUrl = links[i] + '.json?sort=new&limit=' + max_comments;
            // console.log('getting comments for: ' + queryUrl);
            request(
              {
                uri:  queryUrl,
                method: 'GET',
                headers: { 'User-Agent': 'Whostalkin' },
                json: true
              },
              function(error, response, body){
                if(response.statusCode == '200'){
                  completed += getRedditComments(body[1], comments, getLink(body[0]));
                }
              }
            );
          }
        } else {
          // seems like search only returned one link and directed us to it
          completed += getRedditComments(body[1], comments, getLink(body[0]));
        }

        // wait until everything has been fetched
        setInterval(function(){
          if(completed < len){
            //console.log(completed + ' / ' + len);
            // still waiting for all responses...
          } else {
            // complete!
            clearInterval(this);
            //console.log(comments.length + ' comments logged.');
            return cb(null, comments);
          }
        }, 10);
      } else {
        return cb(new Error("Could not execute query."));
      }
  });
};
