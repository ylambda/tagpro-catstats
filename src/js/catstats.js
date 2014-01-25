catstats = (function(catstats) {

  var stats = null;
  var players = {};

  init();
  function init () {
    if (window.tagpro && tagpro.socket && window.jQuery)
      return setup();
    setTimeout(init, 0);
  }

  function setup() {
    $(document).ready(function() {
      var $el = $('#options').find('table');
      var $export = $('<a>', {href: '#', id: 'saveAsCSVLink'})
        .text('Save as .csv')
        .click(registerExport);
      $export.insertAfter($el);
    });

    tagpro.socket.on("p", function (newData) {
      newData = newData.u || newData;
      for(var i = 0; i < newData.length; i++) {
        var playerNewData = newData[i];
        var player = players[playerNewData.id];

        if(!player) {
          player = players[playerNewData.id] = playerNewData;
          player['arrival'] = tagpro.gameEndsAt - Date.now();
        }

        for(var statName in playerNewData) {
          player[statName] = playerNewData[statName];
        }
      }
    });

    tagpro.socket.on("playerLeft",function(playerId) {
	    switch (tagpro.state) {
	      case 1: //During the game
		      players[playerId]["departure"] = tagpro.gameEndsAt - Date.now();
		    break;
		    case 3: //Before the game
		      delete players[playerId];
		    break;
		    default:
		    break;
	    }
    });

    tagpro.socket.on("time",function(e) {
      if(tagpro.state == 2) return; //Probably unneeded
      for(var playerId in players) players[playerId]["arrival"] = e.time; //players who were there before the game started have their arrival time set to the time when the game started
    });
    tagpro.socket.on('end', recordStats);
  }

  function registerExport() {
    if(stats)
      return exportCSV();

    tagpro.socket.on('end', function() {
      exportCSV();
    })

    $('#saveAsCSVLink')
      .off()
      .text('Scoreboard will be saved when game ends!')
      .css('cursor', 'default')
  }

  function recordStats() {
    var playerIds = Object.keys(players);
    stats = playerIds.map(function(id) {
      var player = players[id];
      return {
        'name':              player['name']       || '',
        'score':             player['score']      || 0,
        'tags':              player['s-tags']     || 0,
        'pops':              player['s-pops']     || 0,
        'grabs':             player['s-grabs']    || 0,
        'drops':             player['s-drops']    || 0,
        'hold':              player['s-hold']     || 0,
        'captures':          player['s-captures'] || 0,
        'prevent':           player['s-prevent']  || 0,
        'returns':           player['s-returns']  || 0,
        'support':           player['s-support']  || 0,
        'team captures':     player.team == 1 ? tagpro.score.r : tagpro.score.b,
        'opponent captures': player.team == 1 ? tagpro.score.b : tagpro.score.r,
        'arrival':           player['arrival']    || 0,
        'departure':         player['departure']  || 0
      }
    })
  }

  function exportCSV() {
    var file = csv(stats);

    var a = document.createElement('a');
    a.download = 'tagpro-'+Date.now()+'.csv';
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(file)

    var event = document.createEvent('MouseEvents')
    event.initEvent('click', true, false);

    // trigger download
    a.dispatchEvent(event);
  }

  function csv(array) {
    var result = '';
    array.forEach(function(player, i) {
      var keys = Object.keys(player);

      // write header
      if(i == 0)
        result = keys.map(wrap).join(',') + '\r\n';

      // write row
      result += keys.map(function(k) { return wrap(player[k]); }).join(',') + '\r\n';

    });

    return result;

    function wrap(v) {
      return '"'+v+'"';
    }
  }

  catstats.exportCSV = exportCSV;
  catstats.players = players;

  return catstats

}({}))
