catstats = (function(catstats) {

  var downloaded = false;
  var wantsStats = false;
  var stats = null;
  var players = {};
  var score = {redTeam: 0, blueTeam: 0};
  var columns = ['name', 'plusminus', 'minutes', 'score', 'tags', 'pops',
                 'grabs', 'drops', 'hold', 'captures', 'prevent', 'returns',
                 'support', 'team', 'team captures', 'opponent captures',
                 'arrival', 'departure', 'bombtime', 'tagprotime', 'griptime',
                 'speedtime'];

  // TODO: Use tagpro.ready
  init();
  function init () {
    if (window.tagpro && tagpro.socket && window.jQuery)
      return setup();
    setTimeout(init, 0);
  }

  /**
   * Add download link and listen to socket updates
   */
  function setup() {
    // Create a download link on the scoreboard
    $(document).ready(function() {
      var $el = $('#options').find('table');
      var $export = $('<a>', {href: '#', id: 'saveAsTSVLink'})
        .text('Save as .tsv')
        .click(registerExport);
      $export.insertAfter($el);
    });

    // Listen for player updates
    tagpro.socket.on('p', onPlayerUpdate);
    // Listen for score updates
    tagpro.socket.on('score', onScoreUpdate);
    // Listen for player quits
    tagpro.socket.on('playerLeft', onPlayerLeftUpdate);
    // Listen for time and game state changes
    tagpro.socket.on('time', onTimeUpdate);

    // Listen for end game and attempt download
    tagpro.socket.on('end', onEnd);
    // Before leaving the page attempt download
    window.addEventListener('beforeunload', onEnd);

  };


  /**
   * Update local player stats
   * @param {Object} data The 'p' update data
   */
  function onPlayerUpdate(data) {
    // Sometimes data is in .u
    data = data.u || data;

    // Loop over all the player updates
    // and update each player in
    // the local player record
    data.forEach(function(playerUpdate) {
      var player = players[playerUpdate.id];

      if(!player)
        player= createPlayer(playerUpdate.id);

      updatePlayer(player, playerUpdate);
    });
  };


  /**
  * Update the team score
  * @param {Object} data - The 'score' update data
  */
  function onScoreUpdate(data) {
    score.redTeam = data.r;
    score.blueTeam = data.b;
  };


  /**
   * Handle players who leave early
   * @param {Number} playerId - The id of the player leaving
   */
  function onPlayerLeftUpdate(playerId) {
    // Player leaves mid-game
    if(tagpro.state == 1) {
      updatePlayerAfterDeparture(players[playerId]);
    }

    // Player leaves before the game
    if(tagpro.state == 3) {
      delete players[playerId];
    }

    // Ignore all other player's leaving
  };


  /**
   * Track the amount of time a player is in the game
   * @param {Object} data - The time object
   */
  function onTimeUpdate(data) {
    if(tagpro.state == 2) return; //Probably unneeded
    var playerIds = Object.keys(players);
    playerIds.forEach(function(id) {
      players[id]['arrival'] = data.time;
    });
  };


  /**
   * Called when the game has ended or
   * the client is leaving the page
   */
  function onEnd() {
    if(wantsStats && !downloaded) {
      exportStats();
    }
  }

  /**
   * Prepare the local player record for export
   */
  function prepareStats() {
    var now = Date.now();
    var stats = Object.keys(players).map(function(id) {
      var player = players[id];
      updatePlayerAfterDeparture(player, now);

      // Record every column for the spreadsheet
      var columns = {};
      columns['name']        = player['name'] || '';
      columns['minutes']     = player['minutes'] || 0;
      columns['score']       = player['score'] || 0;
      columns['tags']        = player['s-tags'] || 0;
      columns['pops']        = player['s-pops'] || 0;
      columns['grabs']       = player['s-grabs'] || 0;
      columns['drops']       = player['s-drops'] || 0;
      columns['hold']        = player['s-hold'] || 0;
      columns['captures']    = player['s-captures'] || 0;
      columns['prevent']     = player['s-prevent'] || 0;
      columns['returns']     = player['s-returns'] || 0;
      columns['support']     = player['s-support'] || 0;
      columns['team']        = player.team || 0;
      columns['team captures']     = player.team == 1 ? tagpro.score.r : tagpro.score.b;
      columns['opponent captures'] =  player.team == 1 ? tagpro.score.b : tagpro.score.r;
      columns['plusminus']   = columns['team captures'] - columns['opponent captures'] || 0;
      columns['arrival']     = player['arrival'] || 0;
      columns['departure']   = player['departure'] || 0;
      columns['bombtime']    = player['bombtime'] || 0;
      columns['tagprotime']  = player['tagprotime'] || 0;
      columns['griptime']    = player['griptime'] || 0;
      columns['speedtime']   = player['speedtime'] || 0;

      return columns;
    })

    return stats;
  }


  /**
   * Called when the player wants to export the statsboard
   * This can be called at anytime during the game and the stats
   * will be saved before leaving the page
   */
  function registerExport() {
    wantsStats = true;

    // game has ended - download now
    if(tagpro.state == 2)
      exportStats();

    // Update the tsv link
    $('#saveAsTSVLink')
      .off()
      .text('Scoreboard will be saved when game ends!')
      .css('cursor', 'default');
  };

  /**
   * Create a local player record
   * @param {Number} id - the id of the player
   */
  function createPlayer(id) {
    var player = players[id] = {};
    player['arrival']     = tagpro.gameEndsAt - Date.now();
    player['bombtime']    = 0;
    player['tagprotime']  = 0;
    player['griptime']    = 0;
    player['speedtime']   = 0;
    player['bombtr']      = false;
    player['tagprotr']    = false;
    player['griptr']      = false;
    player['speedtr']     = false;
    player['diftotal']    = 0;
    return player;
  };


  /**
   * Update the local player record with new data
   * @param {Object} player - reference to local player record
   * @param {Object} playerUpdate - new player data
   */
  function updatePlayer(player, playerUpdate) {
    var attrs = Object.keys(playerUpdate);
    attrs.forEach(function(attr) {
      var data = playerUpdate[attr];

      // if this is a powerup - update time tracking
      if(attr === 'bomb' || attr === 'tagpro' || attr === 'speed' || attr === 'grip') {
        updatePlayerTimer(player, attr, data);
      }

      // update the local player record with new data
      if(typeof data !== 'object')
        player[attr] = data;
    });
  };


  /**
   * Update timers on the local player record
   * @param {Object} player - reference to local player record
   * @param {Object} timerName - name of the timer to update
   * @param {Object} timerValue - value of the timer to update
   */
    function updatePlayerTimer(player, timerName, timerValue) {
      // the player has the powerup and
      // we aren't tracking the time yet
      if(timerValue === true && !player[timerName+'tr']) {
        player[timerName+'tr'] = true;
        player[timerName+'start'] = Date.now();
        return;
      }

      // player lost the powerup, save the time
      if(timerValue === false && player[timerName+'tr'] === true) {
        player[timerName+'tr'] = false;
        player[timerName+'time'] = Date.now() - player[timerName+'start'];
        return;
      }
    }

  /**
   * When a player leaves or the game is over perform some cleanup
   * @param {Object} player - reference to local player record
   * @param {Number} [now] - unix timestamp representing current time
   */
  function updatePlayerAfterDeparture (player, now) {
    var now = now || Date.now();

    // ignore players who have already departed
    if(player['departure'] !== undefined)
      return;

    player['departure'] = tagpro.gameEndsAt - now;

    // Record the minutes played
    var seconds  = (player['arrival'] - player['departure']) / 1e3;
    player['minutes'] = Math.round(seconds/60);

    // Update all timers
    ['bomb', 'tagpro', 'grip', 'speed'].forEach(function(timerName) {
      updatePlayerTimer(player, timerName, false);
    });
  }

  /**
   * Create the document and trigger a download
   */
  function exportStats() {
    var stats = prepareStats();
    var fileContent = tsv(stats);
    var file = new Blob([fileContent], {type: "data:text/tsv;charset=utf-8"});

    var a = document.createElement('a');
    a.download = 'tagpro-'+Date.now()+'.tsv';
    a.href = (window.URL || window.webkitURL).createObjectURL(file);

    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, false);

    // trigger download
    a.dispatchEvent(event);
    downloaded = true;

    (window.URL || window.webkitURL).revokeObjectURL(a.href);
  }

  /** 
   *  Create a string of tab separated values
   *  from the player data in the column order
   *  specified by the global `columns`
   *  @param {Array} players - data to convert to tsv
   *  @returns {String} contents of a tsv file
   */
  function tsv(players) {
    var result = '';
    players.forEach(function(player, i) {
      // write header
      if(i == 0)
        result = columns.join('\t') + '\r\n';

      // write row
      result += columns.map(function(c) { return player[c]; }).join('\t') + '\r\n';
    });

    return result;
  }

  catstats.prepareStats = prepareStats;
  catstats.exportStats = exportStats;

  return catstats
}({}))
