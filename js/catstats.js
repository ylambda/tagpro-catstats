catstats = (function(catstats) {

  init();
  function init () {
    if (window.tagpro && tagpro.socket && window.jQuery)
      return setup();
    setTimeout(init, 0);
  }

  function setup() {
    console.log('setup');
    tagpro.socket.on('map', function() {
    console.log('map');
      $(document).ready(function() {
    console.log('ready');
        $el = $('#options').find('table');
        $export = $('<a>', {href: '#'}).text('Save as .csv').click(exportCSV);
        $export.insertAfter($el);
      })
    })
  }

  function exportCSV() {
    var players = Object.keys(tagpro.players);
    var scores = players.map(function(id) {
      var p = tagpro.players[id];
      return {
        name:     p['name']       || '',
        score:    p['score']      || 0,
        tags:     p['s-tags']     || 0,
        pops:     p['s-pops']     || 0,
        grabs:    p['s-grabs']    || 0,
        drops:    p['s-drops']    || 0,
        captures: p['s-captures'] || 0,
        returns:  p['s-returns']  || 0,
        support:  p['s-support']  || 0
      }
    })

    var a = document.createElement('a');
    a.download = 'tagpro-'+Date.now()+'.csv';
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv(scores))

    var event = document.createEvent('MouseEvents')
    event.initEvent('click', true, false);

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
