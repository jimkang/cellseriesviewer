function cellSeriesViewer(seriesData) {
  var a = createAccessorizer();
  a.createBasicAccessor('id');
  a.cacheAccessor('transform', function getTransform(d) {
    return 'translate(' + d.offset[0] + ',' + d.offset[1] + ')';
  });

  // From Underscore, more or less.
  function defaults(obj, source) {
    if (source) {
      for (var prop in source) {
        if (obj[prop] === undefined) {
          obj[prop] = source[prop];
        }
        else if (typeof obj[prop] === 'object') {
          obj[prop] = defaults(obj[prop], source[prop]);
        }        
      }
    }

    return obj;
  }

  var rendererDefaults = {
    selectors: {
      svg: '#container-layer'
    },
    cellWidth: 64,
    cellHeight: 64,
    cellClass: 'cell',
    customizeCellRendition: function customize(cell) {
      // Setting the fill for this <g> means <rect>s within it will use that 
      // fill, too.
      d3.select(this).attr('fill', fillForPressure);
    }
  };

  var container = d3.select('#container-layer');
  var layers = container.selectAll('.series-layer').data(seriesData);
  layers.enter().append('g').attr({
    id: a.id,
    transform: a.transform
  })
  .classed('series-layer', true)
  .each(function setUpRenderer(seriesDatum) {
    seriesDatum.renderer = createCellGridRenderer(
      defaults({selectors: {root: '#' + seriesDatum.id}}, rendererDefaults)
    );
  });

  function fillForPressure(cell) {
    return 'hsla(0, 0%, 0%, ' + cell.d.p/20.0 + ')';
  }

  var listOfCellSets = [];
  var cellSetsIndex = 0;

  function saveAndStart(error, cellData) {
    if (error) {
      console.log(error);
    }
    else {
      listOfCellSets = cellData;
      renderCurrentSet();
    }
  }

  function renderCurrentSet() {
    container.selectAll('.series-layer').each(function render(seriesDatum, i) {
      seriesDatum.renderer.renderCells(listOfCellSets[i][cellSetsIndex]);
    });
  }

  // Assumption: All cell sets contain the same number of iterations.
  function advanceCellSets() {
    cellSetsIndex += 1;
    if (cellSetsIndex >= listOfCellSets[0].length) {
      cellSetsIndex = 0;
    }
  }

  function devanceCellSets() {
    cellSetsIndex -= 1;
    if (cellSetsIndex < 0) {
      cellSetsIndex = listOfCellSets[0].length - 1;
    }    
  }

  function renderNextSets() {
    advanceCellSets();
    renderCurrentSet();
  }

  function renderPreviousSets() {
    devanceCellSets();
    renderCurrentSet();
  }

  (function setUpKeyCommands() {
    var strokerouter = createStrokeRouter(d3.select(document));

    function routeToNext(key) {
      strokerouter.routeKeyUp(key, null, renderNextSets);
    }
    function routeToPrevious(key) {
      strokerouter.routeKeyUp(key, null, renderPreviousSets);
    }

    ['rightArrow', 'downArrow', 'space', 'enter', 'n'].forEach(routeToNext);
    ['leftArrow', 'upArrow', 'p'].forEach(routeToPrevious);
  })();

  d3.select('#next-button').on('click', renderNextSets);
  d3.select('#previous-button').on('click', renderPreviousSets);

  function loadDataToVisualizations() {
    var q = queue();
  
    container.selectAll('.series-layer').each(function load(seriesDatum) {
      q.defer(loadSetsToSeries, seriesDatum);
    });

    q.awaitAll(saveAndStart);
  }

  function loadSetsToSeries(seriesDatum, done) {
    d3.json(seriesDatum.url, function saveToDatum(error, loadedData) {
      if (error) {
        done(error);
      }
      else {
        seriesDatum.sets = loadedData;
        done(null, loadedData);
      }
    });
  }
  
  return {
    loadDataToVisualizations: loadDataToVisualizations  
  }
}

var theViewer = cellSeriesViewer(seriesData);
theViewer.loadDataToVisualizations();

