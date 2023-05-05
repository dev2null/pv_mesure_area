import {Draw, Modify, Snap} from 'ol/interaction.js';
import Map from 'ol/Map.js';
import Overlay from 'ol/Overlay.js';
import View from 'ol/View.js';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style.js';
//import {Polygon} from 'ol/geom.js';
import {OSM, Vector as VectorSource} from 'ol/source.js';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer.js';
import {unByKey} from 'ol/Observable.js';
import {fromLonLat} from 'ol/proj.js';
import AreaPV from './area';

const areaPVPolygon = new AreaPV();

const raster = new TileLayer({
  source: new OSM(),
  // source: new XYZ({
  //   url: 'https://{a-c}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png' +
  //     '?apikey=Your API key from http://www.thunderforest.com/docs/apikeys/ here'
  // })
});

const source = new VectorSource();
const vector = new VectorLayer({
  source: source,
  style: {
    'fill-color': 'rgba(255, 255, 255, 0.2)',
    'stroke-color': '#002cff',
    'stroke-width': 2,
    'circle-radius': 3,
    'circle-fill-color': '#ffcc33',
  },
});

/**
 * Currently drawn feature.
 * @type {import('../src/ol/Feature.js').default}
 */
let sketch;

/**
 * The help tooltip element.
 * @type {HTMLElement}
 */
let helpTooltipElement;

/**
 * Overlay to show the help messages.
 * @type {Overlay}
 */
let helpTooltip;

/**
 * The measure tooltip element.
 * @type {HTMLElement}
 */
let measureTooltipElement;

/**
 * Overlay to show the measurement.
 * @type {Overlay}
 */
let measureTooltip;

const map = new Map({
  layers: [raster, vector],
  target: 'map',
  view: new View({
    center: fromLonLat([14.277968, 48.280201]),
    zoom: 20,
  }),
});

const modify = new Modify({source: source});
map.addInteraction(modify);

const snap = new Snap({source: source});
map.addInteraction(snap);

enableMouseOverTooltip();

let draw; // global so we can remove it later

function enableMouseOverTooltip() {
  const pointerMoveHandler = function(evt) {
    if (evt.dragging) {
      return;
    }
    helpTooltipElement.innerHTML = 'Click to continue drawing the polygon';
    helpTooltip.setPosition(evt.coordinate);

    helpTooltipElement.classList.remove('hidden');
  };

  map.on('pointermove', pointerMoveHandler);

  map.getViewport().addEventListener('mouseout', function() {
    helpTooltipElement.classList.add('hidden');
  });
}

function addInteraction() {

  draw = new Draw({
    source: source,
    type: 'Polygon',
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: (areaPVPolygon.getSelectedPolygonType() === 'main' ? '#000000' : '#cc0000'),
        width: 2,
      }),
      image: new CircleStyle({
        radius: 3,
        fill: new Fill({
          color: '#ffcc33',
        }),
      }),
    }),
  });

  map.addInteraction(draw);

  let listener;
  draw.on('drawstart', function(evt) {

    // set sketch
    sketch = evt.feature;

    /** @type {import('../src/ol/coordinate.js').Coordinate|undefined} */
    let tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on('change', function(evt) {
      const geom = evt.target;
      let output;
      output = areaPVPolygon.formatAreaFormatted(geom);
      tooltipCoord = geom.getInteriorPoint().getCoordinates();
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });


  });

  draw.on('drawend', function(evt) {

    let feature = evt.feature;

    if (!areaPVPolygon.isSquareMeters(feature.getGeometry())) {
      return false;
    }

    areaPVPolygon.addPolygon(feature);

    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    unByKey(listener);

    ///calcPVArea();
  });

  createMeasureTooltip();
  createHelpTooltip();
}


// function listAllPolygons()
// {
//
//   const allGeometries = map
//     .getLayers()
//     .getArray()[1]
//     .getSource()
//     .getFeatures();
//
//   console.log(allGeometries);
//
//
//   allGeometries.forEach(function(geometries) {
//     let area = getArea(geometries.getGeometry());
//     console.log(area);
//   });
//
// }

/**
 * Creates a new help tooltip
 */
function createHelpTooltip() {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }
  helpTooltipElement = document.createElement('div');
  helpTooltipElement.className = 'ol-tooltip hidden';
  helpTooltip = new Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left',
  });
  map.addOverlay(helpTooltip);
}

/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
  measureTooltip = new Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false,
    insertFirst: false,
  });
  map.addOverlay(measureTooltip);
}

addInteraction();
