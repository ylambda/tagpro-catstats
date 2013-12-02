catstats = (function(catstats) {

  var stats = null;

  init();
  function init () {
    if (window.tagpro && tagpro.socket && window.jQuery)
      return setup();
    setTimeout(init, 0);
  }

  function setup() {
    tagpro.socket.on('map', function() {
      $(document).ready(function() {
        var $el = $('#options').find('table');
        var $export = $('<a>', {href: '#', id: 'saveAsCSVLink'})
          .text('Save as .csv')
          .click(registerExport);
        $export.insertAfter($el);
      })
    })

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
    var players = Object.keys(tagpro.players);
    stats = players.map(function(id) {
      var p = tagpro.players[id];
      return {
        'name':             p['name']       || '',
        'score':            p['score']      || 0,
        'tags':             p['s-tags']     || 0,
        'pops':             p['s-pops']     || 0,
        'grabs':            p['s-grabs']    || 0,
        'drops':            p['s-drops']    || 0,
        'captures':         p['s-captures'] || 0,
        'returns':          p['s-returns']  || 0,
        'support':          p['s-support']  || 0,
        'team captures':    p.team == 1 ? tagpro.score.r : tagpro.score.b,
        'opponent captures': p.team == 1 ? tagpro.score.b : tagpro.score.r
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

  return catstats

}({}))
